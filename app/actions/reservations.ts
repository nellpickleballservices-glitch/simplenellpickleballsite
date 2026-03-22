'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendConfirmationEmail } from '@/lib/resend/emails'
import { calculateSessionPrice, isTourist } from '@/lib/utils/pricing'
import type { BookingMode, PaymentStatus, ReservationStatus } from '@/lib/types/reservations'

interface ReservationActionState {
  error?: string
  success?: boolean
  reservationId?: string
  needsPayment?: boolean
}

export async function createReservationAction(
  _prevState: unknown,
  formData: FormData
): Promise<ReservationActionState> {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Parse form data
  const courtId = formData.get('courtId') as string
  const date = formData.get('date') as string
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const bookingMode = formData.get('bookingMode') as BookingMode
  const spotNumberRaw = formData.get('spotNumber') as string | null
  const spotNumber = bookingMode === 'open_play' && spotNumberRaw ? parseInt(spotNumberRaw, 10) : null
  const guestName = (formData.get('guestName') as string | null) || null

  // 2. Fetch user profile for name snapshot and locale
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, locale_pref, country')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const locale = profile?.locale_pref ?? 'es'

  // 3. Pending payment block
  const { data: pendingReservations } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending_payment')
    .limit(1)

  if (pendingReservations && pendingReservations.length > 0) {
    return { error: 'pending_payment_block' }
  }

  // 3b. Active reservation block — prevent booking while a session is in progress or upcoming
  const { data: activeReservations } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .gt('ends_at', new Date().toISOString())
    .limit(1)

  if (activeReservations && activeReservations.length > 0) {
    return { error: 'active_reservation_block' }
  }

  // 4. Membership check
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, plan_type, status, location_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isMember = !!membership
  const isVip = isMember && membership.plan_type === 'vip'
  const memberLocationId = membership?.location_id ?? null

  // 5. Advance booking window
  const { data: appConfigs } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['member_advance_booking_hours', 'non_member_advance_booking_hours', 'vip_guest_limit', 'cancellation_window_hours', 'tourist_surcharge_pct', 'default_session_price_cents'])

  const configMap: Record<string, number> = {}
  if (appConfigs) {
    for (const c of appConfigs) {
      configMap[c.key] = c.value
    }
  }

  const advanceHours = isMember
    ? (configMap['member_advance_booking_hours'] ?? 72)
    : (configMap['non_member_advance_booking_hours'] ?? 24)

  const startsAt = new Date(startTime)
  const endsAt = new Date(endTime)
  const now = new Date()
  const maxBookingTime = new Date(now.getTime() + advanceHours * 60 * 60 * 1000)

  if (startsAt > maxBookingTime) {
    return { error: 'beyond_booking_window' }
  }

  // 6. Basic tier location restriction
  if (isMember && membership.plan_type === 'basic' && memberLocationId) {
    const { data: court } = await supabase
      .from('courts')
      .select('location_id')
      .eq('id', courtId)
      .single()

    if (court && court.location_id !== memberLocationId) {
      return { error: 'location_restricted' }
    }
  }

  // 7. VIP guest validation
  if (guestName) {
    if (!isVip) {
      return { error: 'guest_not_allowed' }
    }
    // Guest limit check could be enforced here if needed
    // const guestLimit = configMap['vip_guest_limit'] ?? 1
  }

  // 8. Determine payment status and reservation status
  let paymentStatus: PaymentStatus
  let reservationStatus: ReservationStatus

  if (isMember) {
    paymentStatus = 'free'
    reservationStatus = 'confirmed'
  } else {
    paymentStatus = 'pending_payment'
    reservationStatus = 'pending_payment'
  }

  // 9. Determine price using session_pricing + pricing engine
  const dayOfWeek = new Date(date + 'T12:00:00').getDay() // noon to avoid TZ rollover
  const { data: sessionPricing } = await supabase
    .from('session_pricing')
    .select('price_cents')
    .eq('court_id', courtId)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  const basePriceCents = sessionPricing?.price_cents ?? (configMap['default_session_price_cents'] ?? 1000)
  const surchargePercent = configMap['tourist_surcharge_pct'] ?? 25
  const userIsTourist = isTourist(profile?.country ?? null)

  let priceCents = 0
  if (isMember || bookingMode === 'vip_guest') {
    // Members always free. VIP guest slots inherit member's $0 pricing.
    priceCents = 0
  } else {
    const priceResult = calculateSessionPrice({ basePriceCents, surchargePercent, isTourist: userIsTourist })
    priceCents = priceResult.totalCents
  }

  // 10. Pre-insert conflict check (application-level, complements DB constraint)
  // Check for existing non-cancelled reservations overlapping this court+time
  const { data: conflicting } = await supabase
    .from('reservations')
    .select('id, booking_mode, spot_number')
    .eq('court_id', courtId)
    .lt('starts_at', endsAt.toISOString())
    .gt('ends_at', startsAt.toISOString())
    .not('status', 'in', '("cancelled","expired")')

  if (conflicting && conflicting.length > 0) {
    // If booking full_court and any reservation exists, reject
    if (bookingMode === 'full_court') {
      return { error: 'slot_taken' }
    }
    // If existing full_court reservation exists and we're booking open_play, reject
    const hasFullCourt = conflicting.some(r => r.booking_mode === 'full_court')
    if (hasFullCourt) {
      return { error: 'slot_taken' }
    }
    // For open_play, check if specific spot is taken
    if (bookingMode === 'open_play' && spotNumber) {
      const spotTaken = conflicting.some(r => r.spot_number === spotNumber)
      if (spotTaken) {
        return { error: 'slot_taken' }
      }
    }
  }

  // 11. Insert reservation with name snapshot
  const { data: reservation, error: insertError } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      court_id: courtId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reservation_user_first_name: firstName,
      reservation_user_last_name: lastName,
      booking_mode: bookingMode,
      spot_number: spotNumber,
      payment_status: paymentStatus,
      status: reservationStatus,
      guest_name: guestName,
      price_cents: priceCents,
      is_tourist_price: userIsTourist,
    })
    .select('id')
    .single()

  if (insertError) {
    // 23P01 = exclusion_violation from EXCLUDE constraint
    if (insertError.code === '23P01') {
      return { error: 'slot_taken' }
    }
    console.error('Reservation insert error:', insertError)
    return { error: 'unexpected_error' }
  }

  // 12. Send confirmation email (fire-and-forget)
  if (reservation) {
    // Get court name for email
    const { data: court } = await supabase
      .from('courts')
      .select('name')
      .eq('id', courtId)
      .single()

    const courtName = court?.name ?? 'Court'
    const formattedDate = date
    const formattedTime = `${startTime} - ${endTime}`

    try {
      await sendConfirmationEmail(
        user.email!,
        courtName,
        formattedDate,
        formattedTime,
        locale
      )
    } catch {
      // Email failure should not block the booking
      console.error('Failed to send confirmation email')
    }
  }

  // 13. Return success
  return {
    success: true,
    reservationId: reservation?.id,
    needsPayment: !isMember,
  }
}

export async function cancelReservationAction(
  _prevState: unknown,
  formData: FormData
): Promise<ReservationActionState> {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const reservationId = formData.get('reservationId') as string

  // 2. Fetch reservation and verify ownership
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('id, user_id, starts_at, status')
    .eq('id', reservationId)
    .single()

  if (fetchError || !reservation) {
    return { error: 'not_found' }
  }

  if (reservation.user_id !== user.id) {
    return { error: 'unauthorized' }
  }

  if (reservation.status === 'cancelled') {
    return { error: 'already_cancelled' }
  }

  // 3. Cancellation window check
  const { data: windowConfig } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'cancellation_window_hours')
    .single()

  const cancellationWindowHours = windowConfig?.value ?? 2
  const startsAt = new Date(reservation.starts_at)
  const now = new Date()
  const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilStart < cancellationWindowHours) {
    return { error: 'cancellation_window_passed' }
  }

  // 4. Update status to cancelled
  const { error: updateError } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)

  if (updateError) {
    console.error('Cancellation update error:', updateError)
    return { error: 'unexpected_error' }
  }

  // 5. Return success
  return { success: true }
}
