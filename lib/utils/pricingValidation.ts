/**
 * Pure validation helpers for pricing domain.
 * Extracted to avoid importing Supabase client in unit tests.
 */

export function validateDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6
}

export function validatePriceCents(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 0
}

export function validateSurchargePct(pct: number): boolean {
  return Number.isInteger(pct) && pct >= 0 && pct <= 100
}
