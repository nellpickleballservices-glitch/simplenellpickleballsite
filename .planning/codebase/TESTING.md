# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Unit Test Runner:**
- Vitest v4.0.18
- Config: `vitest.config.ts`
- Environment: `node`
- Globals enabled (`describe`, `it`, `test`, `expect` available without import, though most files import them explicitly)

**E2E Test Runner:**
- Playwright v1.58.2
- Config: `playwright.config.ts`
- Browser: Chromium only
- Base URL: `http://localhost:3000`

**Assertion Library:**
- Vitest built-in `expect` (unit tests)
- Playwright built-in `expect` (E2E tests)

**Run Commands:**
```bash
npm test                  # Run all unit tests (vitest run)
npm run test:unit         # Run unit tests only (vitest run tests/unit)
npm run test:e2e          # Run E2E tests (playwright test)
```

## Test File Organization

**Location:**
- All tests in a separate `tests/` directory (not co-located with source)

**Structure:**
```
tests/
├── unit/                           # Vitest unit tests
│   ├── passwordValidation.test.ts  # Pure function tests
│   ├── normalizeName.test.ts       # Pure function tests
│   ├── noHardcodedStrings.test.ts  # Codebase lint/guard test
│   ├── proxyUsesGetUser.test.ts    # Source code security check
│   ├── billing.test.ts             # Stubbed/skipped tests
│   ├── webhookHandler.test.ts      # Stubbed/skipped tests
│   ├── checkoutSuccess.test.ts     # Stubbed/skipped tests
│   ├── rls-policies.test.ts        # TODO placeholders
│   ├── adminRole.test.ts           # TODO placeholders
│   └── proxyMembership.test.ts     # Stubbed/skipped tests
├── auth/                           # Playwright E2E tests
│   ├── login.spec.ts
│   ├── signup.spec.ts
│   ├── session-persist.spec.ts
│   ├── route-protection.spec.ts
│   └── password-reset.spec.ts
└── i18n/                           # Playwright E2E tests
    └── locale-routing.spec.ts
```

**Naming:**
- Unit tests: `*.test.ts` (Vitest convention)
- E2E tests: `*.spec.ts` (Playwright convention)
- Test file names match the feature or module they test (e.g., `passwordValidation.test.ts` tests `lib/utils/passwordValidation.ts`)

## Test Structure

**Unit Test Pattern (implemented):**
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
})
```

**Unit Test Pattern (stubbed - majority of tests):**
```typescript
import { describe, test, expect } from 'vitest'

describe('createCheckoutSessionAction', () => {
  test.skip('passes correct price ID for VIP plan', () => {
    expect(true).toBe(true)
  })
})
```

**Unit Test Pattern (TODO placeholders):**
```typescript
describe('RLS policies', () => {
  describe('profiles table', () => {
    it.todo('RLS is enabled on profiles table')
    it.todo('user can read their own profile row')
  })
})
```

**E2E Test Pattern (all skipped):**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Login flow (AUTH-04)', () => {
  test.skip('login page renders email/password form', async () => {})
  test.skip('valid credentials redirect to home page', async () => {})
})
```

**Patterns:**
- Use `describe()` for grouping by feature/function
- Use nested `describe()` for sub-categories (e.g., webhook event types)
- Use `it()` or `test()` interchangeably (codebase uses both)
- Test descriptions reference requirement IDs in parentheses: `'Route protection (SEC-05)'`, `'Locale routing (I18N-01)'`
- Setup/teardown hooks: not currently used

## Test Categories

**1. Pure Function Tests (IMPLEMENTED):**
- Files: `tests/unit/passwordValidation.test.ts`, `tests/unit/normalizeName.test.ts`
- These are the only tests with actual assertions that run
- Test pure utility functions from `lib/utils/`
- Pattern: import function, call with input, assert output

**2. Source Code Guard Tests (IMPLEMENTED):**
- Files: `tests/unit/noHardcodedStrings.test.ts`, `tests/unit/proxyUsesGetUser.test.ts`
- Read source files with `fs.readFileSync` and assert patterns
- `noHardcodedStrings.test.ts`: Recursively scans all `.tsx` files for `TODO: i18n` comments
- `proxyUsesGetUser.test.ts`: Verifies `proxy.ts` uses `getUser()` not `getSession()` (security invariant)
- Pattern: filesystem scanning + string assertions

**3. Stubbed/Skipped Tests (NOT IMPLEMENTED):**
- Files: `billing.test.ts`, `webhookHandler.test.ts`, `checkoutSuccess.test.ts`, `proxyMembership.test.ts`
- All use `test.skip()` with placeholder `expect(true).toBe(true)`
- Serve as documentation of what should be tested
- Organized by feature with descriptive test names

**4. TODO Placeholder Tests (NOT IMPLEMENTED):**
- Files: `rls-policies.test.ts`, `adminRole.test.ts`
- Use `it.todo()` — no test body at all
- Document future integration tests requiring Supabase test client

**5. E2E Tests (NOT IMPLEMENTED):**
- Files: `tests/auth/*.spec.ts`, `tests/i18n/*.spec.ts`
- All use `test.skip()` with empty async bodies
- Test descriptions document expected user flows

## Mocking

**Framework:** None currently used

**Current state:** No mocking patterns are established. The codebase has no examples of:
- Vitest `vi.mock()` or `vi.fn()`
- Module mocking for Supabase or Stripe clients
- Test doubles or fixtures

**What would need mocking (for stubbed tests):**
- `@/lib/supabase/server` — mock `createClient()` return
- `@/lib/stripe` — mock Stripe API calls
- `@supabase/ssr` — mock cookie-based auth
- `next/navigation` — mock `redirect()`

**Recommendation for future tests:**
```typescript
// Pattern to follow when implementing stubbed tests:
import { vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn() })),
  })),
}))
```

## Fixtures and Factories

**Test Data:**
- No fixtures, factories, or shared test data exist
- Pure function tests use inline test data
- No `__fixtures__/`, `__mocks__/`, or shared test utility directory

**Location:**
- Not applicable — no fixtures exist

## Coverage

**Requirements:** None enforced

**No coverage configuration:**
- No `coverage` key in `vitest.config.ts`
- No coverage script in `package.json`
- `@vitest/ui` is installed as a dev dependency but no UI script configured

**To add coverage:**
```bash
npx vitest run --coverage    # Requires @vitest/coverage-v8 or similar
```

## Vitest Configuration Details

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- Only `tests/unit/**/*.test.ts` included (E2E tests excluded via pattern)
- Path alias `@` resolved to project root (matches `tsconfig.json`)
- Node environment (no jsdom/happy-dom — no component rendering tests)

## Playwright Configuration Details

**`playwright.config.ts`:**
```typescript
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/unit/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- Excludes `unit/` directory (handles E2E only)
- Chromium-only testing (no Firefox/Safari)
- CI-aware: retries twice, single worker in CI
- Trace capture on first retry for debugging

## Test Implementation Status Summary

| Category | Files | Implemented | Status |
|----------|-------|-------------|--------|
| Pure function tests | 2 | YES | Running, passing |
| Source code guards | 2 | YES | Running, passing |
| Server Action tests | 4 | NO | Stubbed with `test.skip` |
| RLS/Auth integration | 2 | NO | `it.todo` placeholders |
| Auth E2E flows | 5 | NO | Stubbed with `test.skip` |
| i18n E2E flows | 1 | NO | Stubbed with `test.skip` |

**Total: 16 test files, 4 implemented, 12 stubbed/placeholder**

## Common Patterns

**Async Testing:**
- Not yet established (no async tests implemented)
- Stubbed tests suggest future pattern: Server Action tests will need async/await with mocked Supabase

**Error Testing:**
```typescript
// Pure function error testing pattern (from passwordValidation.test.ts):
it('rejects passwords shorter than 8 characters', () => {
  const result = validatePasswordLength('1234567')
  expect(result).not.toBeNull()
  expect(result).toBe('Password must be at least 8 characters')
})
```

**Filesystem-based Testing:**
```typescript
// Source code guard pattern (from noHardcodedStrings.test.ts):
import { readdirSync, readFileSync } from 'fs'

function findTsxFiles(dir: string): string[] {
  // Recursive directory scan
}

it('no .tsx files contain TODO: i18n comments', () => {
  const files = findTsxFiles(join(process.cwd(), 'app'))
  const violations: string[] = []
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    if (content.includes('TODO: i18n')) {
      violations.push(file.replace(process.cwd(), ''))
    }
  }
  expect(violations).toHaveLength(0)
})
```

## Adding New Tests

**New unit test:**
1. Create `tests/unit/<feature>.test.ts`
2. Import from vitest: `import { describe, it, expect } from 'vitest'`
3. Import module under test using `@/` alias
4. Follow `describe`/`it` nesting pattern

**New E2E test:**
1. Create `tests/<feature>/<scenario>.spec.ts`
2. Import from Playwright: `import { test, expect } from '@playwright/test'`
3. Use `test.describe()` with requirement ID reference
4. Ensure dev server running on `localhost:3000`

---

*Testing analysis: 2026-03-14*
