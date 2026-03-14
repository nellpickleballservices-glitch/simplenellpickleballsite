/**
 * Country validation and classification utilities.
 * Used by signup, OAuth complete-profile, and admin actions.
 */

/** Validate that a country code is exactly 2 uppercase letters (ISO 3166-1 alpha-2). */
export function validateCountryCode(code: string): string | null {
  if (!/^[A-Z]{2}$/.test(code)) {
    return 'Invalid country code'
  }
  return null
}

/** Extract and normalize country from FormData. Defaults to 'DO' if missing/empty. */
export function extractCountry(formData: FormData): string {
  const raw = formData.get('country')
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return 'DO'
  }
  return raw.trim().toUpperCase()
}

/** Returns true if the country code represents a local (Dominican Republic) user. */
export function isLocalUser(countryCode: string): boolean {
  return countryCode === 'DO'
}
