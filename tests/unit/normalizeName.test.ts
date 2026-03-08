import { describe, it, expect } from 'vitest'

// Stub: will import from lib/utils/normalizeName.ts once created in plan 01-03
describe('normalizeName', () => {
  it.todo('trims leading and trailing whitespace')
  it.todo('capitalizes first letter of each word')
  it.todo('lowercases the rest of each word')
  it.todo('"jose urizar" → "Jose Urizar"')
  it.todo('rejects names containing numbers')
  it.todo('rejects empty string after trim')
  it.todo('handles accented characters: "maría" → "María"')
})
