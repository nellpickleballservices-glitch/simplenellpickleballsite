# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Unit Test Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `node`
- Globals: enabled (`describe`, `it`, `test`, `expect` available without import)

**E2E Test Runner:**
- Playwright 1.58.x
- Config: `playwright.config.ts`
- Browser: Chromium only
- Base URL: `http://localhost:3000`

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest API)
- Playwright built-in `expect` for E2E

**Run Commands:**
```bash
npm test                # Run all unit tests (vitest run)
npm run test:unit       # Run unit tests only (vitest run tests/unit)
npm run test:e2e        # Run E2E tests (playwright test)
```

## Test File Organization

**Location:** Separate `tests/` directory at project root (not co-located with source)

**Naming:**
- Unit tests: `*.test.ts` (in `tests/unit/`)
- E2E/integration tests: `*.spec.ts` (in `tests/auth/`, `tests/i18n/`)

**Structure:**
```
tests/
  unit/
    adminRole.test.ts          # Admin role assignment
    billing.test.ts            # Checkout/portal actions
    checkoutSuccess.test.ts    # Checkout success page
    noHardcodedStrings.test.ts # I18n compliance check
    normalizeName.test.ts      # Name normalization utility
    passwordValidation.test.ts # Password validation utility
    proxyMembership.test.ts    # Membership gating
    proxyUsesGetUser.test.ts   # Security: getUser vs getSession
    rls-policies.test.ts       # RLS policy verification
    webhookHandler.test.ts     # Stripe webhook handler
  auth/
    login.spec.ts              # Login flow E2E
    password-reset.spec.ts     # Password reset E2E
    route-protection.spec.ts   # Route protection E2E
    session-persist.spec.ts    # Session persistence E2E
    signup.spec.ts             # Signup flow E2E
  i18n/
    locale-routing.spec.ts     # Locale routing E2E
```

## Test Structure

**Unit Test Pattern (implemented tests):**
```typescript
import { describe, it, expect } from 'vitest'
import { normalizeName, validateName } from '@/lib/utils/normalizeName'

describe('normalizeName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeName('  JUAN  ')).toBe('Juan')
  })

  it('capitalizes first letter of each word', () => {
    expect(normalizeName('jose urizar')).toBe('Jose Urizar')
  })

  it('handles accented characters: "maria" -> "Maria"', () => {
    expect(normalizeName('maria')).toBe('Maria')
  })
})
```

**Unit Test Pattern (placeholder/stub tests):**
```typescript
import { describe, test, expect } from 'vitest'

describe('Stripe webhook handler', () => {
  describe('checkout.session.completed', () => {
    test.skip('upserts memberships row with active status', () => {
      expect(true).toBe(true)
    })
  })
})
```

**Unit Test Pattern (source-code inspection tests):**
```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('proxy.ts security checks', () => {
  it('proxy.ts uses getUser() not getSession()', () => {
    const source = readFileSync(join(process.cwd(), 'proxy.ts'), 'utf-8')
    expect(source).toContain('getUser()')
    expect(source).not.toContain('getSession()')
  })
})
```

**Unit Test Pattern (filesystem scan for compliance):**
```typescript
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'

describe('No hardcoded UI strings (I18N-02)', () => {
  it('no .tsx files contain TODO: i18n comments', () => {
    const files = findTsxFiles(join(process.cwd(), 'app'))
    const violations: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('TODO: i18n')) {
        violations.push(file.replace(process.cwd(), ''))
      }
    }
    expect(violations, `Files still have hardcoded strings:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
```

**E2E Test Pattern (all currently skipped stubs):**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Login flow (AUTH-04)', () => {
  test.skip('login page renders email/password form', async () => {})
  test.skip('valid credentials redirect to home page', async () => {})
  test.skip('invalid credentials show inline error message', async () => {})
})
```

**Patterns:**
- Setup/teardown: Not used; tests are stateless
- Grouping: `describe()` blocks group by feature/module, nested `describe()` for sub-categories
- Both `it()` and `test()` are used interchangeably (implemented tests tend to use `it()`, stub tests use `test()`)
- Custom assertion messages: passed as second argument to `expect()` for violations lists

## Mocking

**Framework:** No mocking framework in use

**Current State:**
- No mocks, spies, or stubs are implemented
- Tests that would require mocking (Supabase client, Stripe API) are marked as `test.skip()` or `it.todo()`
- The only fully implemented tests are pure function tests (`normalizeName`, `passwordValidation`) and filesystem inspection tests (`noHardcodedStrings`, `proxyUsesGetUser`)

**Dependency Injection Pattern for Future Mocking:**
- Webhook handlers in `lib/stripe/webhookHandlers.ts` accept `SupabaseClient` as a parameter, enabling mock injection
- Example: `handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: SupabaseClient)`
- This pattern should be followed for any new functions that need Supabase access and testability

**What to Mock (when implementing skipped tests):**
- `@/lib/supabase/server` `createClient()` - for server action tests
- `@/lib/supabase/admin` `supabaseAdmin` - for admin action tests
- `stripe` SDK methods - for checkout/webhook tests
- `next/navigation` `redirect()` - for action redirect tests
- `next/headers` `headers()` and `cookies()` - for server context tests

**What NOT to Mock:**
- Pure utility functions (`normalizeName`, `validatePasswordLength`)
- Type definitions
- Static configuration

## Fixtures and Factories

**Test Data:**
- No fixture files or factory functions exist
- Test data is defined inline within test cases
- Example: `normalizeName('jose urizar')` uses inline string literals

**Location:**
- No dedicated fixtures directory

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:**
```bash
npx vitest run --coverage    # Not configured, would need @vitest/coverage-v8
```

## Test Types

**Unit Tests (`tests/unit/`):**
- Pure function tests: `normalizeName.test.ts`, `passwordValidation.test.ts` (fully implemented, passing)
- Source-code inspection tests: `proxyUsesGetUser.test.ts`, `noHardcodedStrings.test.ts` (implemented, reads source files to verify conventions)
- Stub/placeholder tests: `billing.test.ts`, `webhookHandler.test.ts`, `checkoutSuccess.test.ts`, `proxyMembership.test.ts` (all `test.skip()` with placeholder assertions)
- TODO tests: `rls-policies.test.ts`, `adminRole.test.ts` (all `it.todo()` with no implementation)

**E2E Tests (`tests/auth/`, `tests/i18n/`):**
- All currently `test.skip()` stubs with empty async bodies
- Organized by feature area: auth flows, i18n locale routing
- Use Playwright `test.describe()` blocks with requirement IDs in names (e.g., `'Login flow (AUTH-04)'`, `'Route protection (SEC-05)'`)

**Integration Tests:**
- Not present as a separate category
- RLS policy tests (`rls-policies.test.ts`) are intended as integration tests against a real Supabase instance but are currently `it.todo()`

## Common Patterns

**Async Testing:**
```typescript
// Not yet used in implemented tests - all implemented tests are synchronous
// Skipped tests indicate the pattern would be:
test.skip('some async operation', async () => {
  // await action(...)
  // expect(result).toBe(...)
})
```

**Error Testing:**
```typescript
it('rejects passwords shorter than 8 characters', () => {
  const result = validatePasswordLength('1234567')
  expect(result).not.toBeNull()
  expect(result).toBe('Password must be at least 8 characters')
})

it('returns null for valid input', () => {
  expect(validatePasswordLength('12345678')).toBeNull()
})
```
- Validation functions return `string | null` (error message or null for valid)
- Tests check both the non-null assertion and the exact error string

**Path Alias in Tests:**
- `@/` alias is configured in `vitest.config.ts` via `resolve.alias`
- Use `@/lib/utils/normalizeName` style imports in test files

## Test Maturity Summary

| Category | Implemented | Skipped/Todo | Total |
|----------|------------|--------------|-------|
| Pure function unit tests | 10 assertions | 0 | 10 |
| Source inspection tests | 2 tests | 0 | 2 |
| Server action unit tests | 0 | 13 | 13 |
| RLS/security integration | 0 | 9 (todo) | 9 |
| E2E auth flows | 0 | 13 (skip) | 13 |
| E2E i18n routing | 0 | 5 (skip) | 5 |

Approximately 12 tests are fully implemented and passing. Approximately 40 tests are stubbed/skipped/todo.

---

*Testing analysis: 2026-03-13*
