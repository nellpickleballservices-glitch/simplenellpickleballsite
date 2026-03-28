'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateSessionPrice, isTourist as isTouristFn } from '@/lib/utils/pricing'

export interface AdminReservation {
  id: string
  user_id: string
  court_id: string
  starts_at: string
  ends_at: string
  status: string
  booking_mode: string
  spot_number: number | null
  payment_status: string
  payment_method: string | null
  guest_name: string | null
  reservation_user_first_name: string
  reservation_user_last_name: string
  created_by_admin: boolean
  price_cents: number
  is_tourist_price: boolean
  courts: { name: string } | null
}

export async function getAllReservationsAction(filters: {
  dateFrom?: string
  dateTo?: string
  courtId?: string
  status?: string
  isTourist?: boolean
  showHistory?: boolean
  page?: number
}): Promise<{ reservations: AdminReservation[]; total: number; page: number }> {
  await requireAdmin()

  const page = filters.page ?? 1
  const perPage = 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabaseAdmin
    .from('reservations')
    .select('*, courts(name)', { count: 'exact' })

  if (filters.dateFrom) {
    query = query.gte('starts_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('starts_at', filters.dateTo + 'T23:59:59')
  }
  if (filters.courtId) {
    query = query.eq('court_id', filters.courtId)
  }
  if (!filters.showHistory) {
    // By default, hide cancelled/expired reservations and sessions that have ended
    query = query.not('status', 'in', '("cancelled","expired")')
    query = query.gte('ends_at', new Date().toISOString())
  }
  if (filters.isTourist !== undefined) {
    query = query.eq('is_tourist_price', filters.isTourist)
  }

  const { data, count, error } = await query
    .order('starts_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[reservations] getAllReservations error:', error.message)
    throw new Error('Operation failed')
  }

  return {
    reservations: (data ?? []) as AdminReservation[],
    total: count ?? 0,
    page,
  }
}

export async function adminCancelReservationAction(
  reservationId: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)

  if (error) {
    console.error('[reservations] adminCancelReservation error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

export async function adminCreateReservationAction(
  _prevState: { success?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const admin = await requireAdmin()

  const userId = formData.get('userId') as string | null
  const guestName = formData.get('guestName') as string | null
  const courtId = formData.get('courtId') as string
  const startsAt = formData.get('startsAt') as string
  const endsAt = formData.get('endsAt') as string
  const bookingMode = formData.get('bookingMode') as string
  const spotNumber = formData.get('spotNumber') as string | null
  const isTouristToggle = formData.get('isTourist') as string | null

  if (!courtId || !startsAt || !endsAt) {
    return { error: 'Court, start time, and end time are required' }
  }

  const startDate = new Date(startsAt)
  const endDate = new Date(endsAt)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: 'Invalid date format' }
  }
  if (endDate <= startDate) {
    return { error: 'End time must be after start time' }
  }

  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  if (durationHours > 4) {
    return { error: 'Maximum reservation duration is 4 hours' }
  }

  if (guestName && guestName.length > 100) {
    return { error: 'Guest name must be 100 characters or fewer' }
  }

  if (spotNumber) {
    const spot = parseInt(spotNumber, 10)
    if (isNaN(spot) || spot < 1 || spot > 20) {
      return { error: 'Spot number must be between 1 and 20' }
    }
  }

  if (bookingMode && !['full_court', 'open_play'].includes(bookingMode)) {
    return { error: 'Invalid booking mode' }
  }

  if (!userId && !guestName) {
    return { error: 'Select a user or enter a guest name' }
  }

  let reservationUserId = userId || admin.id
  let firstName = ''
  let lastName = ''
  let paymentStatus = 'free'
  let userIsTourist = false
  const isGuest = !userId && !!guestName
  const createdByAdmin = isGuest

  if (userId) {
    // Registered user: snapshot name and country from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, country')
      .eq('id', userId)
      .single()

    firstName = profile?.first_name ?? ''
    lastName = profile?.last_name ?? ''
    paymentStatus = 'free'
    reservationUserId = userId
    // For registered users, always derive tourist status from profile country
    userIsTourist = isTouristFn(profile?.country ?? null)
  } else if (guestName) {
    // Walk-in guest: use admin's user_id with guest_name
    const names = guestName.trim().split(' ')
    firstName = names[0] ?? guestName
    lastName = names.slice(1).join(' ') || ''
    paymentStatus = 'cash_pending'
    reservationUserId = admin.id
    // For walk-ins, use the admin toggle (defaults to local if not provided)
    userIsTourist = isTouristToggle === 'true'
  }

  // Fetch pricing data: session_pricing for this court + day, and app_config fallbacks
  const dayOfWeek = new Date(startsAt).getDay()
  const [sessionPricingResult, appConfigResult] = await Promise.all([
    supabaseAdmin
      .from('session_pricing')
      .select('price_cents')
      .eq('court_id', courtId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle(),
    supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', ['default_session_price_cents', 'tourist_surcharge_pct']),
  ])

  const appConfigMap: Record<string, number> = {}
  if (appConfigResult.data) {
    for (const c of appConfigResult.data) {
      appConfigMap[c.key] = typeof c.value === 'number' ? c.value : Number(c.value) || 0
    }
  }

  const basePriceCents = sessionPricingResult.data?.price_cents ?? (appConfigMap['default_session_price_cents'] || 1000)
  const surchargePercent = appConfigMap['tourist_surcharge_pct'] || 25
  const priceResult = calculateSessionPrice({ basePriceCents, surchargePercent, isTourist: userIsTourist })

  const { error } = await supabaseAdmin.from('reservations').insert({
    user_id: reservationUserId,
    court_id: courtId,
    starts_at: startsAt,
    ends_at: endsAt,
    booking_mode: bookingMode || 'full_court',
    spot_number: spotNumber ? parseInt(spotNumber, 10) : (bookingMode === 'open_play' ? 1 : null),
    status: 'confirmed',
    payment_status: paymentStatus,
    guest_name: isGuest ? guestName : null,
    created_by_admin: createdByAdmin,
    reservation_user_first_name: firstName,
    reservation_user_last_name: lastName,
    price_cents: priceResult.totalCents,
    is_tourist_price: userIsTourist,
  })

  if (error) {
    console.error('[reservations] adminCreateReservation error:', error.message)
    return { error: 'Operation failed' }
  }
  return { success: true }
}

export async function markCashPaidAction(
  reservationId: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ payment_status: 'paid', payment_method: 'cash' })
    .eq('id', reservationId)

  if (error) {
    console.error('[reservations] markCashPaid error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

/**
 * Search users for reservation creation.
 * Uses admin_users_view to eliminate N+1 getUserById loop.
 */
export async function searchUsersForReservationAction(
  query: string
): Promise<{ id: string; first_name: string; last_name: string; email: string; country?: string | null }[]> {
  await requireAdmin()

  if (!query || query.length < 2) return []

  const term = `%${query}%`
  const { data } = await supabaseAdmin
    .from('admin_users_view')
    .select('id, first_name, last_name, email, country')
    .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
    .limit(10)

  return (data ?? []).map((u) => ({
    id: u.id,
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    email: u.email ?? '',
    country: u.country ?? null,
  }))
}

/**
 * Get session pricing for a court + date for admin price preview.
 */
export async function getSessionPricePreviewAction(
  courtId: string,
  date: string
): Promise<{ priceCents: number; surchargePercent: number }> {
  await requireAdmin()

  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  const [sessionPricingResult, appConfigResult] = await Promise.all([
    supabaseAdmin
      .from('session_pricing')
      .select('price_cents')
      .eq('court_id', courtId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle(),
    supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', ['default_session_price_cents', 'tourist_surcharge_pct']),
  ])

  const appConfigMap: Record<string, number> = {}
  if (appConfigResult.data) {
    for (const c of appConfigResult.data) {
      appConfigMap[c.key] = typeof c.value === 'number' ? c.value : Number(c.value) || 0
    }
  }

  return {
    priceCents: sessionPricingResult.data?.price_cents ?? (appConfigMap['default_session_price_cents'] || 1000),
    surchargePercent: appConfigMap['tourist_surcharge_pct'] || 25,
  }
}
