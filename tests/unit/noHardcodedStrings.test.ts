import { describe, it, expect } from 'vitest'

// Stub: AST / grep check that no component files contain hardcoded Spanish/English UI strings
// Implementation will scan app/**/*.tsx for string literals not behind t()
describe('No hardcoded UI strings', () => {
  it.todo('app/[locale]/layout.tsx contains no hardcoded UI strings')
  it.todo('auth pages contain no hardcoded UI strings')
  it.todo('signup page renders all text via useTranslations()')
})
