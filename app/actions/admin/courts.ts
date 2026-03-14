'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'

export interface CourtWithLocation {
  id: string
  name: string
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

  const locationName = formData.get('locationName') as string
  const courtName = formData.get('courtName') as string
  const address = formData.get('address') as string
  const lat = formData.get('lat') as string
  const lng = formData.get('lng') as string

  if (!locationName || !courtName) {
    return { error: 'Location name and court name are required' }
  }

  // Find or create location
  const { data: locationData, error: locationError } = await supabaseAdmin
    .from('locations')
    .upsert(
      {
        name: locationName,
        address: address || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      },
      { onConflict: 'name' }
    )
    .select('id')
    .single()

  if (locationError) return { error: locationError.message }

  // Insert court
  const { data: courtData, error: courtError } = await supabaseAdmin
    .from('courts')
    .insert({
      location_id: locationData.id,
      name: courtName,
      status: 'open',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
    })
    .select('id')
    .single()

  if (courtError) return { error: courtError.message }

  // Create default court_config (weekday + weekend)
  await supabaseAdmin.from('court_config').insert([
    {
      court_id: courtData.id,
      day_type: 'weekday',
      open_time: '07:00',
      close_time: '22:00',
      full_court_start: '07:00',
      full_court_end: '17:00',
      open_play_start: '17:00',
      open_play_end: '22:00',
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
    },
  ])

  // Create default court_pricing (full_court + open_play)
  await supabaseAdmin.from('court_pricing').insert([
    { court_id: courtData.id, mode: 'full_court', price_cents: 1000 },
    { court_id: courtData.id, mode: 'open_play', price_cents: 1000 },
  ])

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
