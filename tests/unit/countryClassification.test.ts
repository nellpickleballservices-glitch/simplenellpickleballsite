import { describe, it, expect } from 'vitest'
import { isLocalUser } from '@/lib/utils/countryValidation'

describe('isLocalUser', () => {
  it('returns true for "DO"', () => {
    expect(isLocalUser('DO')).toBe(true)
  })

  it('returns false for "US"', () => {
    expect(isLocalUser('US')).toBe(false)
  })

  it('returns false for lowercase "do" (data is stored uppercase)', () => {
    expect(isLocalUser('do')).toBe(false)
  })
})
