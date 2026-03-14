import { describe, it, expect } from 'vitest'
import { extractCountry, validateCountryCode } from '@/lib/utils/countryValidation'

describe('extractCountry', () => {
  it('returns "DO" when FormData has value "DO"', () => {
    const fd = new FormData()
    fd.set('country', 'DO')
    expect(extractCountry(fd)).toBe('DO')
  })

  it('uppercases lowercase input "us" to "US"', () => {
    const fd = new FormData()
    fd.set('country', 'us')
    expect(extractCountry(fd)).toBe('US')
  })

  it('defaults to "DO" when value is empty string', () => {
    const fd = new FormData()
    fd.set('country', '')
    expect(extractCountry(fd)).toBe('DO')
  })

  it('defaults to "DO" when country key is missing (null)', () => {
    const fd = new FormData()
    expect(extractCountry(fd)).toBe('DO')
  })
})

describe('validateCountryCode', () => {
  it('returns null for valid code "DO"', () => {
    expect(validateCountryCode('DO')).toBeNull()
  })

  it('returns null for valid code "US"', () => {
    expect(validateCountryCode('US')).toBeNull()
  })

  it('returns error for too-long code "ABC"', () => {
    expect(validateCountryCode('ABC')).toBeTypeOf('string')
  })

  it('returns error for too-short code "A"', () => {
    expect(validateCountryCode('A')).toBeTypeOf('string')
  })

  it('returns error for numeric code "12"', () => {
    expect(validateCountryCode('12')).toBeTypeOf('string')
  })
})
