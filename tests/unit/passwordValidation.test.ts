import { describe, it, expect } from 'vitest'

// Stub: will import from lib/utils/passwordValidation.ts once created in plan 01-03
describe('passwordValidation', () => {
  it.todo('rejects passwords shorter than 8 characters')
  it.todo('accepts passwords of exactly 8 characters')
  it.todo('accepts passwords longer than 8 characters')
  it.todo('validatePasswordMatch: returns null when passwords match')
  it.todo('validatePasswordMatch: returns error string when passwords do not match')
})
