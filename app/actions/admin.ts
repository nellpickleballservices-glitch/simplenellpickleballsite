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
