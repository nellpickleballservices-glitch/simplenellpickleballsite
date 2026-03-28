'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { CourtPricingGrid } from '@/lib/types/pricing'
import { DAY_NAMES_EN } from '@/lib/types/pricing'

import { validateDayOfWeek, validatePriceCents, validateSurchargePct } from '@/lib/utils/pricingValidation'

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Returns session pricing grouped by court, each with 7 days sorted Sun-Sat.
 */
export async function getSessionPricingAction(): Promise<CourtPricingGrid[]> {
  await requireAdmin()

  // Fetch all courts
  const { data: courts, error: courtsErr } = await supabaseAdmin
    .from('courts')
    .select('id, name')
    .order('name')

  if (courtsErr) {
    console.error('[pricing] getSessionPricing courts error:', courtsErr.message)
    throw new Error('Operation failed')
  }

  // Fetch all session_pricing rows
  const { data: pricing, error: pricingErr } = await supabaseAdmin
    .from('session_pricing')
    .select('court_id, day_of_week, price_cents')
    .order('day_of_week')

  if (pricingErr) {
    console.error('[pricing] getSessionPricing pricing error:', pricingErr.message)
    throw new Error('Operation failed')
  }

  // Build lookup: court_id -> Map<day_of_week, price_cents>
  const pricingMap = new Map<string, Map<number, number>>()
  for (const row of pricing ?? []) {
    if (!pricingMap.has(row.court_id)) {
      pricingMap.set(row.court_id, new Map())
    }
    pricingMap.get(row.court_id)!.set(row.day_of_week, row.price_cents)
  }

  // Assemble grids
  return (courts ?? []).map((court) => {
    const courtPricing = pricingMap.get(court.id)
    return {
      court_id: court.id,
      court_name: court.name,
      days: Array.from({ length: 7 }, (_, day) => ({
        day_of_week: day,
        day_name: DAY_NAMES_EN[day],
        price_cents: courtPricing?.get(day) ?? 0,
      })),
    }
  })
}

/**
 * Upsert a single day's price for a court.
 */
export async function upsertSessionPricingAction(
  courtId: string,
  dayOfWeek: number,
  priceCents: number
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  if (!validateDayOfWeek(dayOfWeek)) {
    return { success: false, error: 'day_of_week must be an integer between 0 and 6' }
  }
  if (!validatePriceCents(priceCents)) {
    return { success: false, error: 'price_cents must be a non-negative integer' }
  }

  const { error } = await supabaseAdmin
    .from('session_pricing')
    .upsert(
      { court_id: courtId, day_of_week: dayOfWeek, price_cents: priceCents },
      { onConflict: 'court_id,day_of_week' }
    )

  if (error) {
    console.error('[pricing] upsertSessionPricing error:', error.message)
    return { success: false, error: 'Operation failed' }
  }
  return { success: true }
}

/**
 * Returns the current tourist surcharge percentage as a number.
 */
export async function getTouristSurchargeAction(): Promise<number> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'tourist_surcharge_pct')
    .maybeSingle()

  if (error) {
    console.error('[pricing] getTouristSurcharge error:', error.message)
    throw new Error('Operation failed')
  }
  return data ? Number(data.value) : 25
}

/**
 * Updates the tourist surcharge percentage (0-100).
 */
export async function updateTouristSurchargeAction(
  pct: number
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  if (!validateSurchargePct(pct)) {
    return { success: false, error: 'surcharge_pct must be an integer between 0 and 100' }
  }

  const { error } = await supabaseAdmin
    .from('app_config')
    .update({ value: pct })
    .eq('key', 'tourist_surcharge_pct')

  if (error) {
    console.error('[pricing] updateTouristSurcharge error:', error.message)
    return { success: false, error: 'Operation failed' }
  }
  return { success: true }
}
