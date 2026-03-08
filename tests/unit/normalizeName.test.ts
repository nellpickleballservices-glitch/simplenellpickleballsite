import { describe, it, expect } from 'vitest'
import { normalizeName, validateName } from '@/lib/utils/normalizeName'

describe('normalizeName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeName('  JUAN  ')).toBe('Juan')
  })

  it('capitalizes first letter of each word', () => {
    expect(normalizeName('jose urizar')).toBe('Jose Urizar')
  })

  it('lowercases the rest of each word', () => {
    expect(normalizeName('JOSE URIZAR')).toBe('Jose Urizar')
  })

  it('"jose urizar" → "Jose Urizar"', () => {
    expect(normalizeName('jose urizar')).toBe('Jose Urizar')
  })

  it('handles accented characters: "maría" → "María"', () => {
    expect(normalizeName('maría')).toBe('María')
  })
})

describe('validateName', () => {
  it('returns null for a valid name', () => {
    expect(validateName('jose')).toBeNull()
  })

  it('rejects names containing numbers', () => {
    const result = validateName('jose3')
    expect(result).not.toBeNull()
    expect(result).toBe('Name cannot contain numbers')
  })

  it('rejects empty string after trim', () => {
    expect(validateName('   ')).toBe('Name is required')
    expect(validateName('')).toBe('Name is required')
  })
})
