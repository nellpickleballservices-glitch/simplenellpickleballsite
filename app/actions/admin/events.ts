'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Event } from '@/lib/types/admin'

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
