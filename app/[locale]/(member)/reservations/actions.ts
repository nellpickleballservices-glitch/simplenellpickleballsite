'use server'

import { createClient } from '@/lib/supabase/server'
import { getCourtAvailability } from '@/lib/queries/reservations'
import type { TimeSlot, AvailabilitySummary } from '@/lib/types/reservations'

interface AvailabilityResult {
  timeSlots: TimeSlot[]
  availabilitySummary: AvailabilitySummary
}

/**
 * Server Action: Fetch availability for a single court on a given date.
 * Called from TimeSlotGrid when user switches date tabs.
 */
export async function getAvailabilityAction(
  courtId: string,
  date: string
): Promise<AvailabilityResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const courts = await getCourtAvailability(date, courtId)
  const court = courts[0]

  if (!court) {
    return {
      timeSlots: [],
      availabilitySummary: { total: 0, available: 0 },
    }
  }

  return {
    timeSlots: court.timeSlots,
    availabilitySummary: court.availabilitySummary,
  }
}
