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
  if (error) {
    console.error('[events] getEvents error:', error.message)
    throw new Error('Operation failed')
  }
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

  const imageUrl = (formData.get('image_url') as string) || null
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Image URL must use http or https')
      }
    } catch {
      throw new Error('Image URL must use http or https')
    }
  }

  const priceRaw = formData.get('price_cents') as string | null
  const price_cents = priceRaw && priceRaw.trim() !== '' ? parseInt(priceRaw, 10) : null
  if (price_cents !== null && (isNaN(price_cents) || price_cents < 0 || price_cents > 1_000_000)) {
    throw new Error('Invalid price')
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
    image_url: imageUrl,
    location_id: (formData.get('location_id') as string) || null,
    price_cents,
  })

  if (error) {
    console.error('[events] createEvent error:', error.message)
    throw new Error('Operation failed')
  }
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

  const imageUrl = (formData.get('image_url') as string) || null
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Image URL must use http or https')
      }
    } catch {
      throw new Error('Image URL must use http or https')
    }
  }

  const priceRaw = formData.get('price_cents') as string | null
  const price_cents = priceRaw && priceRaw.trim() !== '' ? parseInt(priceRaw, 10) : null
  if (price_cents !== null && (isNaN(price_cents) || price_cents < 0 || price_cents > 1_000_000)) {
    throw new Error('Invalid price')
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
      image_url: imageUrl,
      location_id: (formData.get('location_id') as string) || null,
      price_cents,
    })
    .eq('id', eventId)

  if (error) {
    console.error('[events] updateEvent error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

export async function deleteEventAction(eventId: string): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin.from('events').delete().eq('id', eventId)
  if (error) {
    console.error('[events] deleteEvent error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}
