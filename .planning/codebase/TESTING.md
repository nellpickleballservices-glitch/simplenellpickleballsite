# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Unit Test Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `node`
- Globals: enabled (`describe`, `it`, `expect` available without import, though most files import them explicitly)

**E2E Test Runner:**
- Playwright 1.58.x
- Config: `playwright.config.ts`
- Browser: Chromium only
- Base URL: `http://localhost:3000`

**Assertion Library:**
- Vitest built-in `expect` (Chai-compatible)
- Playwright built-in `expect`

**Run Commands:**
```bash
npm test                # Run all unit tests (vitest run)
npm run test:unit       # Run only unit tests (vitest run tests/unit)
npm run test:e2e        # Run E2E tests (playwright test)
```

## Test File Organization

**Location:**
- All tests in a separate `tests/` directory at project root (not co-located with source)
- Unit tests: `tests/unit/`
- Auth E2E tests: `tests/auth/`
- i18n E2E tests: `tests/i18n/`

**Naming:**
- Unit tests: `{camelCaseDescriptor}.test.ts` (e.g., `cookieSigning.test.ts`, `chatRateLimit.test.ts`, `middlewareRouting.test.ts`)
- E2E tests: `{kebab-case-descriptor}.spec.ts` (e.g., `login.spec.ts`, `locale-routing.spec.ts`)

**Structure:**
```
tests/
  unit/
    adminExports.test.ts        # Barrel file re-export verification
    adminRole.test.ts           # Admin role assignment (todo stubs)
    billing.test.ts             # Checkout/portal actions (skipped stubs)
    chatRateLimit.test.ts       # Rate limiting logic (fully implemented)
    checkoutSuccess.test.ts     # Checkout success page (skipped stubs)
    cookieSigning.test.ts       # HMAC cookie signing (fully implemented)
    middlewareRouting.test.ts    # Route classification helpers (fully implemented)
    noHardcodedStrings.test.ts  # i18n enforcement (fully implemented)
    normalizeName.test.ts       # Name normalization (fully implemented)
    passwordValidation.test.ts  # Password validation (fully implemented)
    proxyMembership.test.ts     # Membership gating (skipped stubs)
    proxyUsesGetUser.test.ts    # Security check - source code scan (fully implemented)
    rls-policies.test.ts        # RLS verification (todo stubs)
    webhookHandler.test.ts      # Stripe webhook handler (skipped stubs)
  auth/
    login.spec.ts               # Login flow (skipped stubs)
    password-reset.spec.ts      # Password reset (skipped stubs)
    route-protection.spec.ts    # Route protection (skipped stubs)
    session-persist.spec.ts     # Session persistence (skipped stubs)
    signup.spec.ts              # Signup flow (skipped stubs)
  i18n/
    locale-routing.spec.ts      # Locale routing (skipped stubs)
```

## Test Structure

**Unit Test Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { functionUnderTest } from '@/lib/module'

describe('functionUnderTest', () => {
  it('describes expected behavior for specific input', () => {
    const result = functionUnderTest(input)
    expect(result).toBe(expectedOutput)
  })

  it('handles edge case', () => {
    expect(functionUnderTest(edgeInput)).toBeNull()
  })
})
```

**Patterns:**
- `describe` blocks group by function or feature
- Nested `describe` blocks for sub-categories (see `webhookHandler.test.ts`)
- `it`/`test` descriptions are concise and specific: `'rejects passwords shorter than 8 characters'`
- No `beforeAll`/`afterAll` unless module requires env setup (see `cookieSigning.test.ts`)
- `beforeEach` for mock reset and fake timer setup

**Stub Patterns (three kinds):**
- `test.skip('description', () => { expect(true).toBe(true) })` - Placeholder with no-op body, skipped
- `it.todo('description')` - Pure stub with no body (used in `adminRole.test.ts`, `rls-policies.test.ts`)
- `test.skip('description', async () => {})` - Async placeholder, skipped (used in Playwright E2E tests)

## Mocking

**Framework:** Vitest built-in `vi`

**Environment Variable Mocking:**
```typescript
// Set env BEFORE importing the module under test
vi.stubEnv('MEMBERSHIP_COOKIE_SECRET', 'test-secret-key-for-hmac-signing-32b')

// Dynamic import after env is set
let sign: (payload: string) => Promise<string>
beforeAll(async () => {
  const mod = await import('@/lib/middleware/cookie-signing')
  sign = mod.sign
})
```

**Supabase Client Mocking (chainable query builder):**
```typescript
function createMockSupabase() {
  const mockMaybeSingle = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdateEq = vi.fn()
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
  const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }))

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockSelect, mockEq, mockMaybeSingle, mockInsert, mockUpdate, mockUpdateEq },
  }
}
```
- Key pattern: mirror Supabase's chainable API (`.from().select().eq().maybeSingle()`)
- Expose `_mocks` object for assertion access
- Cast to `as any` when passing to function under test

**NextRequest/NextResponse Cookie Mocking:**
```typescript
function createMockRequest(cookies: Record<string, string> = {}) {
  return {
    cookies: {
      get(name: string) {
        return cookies[name] ? { value: cookies[name] } : undefined
      },
    },
  } as any
}

function createMockResponse() {
  const cookieStore: Record<string, { value: string; options: any }> = {}
  return {
    cookies: {
      set(name: string, value: string, options: any) {
        cookieStore[name] = { value, options }
      },
    },
    _cookieStore: cookieStore,
  } as any
}
```

**Fake Timers:**
```typescript
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-14T12:00:00Z'))
})
```

**What to Mock:**
- Supabase client (database calls)
- Environment variables (via `vi.stubEnv`)
- System time (via `vi.useFakeTimers` + `vi.setSystemTime`)
- NextRequest/NextResponse cookie APIs

**What NOT to Mock:**
- Pure utility functions (`normalizeName`, `validatePassword*`) -- test directly
- Route helper functions (`isProtectedRoute`, etc.) -- test directly
- Crypto operations (`sign`, `verify` in cookie-signing) -- test with real Web Crypto API

## Source Code Scanning Tests

A unique pattern in this codebase: some unit tests read source files directly with `fs.readFileSync` to verify structural invariants rather than testing runtime behavior.

**Pattern: Verify barrel file completeness**
```typescript
// tests/unit/adminExports.test.ts
const barrelContent = read('app/actions/admin.ts')
const expectedFunctions = ['requireAdmin', 'getAdminStatsAction', ...]

it('barrel file re-exports all action functions', () => {
  for (const fn of expectedFunctions) {
    expect(barrelContent, `Missing re-export for ${fn}`).toContain(fn)
  }
})
```

**Pattern: Verify security constraints in source code**
```typescript
// tests/unit/proxyUsesGetUser.test.ts
const source = readFileSync(proxyPath, 'utf-8')
expect(source).toContain('getUser()')
expect(source).not.toContain('getSession()')
```

**Pattern: Enforce i18n compliance across all .tsx files**
```typescript
// tests/unit/noHardcodedStrings.test.ts
// Recursively scans all .tsx files for 'TODO: i18n' comments
for (const file of tsxFiles) {
  const content = readFileSync(file, 'utf-8')
  if (content.includes('TODO: i18n')) {
    violations.push(file)
  }
}
expect(violations).toHaveLength(0)
```

**Pattern: Verify server action conventions**
```typescript
// tests/unit/adminExports.test.ts
for (const file of domainFiles) {
  it(`${file} has 'use server' directive`, () => {
    const content = read(file)
    expect(content.startsWith("'use server'")).toBe(true)
  })
}
```

## Fixtures and Factories

**Test Data:**
- Inline test data within each test case (no shared fixture files)
- Mock Supabase responses created per-test via `mockResolvedValue`:
```typescript
supabase._mocks.mockMaybeSingle.mockResolvedValue({
  data: {
    message_count: 5,
    window_start: new Date('2026-03-14T11:30:00Z').toISOString(),
  },
  error: null,
})
```

**Location:**
- No dedicated fixtures directory
- Mock helper functions defined at the top of each test file (e.g., `createMockSupabase`, `createMockRequest`, `createMockResponse`)

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**View Coverage:**
```bash
npx vitest run --coverage    # Not configured in scripts but works via CLI
```

## Test Types

**Unit Tests (Vitest):**
- Test pure utility functions directly (normalizeName, passwordValidation, route-helpers)
- Test library logic with mocked dependencies (rate-limit with mocked Supabase)
- Test crypto/security functions with real Web Crypto API (cookie-signing)
- Source-code scanning tests for structural invariants (exports, directives, security patterns)
- Many stub/placeholder tests (`test.skip`, `it.todo`) for features not yet tested: billing, webhooks, RLS, admin role

**E2E Tests (Playwright):**
- All currently skipped stubs (no implemented E2E tests)
- Organized by feature: `tests/auth/` and `tests/i18n/`
- Target `http://localhost:3000` (requires running dev server)
- Chromium only, parallel execution enabled
- Trace capture on first retry

## Common Patterns

**Async Testing:**
```typescript
it('allows first message and inserts a new row', async () => {
  supabase._mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  supabase._mocks.mockInsert.mockResolvedValue({ error: null })

  const result = await checkRateLimit(supabase as any, 'session-1')

  expect(result).toEqual({ allowed: true })
  expect(supabase._mocks.mockInsert).toHaveBeenCalledWith({
    session_id: 'session-1',
    message_count: 1,
    window_start: new Date('2026-03-14T12:00:00Z').toISOString(),
  })
})
```

**Error Testing:**
```typescript
it('rejects passwords shorter than 8 characters', () => {
  const result = validatePasswordLength('1234567')
  expect(result).not.toBeNull()
  expect(result).toBe('Password must be at least 8 characters')
})
```

**Null/Valid Return Testing:**
```typescript
it('returns null for a valid name', () => {
  expect(validateName('jose')).toBeNull()
})
```

**Cookie Security Testing:**
```typescript
it('sets httpOnly, secure, sameSite=lax, maxAge=300, path=/', async () => {
  const res = createMockResponse()
  const data: MembershipCache = { active: true, planType: 'basic', cachedAt: Date.now() }
  await setMembershipCookie(res, data)

  const cookie = res._cookieStore['nell_membership_cache']
  expect(cookie.options.httpOnly).toBe(true)
  expect(cookie.options.secure).toBe(true)
  expect(cookie.options.sameSite).toBe('lax')
  expect(cookie.options.maxAge).toBe(300)
})
```

## Test Gaps and Stub Status

**Fully implemented unit tests (8 files):**
- `cookieSigning.test.ts` - HMAC sign/verify, cookie get/set
- `chatRateLimit.test.ts` - Rate limit logic with mocked Supabase
- `middlewareRouting.test.ts` - Route classification helpers
- `normalizeName.test.ts` - Name normalization and validation
- `passwordValidation.test.ts` - Password length and match validation
- `noHardcodedStrings.test.ts` - i18n compliance scan
- `proxyUsesGetUser.test.ts` - Security source code check
- `adminExports.test.ts` - Barrel file and convention verification

**Stub-only tests (6 files, all `test.skip` or `it.todo`):**
- `billing.test.ts` - Checkout and portal session actions
- `webhookHandler.test.ts` - Stripe webhook event handling
- `checkoutSuccess.test.ts` - Checkout success page states
- `proxyMembership.test.ts` - Membership gating logic
- `adminRole.test.ts` - Admin role assignment
- `rls-policies.test.ts` - Row Level Security verification

**E2E tests (all stubs, 6 files):**
- `tests/auth/login.spec.ts`
- `tests/auth/signup.spec.ts`
- `tests/auth/password-reset.spec.ts`
- `tests/auth/route-protection.spec.ts`
- `tests/auth/session-persist.spec.ts`
- `tests/i18n/locale-routing.spec.ts`

## Writing New Tests

**For a new unit test:**
1. Create `tests/unit/{camelCaseDescriptor}.test.ts`
2. Import from vitest: `import { describe, it, expect } from 'vitest'`
3. Import module under test via `@/` alias: `import { fn } from '@/lib/module'`
4. Group with `describe`, name tests with `it` or `test`

**For a new E2E test:**
1. Create `tests/{feature}/{kebab-case}.spec.ts`
2. Import from Playwright: `import { test, expect } from '@playwright/test'`
3. Use `test.describe` for grouping

**For mocking Supabase in new tests:**
- Follow the chainable mock pattern from `chatRateLimit.test.ts`
- Mirror the exact chain your code uses (e.g., `.from().select().eq().single()`)

---

*Testing analysis: 2026-03-14*
