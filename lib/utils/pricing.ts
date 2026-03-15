/**
 * Pure pricing calculation functions.
 * No database or Supabase imports — safe for unit testing.
 */

import type { PriceCalculationInput, PriceCalculationResult } from '@/lib/types/pricing'

/**
 * Determines if a user is a tourist based on their country code.
 * Null or empty country is treated as tourist (conservative).
 */
export function isTourist(country: string | null): boolean {
  return country !== 'DO'
}

/**
 * Calculates the session price including tourist surcharge when applicable.
 * Returns a full breakdown object for downstream consumers.
 */
export function calculateSessionPrice(input: PriceCalculationInput): PriceCalculationResult {
  const { basePriceCents, surchargePercent, isTourist } = input

  const surchargeAmountCents = isTourist
    ? Math.round(basePriceCents * surchargePercent / 100)
    : 0

  return {
    basePriceCents,
    surchargePercent,
    surchargeAmountCents,
    totalCents: basePriceCents + surchargeAmountCents,
    isTourist,
  }
}
