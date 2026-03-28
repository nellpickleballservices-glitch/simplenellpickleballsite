'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface LocationRow {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  hero_image_url: string | null
  description: string | null
  created_at: string
  courtCount: number
}

export async function getLocationsAction(): Promise<LocationRow[]> {
  await requireAdmin()

  const { data: locations, error } = await supabaseAdmin
    .from('locations')
    .select('*')
    .order('name')

  if (error) {
    console.error('[locations] getLocations error:', error.message)
    throw new Error('Operation failed')
  }

  // Get court counts per location
  const { data: courts, error: courtsCountError } = await supabaseAdmin
    .from('courts')
    .select('location_id')

  if (courtsCountError) {
    console.error('[locations] getLocations courts error:', courtsCountError.message)
    throw new Error('Operation failed')
  }

  const countMap = new Map<string, number>()
  for (const c of courts ?? []) {
    countMap.set(c.location_id, (countMap.get(c.location_id) ?? 0) + 1)
  }

  return (locations ?? []).map((loc) => ({
    ...loc,
    courtCount: countMap.get(loc.id) ?? 0,
  }))
}

export async function addLocationAction(
  _prevState: { success?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const lat = formData.get('lat') as string
  const lng = formData.get('lng') as string
  const heroImageUrl = formData.get('heroImageUrl') as string
  const description = formData.get('description') as string

  if (!name) {
    return { error: 'Location name is required' }
  }

  if (heroImageUrl) {
    try {
      const parsed = new URL(heroImageUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { error: 'Hero image URL must use http or https' }
      }
    } catch {
      return { error: 'Invalid hero image URL' }
    }
  }

  const { error } = await supabaseAdmin.from('locations').insert({
    name,
    address: address || null,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    hero_image_url: heroImageUrl || null,
    description: description || null,
  })

  if (error) {
    console.error('[locations] addLocation error:', error.message)
    return { error: 'Operation failed' }
  }
  return { success: true }
}

export async function updateLocationAction(
  locationId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const lat = formData.get('lat') as string
  const lng = formData.get('lng') as string
  const heroImageUrl = formData.get('heroImageUrl') as string
  const description = formData.get('description') as string

  if (!name) {
    return { error: 'Location name is required' }
  }

  const { error } = await supabaseAdmin
    .from('locations')
    .update({
      name,
      address: address || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      hero_image_url: heroImageUrl || null,
      description: description || null,
    })
    .eq('id', locationId)

  if (error) {
    console.error('[locations] updateLocation error:', error.message)
    return { error: 'Operation failed' }
  }
  return { success: true }
}

export async function deleteLocationAction(
  locationId: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('locations')
    .delete()
    .eq('id', locationId)

  if (error) {
    console.error('[locations] deleteLocation error:', error.message)
    return { error: 'Operation failed' }
  }
  return { success: true }
}
