'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'

export interface CourtWithLocation {
  id: string
  name: string
  address: string | null
  status: string
  lat: number | null
  lng: number | null
  maintenance_start: string | null
  maintenance_end: string | null
  location_id: string
  locations: { name: string; address: string | null } | null
}

export async function getCourtsAction(): Promise<CourtWithLocation[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('courts')
    .select('*, locations(name, address)')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as CourtWithLocation[]
}

export async function addCourtAction(
  _prevState: { success?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  const locationId = formData.get('locationId') as string
  const courtName = formData.get('courtName') as string

  if (!locationId || !courtName) {
    return { error: 'Location and court name are required' }
  }

  // Get location data to copy to court
  const { data: location } = await supabaseAdmin
    .from('locations')
    .select('lat, lng, address')
    .eq('id', locationId)
    .single()

  // Insert court
  const { data: courtData, error: courtError } = await supabaseAdmin
    .from('courts')
    .insert({
      location_id: locationId,
      name: courtName,
      address: location?.address ?? null,
      status: 'open',
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
    })
    .select('id')
    .single()

  if (courtError) return { error: courtError.message }

  // Create default court_config (weekday + weekend)
  const { error: configError } = await supabaseAdmin.from('court_config').insert([
    {
      court_id: courtData.id,
      day_type: 'weekday',
      open_time: '07:00',
      close_time: '22:00',
      full_court_start: '07:00',
      full_court_end: '17:00',
      open_play_start: '17:00',
      open_play_end: '22:00',
      practice_start: null,
      practice_end: null,
      full_court_duration_minutes: 60,
      open_play_duration_minutes: 60,
      practice_duration_minutes: 30,
    },
    {
      court_id: courtData.id,
      day_type: 'weekend',
      open_time: '07:00',
      close_time: '22:00',
      full_court_start: '07:00',
      full_court_end: '15:00',
      open_play_start: '15:00',
      open_play_end: '22:00',
      practice_start: null,
      practice_end: null,
      full_court_duration_minutes: 60,
      open_play_duration_minutes: 60,
      practice_duration_minutes: 30,
    },
  ])

  if (configError) return { error: `Failed to create court schedule: ${configError.message}` }

  // Create default court_pricing (full_court + open_play)
  const { error: pricingError } = await supabaseAdmin.from('court_pricing').insert([
    { court_id: courtData.id, mode: 'full_court', price_cents: 1000 },
    { court_id: courtData.id, mode: 'open_play', price_cents: 1000 },
  ])

  if (pricingError) return { error: `Failed to create court pricing: ${pricingError.message}` }

  return { success: true }
}

export interface CourtConfigRow {
  id: string
  court_id: string
  day_type: 'weekday' | 'weekend'
  open_time: string
  close_time: string
  full_court_start: string | null
  full_court_end: string | null
  open_play_start: string | null
  open_play_end: string | null
  practice_start: string | null
  practice_end: string | null
  full_court_duration_minutes: number
  open_play_duration_minutes: number
  practice_duration_minutes: number
}

export async function getCourtConfigAction(
  courtId: string
): Promise<CourtConfigRow[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('court_config')
    .select('*')
    .eq('court_id', courtId)
    .order('day_type')

  if (error) throw new Error(error.message)
  return (data ?? []) as CourtConfigRow[]
}

export async function updateCourtConfigAction(
  courtId: string,
  dayType: 'weekday' | 'weekend',
  config: {
    open_time: string
    close_time: string
    full_court_start: string | null
    full_court_end: string | null
    open_play_start: string | null
    open_play_end: string | null
    practice_start: string | null
    practice_end: string | null
    full_court_duration_minutes: number
    open_play_duration_minutes: number
    practice_duration_minutes: number
  }
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('court_config')
    .upsert(
      {
        court_id: courtId,
        day_type: dayType,
        ...config,
      },
      { onConflict: 'court_id,day_type' }
    )

  if (error) return { error: error.message }
  return { success: true }
}

export async function setMaintenanceAction(
  courtId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; cancelledCount: number }> {
  await requireAdmin()

  // Update court status to maintenance
  const { error: courtError } = await supabaseAdmin
    .from('courts')
    .update({
      status: 'maintenance',
      maintenance_start: startDate,
      maintenance_end: endDate,
    })
    .eq('id', courtId)

  if (courtError) throw new Error(courtError.message)

  // Cancel overlapping reservations
  const { data: affected, error: cancelError } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('court_id', courtId)
    .gte('starts_at', startDate)
    .lte('starts_at', endDate)
    .in('status', ['confirmed', 'pending_payment'])
    .select('user_id, reservation_user_first_name, starts_at')

  if (cancelError) throw new Error(cancelError.message)

  // Send cancellation notification emails (fire-and-forget)
  if (affected && affected.length > 0) {
    const userIds = [...new Set(affected.map((r) => r.user_id))]
    try {
      for (const userId of userIds) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (userData?.user?.email) {
          try {
            await resend.emails.send({
              from: 'NELL Pickleball Club <onboarding@resend.dev>',
              to: userData.user.email,
              subject: 'Reservation Cancelled — Court Maintenance',
              text: `Your reservation has been cancelled due to court maintenance. We apologize for the inconvenience.\n\n— NELL Pickleball Club`,
            })
          } catch {
            console.error(`Failed to send cancellation email to ${userData.user.email}`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to send maintenance cancellation emails:', error)
    }
  }

  return { success: true, cancelledCount: affected?.length ?? 0 }
}

export async function clearMaintenanceAction(
  courtId: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('courts')
    .update({
      status: 'open',
      maintenance_start: null,
      maintenance_end: null,
    })
    .eq('id', courtId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function deleteCourtAction(
  courtId: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  // Check for future non-cancelled reservations on this court
  const now = new Date().toISOString()
  const { data: activeReservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('court_id', courtId)
    .gt('starts_at', now)
    .not('status', 'in', '("cancelled","expired")')
    .limit(1)

  if (activeReservations && activeReservations.length > 0) {
    return { error: 'cannot_delete_court_with_reservations' }
  }

  // Delete related rows first (court_config, court_pricing, session_pricing)
  await supabaseAdmin.from('court_config').delete().eq('court_id', courtId)
  await supabaseAdmin.from('court_pricing').delete().eq('court_id', courtId)
  await supabaseAdmin.from('session_pricing').delete().eq('court_id', courtId)

  // Delete the court
  const { error } = await supabaseAdmin
    .from('courts')
    .delete()
    .eq('id', courtId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateCourtAddressAction(
  courtId: string,
  address: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('courts')
    .update({ address: address || null })
    .eq('id', courtId)

  if (error) return { error: error.message }
  return { success: true }
}
