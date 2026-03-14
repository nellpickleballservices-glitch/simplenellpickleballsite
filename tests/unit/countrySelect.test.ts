import { describe, it, expect } from 'vitest'
import { filterCountries, sortWithDRFirst } from '@/components/CountrySelect'
import { countries } from '@/lib/data/countries'

describe('filterCountries', () => {
  it('filtering with "dom" returns Dominican Republic in results (English match)', () => {
    const results = filterCountries('dom')
    expect(results.some((c) => c.code === 'DO')).toBe(true)
  })

  it('filtering with "alem" returns Germany (Spanish match "Alemania")', () => {
    const results = filterCountries('alem')
    expect(results.some((c) => c.code === 'DE')).toBe(true)
  })

  it('filtering with "united" returns United States and United Kingdom', () => {
    const results = filterCountries('united')
    const codes = results.map((c) => c.code)
    expect(codes).toContain('US')
    expect(codes).toContain('GB')
  })

  it('empty search returns all 249 countries', () => {
    const results = filterCountries('')
    expect(results).toHaveLength(249)
  })

  it('search is case-insensitive', () => {
    const lower = filterCountries('germany')
    const upper = filterCountries('GERMANY')
    const mixed = filterCountries('GeRmAnY')
    expect(lower.map((c) => c.code)).toEqual(upper.map((c) => c.code))
    expect(lower.map((c) => c.code)).toEqual(mixed.map((c) => c.code))
  })
})

describe('sortWithDRFirst', () => {
  it('DR is always first in the sorted results regardless of search', () => {
    const all = sortWithDRFirst(countries, 'en')
    expect(all[0].code).toBe('DO')
  })

  it('DR does not appear twice (not in pinned AND in filtered list)', () => {
    const all = sortWithDRFirst(countries, 'en')
    const drCount = all.filter((c) => c.code === 'DO').length
    expect(drCount).toBe(1)
  })

  it('empty search returns all 249 countries with DR first', () => {
    const sorted = sortWithDRFirst(filterCountries(''), 'en')
    expect(sorted).toHaveLength(249)
    expect(sorted[0].code).toBe('DO')
  })
})
