import { createClient } from '@/lib/supabase/server'
import type { Location } from '@/lib/types/reservations'

export interface LocationWithCourtCount extends Location {
  courtCount: number
}

/**
 * Fetch all locations that have at least one open court,
 * along with the count of open courts at each location.
 */
export async function getLocationsWithCourtCounts(): Promise<LocationWithCourtCount[]> {
  const supabase = await createClient()

  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (locError) throw new Error(locError.message)

  const { data: courts, error: courtError } = await supabase
    .from('courts')
    .select('location_id')
    .eq('status', 'open')

  if (courtError) throw new Error(courtError.message)

  // Count courts per location
  const countMap = new Map<string, number>()
  for (const c of courts ?? []) {
    countMap.set(c.location_id, (countMap.get(c.location_id) ?? 0) + 1)
  }

  return (locations ?? [])
    .filter((loc) => (countMap.get(loc.id) ?? 0) > 0)
    .map((loc) => ({
      ...loc,
      courtCount: countMap.get(loc.id) ?? 0,
    }))
}
