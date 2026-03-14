import { describe, it, expect } from 'vitest'
import { countries, countryByCode, codeToFlag } from '@/lib/data/countries'

describe('countries data', () => {
  it('has exactly 249 entries (ISO 3166-1 count)', () => {
    expect(countries).toHaveLength(249)
  })

  it('every country has a 2-char uppercase code matching /^[A-Z]{2}$/', () => {
    for (const c of countries) {
      expect(c.code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('every country has non-empty nameEn and nameEs strings', () => {
    for (const c of countries) {
      expect(c.nameEn.length).toBeGreaterThan(0)
      expect(c.nameEs.length).toBeGreaterThan(0)
    }
  })

  it('every country has a flag emoji string (length >= 2 chars)', () => {
    for (const c of countries) {
      expect(c.flag.length).toBeGreaterThanOrEqual(2)
    }
  })

  it("codeToFlag('DO') produces the Dominican Republic flag emoji", () => {
    const flag = codeToFlag('DO')
    // D = U+1F1E9, O = U+1F1F4
    const expected = String.fromCodePoint(0x1F1E9, 0x1F1F4)
    expect(flag).toBe(expected)
  })

  it("countryByCode.get('US') returns the US entry", () => {
    const us = countryByCode.get('US')
    expect(us).toBeDefined()
    expect(us!.code).toBe('US')
    expect(us!.nameEn).toBe('United States')
  })

  it("countryByCode.get('XX') returns undefined", () => {
    expect(countryByCode.get('XX')).toBeUndefined()
  })

  it("'DO' entry has nameEn 'Dominican Republic' and nameEs 'Republica Dominicana'", () => {
    const dr = countryByCode.get('DO')
    expect(dr).toBeDefined()
    expect(dr!.nameEn).toBe('Dominican Republic')
    expect(dr!.nameEs).toBe('Republica Dominicana')
  })
})
