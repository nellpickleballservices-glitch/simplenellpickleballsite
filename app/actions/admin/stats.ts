'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminStats } from '@/lib/types/admin'

/**
 * Fetches aggregate stats for the admin dashboard.
 * Uses supabaseAdmin (service role) to bypass RLS for cross-user queries.
 */
export async function getAdminStatsAction(): Promise<AdminStats> {
  await requireAdmin()

  // Calculate today boundaries in America/Santo_Domingo timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayStr = formatter.format(now) // YYYY-MM-DD
  const todayStart = `${todayStr}T00:00:00-04:00`
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = formatter.format(tomorrowDate)
  const tomorrowStart = `${tomorrowStr}T00:00:00-04:00`

  // Total users (count profiles as proxy for registered users)
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // Active members
  const { count: activeMembers } = await supabaseAdmin
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  // Today's reservations (non-cancelled)
  const { count: todayReservations } = await supabaseAdmin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .gte('starts_at', todayStart)
    .lt('starts_at', tomorrowStart)
    .neq('status', 'cancelled')

  // Upcoming events
  const { count: upcomingEvents } = await supabaseAdmin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .gte('event_date', now.toISOString())

  return {
    totalUsers: totalUsers ?? 0,
    activeMembers: activeMembers ?? 0,
    todayReservations: todayReservations ?? 0,
    upcomingEvents: upcomingEvents ?? 0,
  }
}
