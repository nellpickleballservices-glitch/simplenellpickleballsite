'use server'

import { createClient } from '@/lib/supabase/server'
import { getCourtAvailability } from '@/lib/queries/reservations'
import { calculateSessionPrice, isTourist } from '@/lib/utils/pricing'
import type { TimeSlot, AvailabilitySummary } from '@/lib/types/reservations'

interface AvailabilityResult {
  timeSlots: TimeSlot[]
  availabilitySummary: AvailabilitySummary
  displayPriceCents: number
}

/**
 * Compute the display price for a court session server-side (PRIC-05).
 * Members always get 0. Non-members get base price + tourist surcharge if applicable.
 */
async function computeDisplayPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  basePriceCents: number,
  surchargePercent: number,
): Promise<number> {
  // Check membership status
  const { data: membership } = await supabase
    .from('memberships')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (membership?.status === 'active') {
    return 0
  }

  // Get user country from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', userId)
    .single()

  const result = calculateSessionPrice({
    basePriceCents,
    surchargePercent,
    isTourist: isTourist(profile?.country ?? null),
  })

  return result.totalCents
}

/**
 * Server Action: Fetch availability for a single court on a given date.
 * Called from TimeSlotGrid when user switches date tabs.
 * Returns displayPriceCents computed server-side per PRIC-05.
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
      displayPriceCents: 0,
    }
  }

  const basePriceCents = court.sessionPriceCents ?? court.defaultPriceCents ?? 1000
  const surchargePercent = court.touristSurchargePct ?? 0

  const displayPriceCents = await computeDisplayPrice(
    supabase,
    user.id,
    basePriceCents,
    surchargePercent,
  )

  return {
    timeSlots: court.timeSlots,
    availabilitySummary: court.availabilitySummary,
    displayPriceCents,
  }
}
