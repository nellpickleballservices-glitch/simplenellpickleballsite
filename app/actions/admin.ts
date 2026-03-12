'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminStats, UserWithDetails, Event, ContentBlock } from '@/lib/types/admin'
import { resend } from '@/lib/resend'

/**
 * Layer 3 admin protection: validates admin role in Server Actions.
 * Complements Layer 1 (proxy.ts) and Layer 2 (admin layout.tsx).
 * Redirects non-admin users to home page.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.app_metadata?.role !== 'admin') {
    redirect('/')
  }

  return user
}

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

// ---------------------------------------------------------------------------
// Events Actions
// ---------------------------------------------------------------------------

export async function getEventsAction(
  filter: 'upcoming' | 'past' = 'upcoming'
): Promise<Event[]> {
  await requireAdmin()

  const now = new Date().toISOString()
  let query = supabaseAdmin
    .from('events')
    .select('*, locations(name)')

  if (filter === 'upcoming') {
    query = query.gte('event_date', now).order('event_date', { ascending: true })
  } else {
    query = query.lt('event_date', now).order('event_date', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Event[]
}

export async function createEventAction(formData: FormData): Promise<{ success: boolean }> {
  await requireAdmin()

  const title_es = formData.get('title_es') as string
  const title_en = formData.get('title_en') as string
  const event_date = formData.get('event_date') as string
  const event_type = formData.get('event_type') as string

  if (!title_es || !title_en) throw new Error('Title is required in both languages')
  if (!event_date) throw new Error('Event date is required')
  if (!['tournament', 'training', 'social'].includes(event_type)) {
    throw new Error('Invalid event type')
  }

  const { error } = await supabaseAdmin.from('events').insert({
    title_es,
    title_en,
    description_es: (formData.get('description_es') as string) || null,
    description_en: (formData.get('description_en') as string) || null,
    event_date,
    event_type,
    start_time: (formData.get('start_time') as string) || null,
    end_time: (formData.get('end_time') as string) || null,
    image_url: (formData.get('image_url') as string) || null,
    location_id: (formData.get('location_id') as string) || null,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function updateEventAction(
  eventId: string,
  formData: FormData
): Promise<{ success: boolean }> {
  await requireAdmin()

  const title_es = formData.get('title_es') as string
  const title_en = formData.get('title_en') as string
  const event_date = formData.get('event_date') as string
  const event_type = formData.get('event_type') as string

  if (!title_es || !title_en) throw new Error('Title is required in both languages')
  if (!event_date) throw new Error('Event date is required')
  if (!['tournament', 'training', 'social'].includes(event_type)) {
    throw new Error('Invalid event type')
  }

  const { error } = await supabaseAdmin
    .from('events')
    .update({
      title_es,
      title_en,
      description_es: (formData.get('description_es') as string) || null,
      description_en: (formData.get('description_en') as string) || null,
      event_date,
      event_type,
      start_time: (formData.get('start_time') as string) || null,
      end_time: (formData.get('end_time') as string) || null,
      image_url: (formData.get('image_url') as string) || null,
      location_id: (formData.get('location_id') as string) || null,
    })
    .eq('id', eventId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function deleteEventAction(eventId: string): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin.from('events').delete().eq('id', eventId)
  if (error) throw new Error(error.message)
  return { success: true }
}

// ---------------------------------------------------------------------------
// CMS Actions
// ---------------------------------------------------------------------------

interface GroupedContentBlocks {
  home: ContentBlock[]
  about: ContentBlock[]
  learn: ContentBlock[]
  faq: ContentBlock[]
}

export async function getContentBlocksAction(): Promise<GroupedContentBlocks> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('content_blocks')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const blocks = (data ?? []) as ContentBlock[]
  const grouped: GroupedContentBlocks = { home: [], about: [], learn: [], faq: [] }

  for (const block of blocks) {
    if (block.block_key.startsWith('home_')) grouped.home.push(block)
    else if (block.block_key.startsWith('about_')) grouped.about.push(block)
    else if (block.block_key.startsWith('learn_')) grouped.learn.push(block)
    else if (block.block_key.startsWith('faq_')) grouped.faq.push(block)
  }

  return grouped
}

export async function updateContentBlockAction(
  blockId: string,
  content_es: string,
  content_en: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('content_blocks')
    .update({
      content_es,
      content_en,
      updated_at: new Date().toISOString(),
    })
    .eq('id', blockId)

  if (error) throw new Error(error.message)

  // Trigger ISR cache invalidation so public pages see fresh content
  revalidatePath('/')

  return { success: true }
}

export async function reorderContentBlocksAction(
  blockIds: string[]
): Promise<{ success: boolean }> {
  await requireAdmin()

  for (let i = 0; i < blockIds.length; i++) {
    const { error } = await supabaseAdmin
      .from('content_blocks')
      .update({ sort_order: i + 1 })
      .eq('id', blockIds[i])
    if (error) throw new Error(error.message)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Court Management Actions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Reservation Management Actions
// ---------------------------------------------------------------------------

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
  courts: { name: string } | null
}

export async function getAllReservationsAction(filters: {
  dateFrom?: string
  dateTo?: string
  courtId?: string
  status?: string
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
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, count, error } = await query
    .order('starts_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

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

  if (error) throw new Error(error.message)
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

  if (!courtId || !startsAt || !endsAt) {
    return { error: 'Court, start time, and end time are required' }
  }

  if (!userId && !guestName) {
    return { error: 'Select a user or enter a guest name' }
  }

  let reservationUserId = userId || admin.id
  let firstName = ''
  let lastName = ''
  let paymentStatus = 'free'
  const isGuest = !userId && !!guestName
  const createdByAdmin = isGuest

  if (userId) {
    // Registered user: snapshot name from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    firstName = profile?.first_name ?? ''
    lastName = profile?.last_name ?? ''
    paymentStatus = 'free'
    reservationUserId = userId
  } else if (guestName) {
    // Walk-in guest: use admin's user_id with guest_name
    const names = guestName.trim().split(' ')
    firstName = names[0] ?? guestName
    lastName = names.slice(1).join(' ') || ''
    paymentStatus = 'cash_pending'
    reservationUserId = admin.id
  }

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
    price_cents: 0,
  })

  if (error) return { error: error.message }
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

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function searchUsersForReservationAction(
  query: string
): Promise<{ id: string; first_name: string; last_name: string; email: string }[]> {
  await requireAdmin()

  if (!query || query.length < 2) return []

  // Search profiles by name
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10)

  if (!profiles || profiles.length === 0) return []

  // Look up emails for matched profiles
  const results: { id: string; first_name: string; last_name: string; email: string }[] = []
  for (const profile of profiles) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    results.push({
      id: profile.id,
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      email: userData?.user?.email ?? '',
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// User Management Actions
// ---------------------------------------------------------------------------

const USER_PAGE_SIZE = 20

/**
 * Search users by name, email, or phone. Returns paginated results.
 * When query is empty, returns all users ordered by created_at desc.
 */
export async function searchUsersAction(
  query: string,
  page: number = 1
): Promise<{ users: UserWithDetails[]; total: number; page: number }> {
  await requireAdmin()

  const offset = (page - 1) * USER_PAGE_SIZE
  const trimmed = query.trim()

  if (!trimmed) {
    // No search query: return paginated list of all users
    const { data: profiles, count } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, phone, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + USER_PAGE_SIZE - 1)

    if (!profiles) return { users: [], total: 0, page }

    const users = await enrichProfilesWithAuthAndMembership(profiles)
    return { users, total: count ?? 0, page }
  }

  // Two-pronged search: profiles (name/phone) + auth (email)
  const profileSearchTerm = `%${trimmed}%`

  // 1. Search profiles by name and phone
  const { data: profileMatches } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, phone, created_at')
    .or(`first_name.ilike.${profileSearchTerm},last_name.ilike.${profileSearchTerm},phone.ilike.${profileSearchTerm}`)

  // 2. Search auth users for email match
  // Supabase admin API lacks server-side email filter; fetch all and filter client-side
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const lowerQuery = trimmed.toLowerCase()
  const emailMatchIds = new Set(
    (authData?.users ?? [])
      .filter((u) => u.email?.toLowerCase().includes(lowerQuery))
      .map((u) => u.id)
  )

  // Merge by user ID, deduplicate
  const allMatchIds = new Set<string>()
  const profileMap = new Map<string, NonNullable<typeof profileMatches>[number]>()

  for (const p of profileMatches ?? []) {
    allMatchIds.add(p.id)
    profileMap.set(p.id, p)
  }
  for (const id of emailMatchIds) {
    allMatchIds.add(id)
  }

  // For email-only matches, fetch their profiles
  const emailOnlyIds = [...emailMatchIds].filter((id) => !profileMap.has(id))
  if (emailOnlyIds.length > 0) {
    const { data: extraProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, phone, created_at')
      .in('id', emailOnlyIds)

    for (const p of extraProfiles ?? []) {
      profileMap.set(p.id, p)
    }
  }

  // Build ordered list and paginate
  const allProfiles = [...allMatchIds]
    .map((id) => profileMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
  allProfiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const total = allProfiles.length
  const paginated = allProfiles.slice(offset, offset + USER_PAGE_SIZE)
  const users = await enrichProfilesWithAuthAndMembership(paginated)

  return { users, total, page }
}

/**
 * Enrich profile records with email (from auth), membership, and ban status.
 */
async function enrichProfilesWithAuthAndMembership(
  profiles: { id: string; first_name: string; last_name: string; phone: string | null; created_at: string }[]
): Promise<UserWithDetails[]> {
  if (profiles.length === 0) return []

  const userIds = profiles.map((p) => p.id)

  // Batch fetch memberships
  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select('user_id, status, plan')
    .in('user_id', userIds)

  const membershipMap = new Map(
    (memberships ?? []).map((m) => [m.user_id, m])
  )

  // Fetch auth users for email and ban status
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u])
  )

  return profiles.map((p) => {
    const auth = authMap.get(p.id)
    const membership = membershipMap.get(p.id)
    return {
      id: p.id,
      email: auth?.email ?? '',
      first_name: p.first_name,
      last_name: p.last_name,
      phone: p.phone,
      created_at: p.created_at,
      membership_status: membership?.status ?? null,
      membership_plan: membership?.plan ?? null,
      is_banned: auth?.banned_until ? new Date(auth.banned_until).getTime() > Date.now() : false,
    }
  })
}

/**
 * Fetch full user details for the admin slide-out panel.
 */
export async function getUserDetailsAction(userId: string) {
  await requireAdmin()

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, phone, created_at')
    .eq('id', userId)
    .single()

  if (!profile) throw new Error('User not found')

  // Fetch auth user for email and ban status
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authError) throw authError

  // Fetch membership
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('plan, status, current_period_end, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()

  // Fetch reservation history (last 20)
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id, court_id, starts_at, ends_at, status, booking_mode, payment_status')
    .eq('user_id', userId)
    .order('starts_at', { ascending: false })
    .limit(20)

  return {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: authUser.user.email ?? '',
    phone: profile.phone,
    created_at: profile.created_at,
    is_banned: authUser.user.banned_until
      ? new Date(authUser.user.banned_until).getTime() > Date.now()
      : false,
    membership: membership
      ? {
          plan: membership.plan,
          status: membership.status,
          current_period_end: membership.current_period_end,
        }
      : null,
    reservations: reservations ?? [],
  }
}

/**
 * Disable a user account (ban) and auto-cancel their future reservations.
 */
export async function disableUserAction(userId: string) {
  await requireAdmin()

  // Ban the user for ~100 years
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })
  if (banError) throw banError

  // Auto-cancel future reservations
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .gt('starts_at', new Date().toISOString())
    .in('status', ['confirmed', 'pending_payment'])

  return { success: true }
}

/**
 * Re-enable a disabled (banned) user account.
 */
export async function enableUserAction(userId: string) {
  await requireAdmin()

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })
  if (error) throw error

  return { success: true }
}

/**
 * Trigger a password reset email for a user via Resend.
 */
export async function triggerPasswordResetAction(userId: string) {
  await requireAdmin()

  // Get user email
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authError) throw authError

  const email = authUser.user.email
  if (!email) throw new Error('User has no email address')

  // Generate recovery link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  if (linkError) throw linkError

  const recoveryLink = linkData.properties.action_link

  // Send via Resend with bilingual template
  try {
    await resend.emails.send({
      from: 'NELL Pickleball Club <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset / Restablecer Contrasena — NELL Pickleball Club',
      text: `Password Reset / Restablecer Contrasena\n\nClick the link below to reset your password:\nHaz clic en el enlace para restablecer tu contrasena:\n\n${recoveryLink}\n\nThis link expires in 24 hours.\nEste enlace expira en 24 horas.\n\n— NELL Pickleball Club`,
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  return { success: true }
}
