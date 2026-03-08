import { describe, it, expect } from 'vitest'
import { validatePasswordLength, validatePasswordMatch } from '@/lib/utils/passwordValidation'

describe('passwordValidation', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePasswordLength('1234567')
    expect(result).not.toBeNull()
    expect(result).toBe('Password must be at least 8 characters')
  })

  it('accepts passwords of exactly 8 characters', () => {
    expect(validatePasswordLength('12345678')).toBeNull()
  })

  it('accepts passwords longer than 8 characters', () => {
    expect(validatePasswordLength('alongpassword')).toBeNull()
  })

  it('validatePasswordMatch: returns null when passwords match', () => {
    expect(validatePasswordMatch('abc', 'abc')).toBeNull()
  })

  it('validatePasswordMatch: returns error string when passwords do not match', () => {
    const result = validatePasswordMatch('abc', 'xyz')
    expect(result).not.toBeNull()
    expect(result).toBe('Passwords do not match')
  })
})
