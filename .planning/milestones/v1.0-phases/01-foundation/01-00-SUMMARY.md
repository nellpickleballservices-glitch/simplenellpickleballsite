---
phase: 01-foundation
plan: "00"
subsystem: testing
tags: [vitest, playwright, chromium, unit-tests, e2e-tests, wave-0, nyquist]

# Dependency graph
requires: []
provides:
  - vitest.config.ts targeting tests/unit/**/*.test.ts with node environment
  - playwright.config.ts with chromium project, excluding unit tests
  - 6 unit test stubs covering AUTH-02, AUTH-03, AUTH-07, SEC-01, SEC-02, SEC-03, I18N-02
  - 6 e2e test stubs covering AUTH-01, AUTH-04, AUTH-05, AUTH-06, SEC-05, I18N-01
  - Wave 0 Nyquist gate — all automated verify commands in plans 01-01 through 01-04 point to real files
affects: [01-01, 01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added:
    - vitest@4.0.18 (unit test runner)
    - "@vitest/ui@4.0.18 (vitest ui dashboard)"
    - "@playwright/test@1.58.2 (e2e test runner)"
    - "Playwright Chromium browser (headless shell 145.0)"
  patterns:
    - Unit tests in tests/unit/**/*.test.ts, run via npx vitest run
    - E2e tests in tests/auth/**/*.spec.ts and tests/i18n/**/*.spec.ts, run via npx playwright test
    - Playwright config uses testIgnore to exclude unit test directory

key-files:
  created:
    - vitest.config.ts
    - playwright.config.ts
    - package.json
    - .gitignore
    - tests/unit/normalizeName.test.ts
    - tests/unit/passwordValidation.test.ts
    - tests/unit/adminRole.test.ts
    - tests/unit/rls-policies.test.ts
    - tests/unit/proxyUsesGetUser.test.ts
    - tests/unit/noHardcodedStrings.test.ts
    - tests/auth/signup.spec.ts
    - tests/auth/login.spec.ts
    - tests/auth/session-persist.spec.ts
    - tests/auth/password-reset.spec.ts
    - tests/auth/route-protection.spec.ts
    - tests/i18n/locale-routing.spec.ts
  modified: []

key-decisions:
  - "Used test.skip() instead of test.todo() in Playwright specs — test.todo() is not a function in Playwright v1.58; test.skip() achieves the same stub behavior and lists correctly in --list output"
  - "Added testIgnore: ['**/unit/**'] to playwright.config.ts to prevent Playwright from loading Vitest files (Symbol conflict on jest-matchers-object)"
  - "Initialized package.json with type: module (ESM) for Next.js 15+ App Router compatibility"

patterns-established:
  - "Wave 0 pattern: all test stubs created as skipped/todo before any implementation begins"
  - "Playwright e2e stubs use test.skip() with empty async body to pass --list without running"
  - "Vitest unit stubs use it.todo() for pure todos, active test() for source-code checks that self-skip on missing file"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 1 Plan 00: Test Infrastructure and Wave 0 Stubs Summary

**Vitest + Playwright installed with 12 test stubs (todo/skipped) establishing the Nyquist compliance gate for Phase 1**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T02:55:33Z
- **Completed:** 2026-03-08T02:59:35Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Initialized package.json (ESM) and installed Vitest v4 + Playwright v1.58 with Chromium browser
- Created 6 unit test stubs (28 todos/1 pass) — `npx vitest run` exits 0
- Created 6 e2e test stubs (25 tests listed in 6 files) — `npx playwright test --list` exits 0
- Wave 0 Nyquist gate satisfied: every `<automated>` command in plans 01-01 through 01-04 now points to an existing file

## Task Commits

Each task was committed atomically:

1. **Task 1: Install test frameworks and write config files** - `c96bbba` (chore)
2. **Task 2: Create all unit test stubs** - `f0950c5` (test)
3. **Task 3: Create all e2e test stubs** - `9415365` (test)

**Plan metadata:** _(see final commit after state update)_

## Files Created/Modified

- `package.json` - ESM Node.js package, vitest@4 + @playwright/test@1.58 dev dependencies
- `package-lock.json` - Lockfile for reproducible installs
- `.gitignore` - Excludes node_modules, .next, .env, test-results
- `vitest.config.ts` - Vitest config: node environment, tests/unit/**/*.test.ts glob, @ alias
- `playwright.config.ts` - Playwright config: chromium project, testIgnore unit/, no webServer block
- `tests/unit/normalizeName.test.ts` - AUTH-02 stubs (7 todos)
- `tests/unit/passwordValidation.test.ts` - AUTH-03 stubs (5 todos)
- `tests/unit/adminRole.test.ts` - AUTH-07 stubs (3 todos)
- `tests/unit/rls-policies.test.ts` - SEC-01, SEC-03 stubs (9 todos across 3 tables)
- `tests/unit/proxyUsesGetUser.test.ts` - SEC-02 source-check (passes until proxy.ts exists)
- `tests/unit/noHardcodedStrings.test.ts` - I18N-02 stubs (3 todos)
- `tests/auth/signup.spec.ts` - AUTH-01 stubs (6 skipped)
- `tests/auth/login.spec.ts` - AUTH-04 stubs (5 skipped)
- `tests/auth/session-persist.spec.ts` - AUTH-05 stubs (2 skipped)
- `tests/auth/password-reset.spec.ts` - AUTH-06 stubs (3 skipped)
- `tests/auth/route-protection.spec.ts` - SEC-05 stubs (4 skipped)
- `tests/i18n/locale-routing.spec.ts` - I18N-01 stubs (5 skipped)

## Decisions Made

- **test.skip() over test.todo():** Playwright v1.58 does not expose `test.todo()` as a function inside `test.describe()` blocks. Used `test.skip('title', async () => {})` instead — equivalent stub behavior, correctly listed by `--list`.
- **testIgnore in playwright.config.ts:** Without `testIgnore: ['**/unit/**']`, Playwright's bundler loaded Vitest files (both share testDir `./tests`), causing a `Symbol($$jest-matchers-object)` property redefinition conflict. Exclusion resolves this cleanly.
- **ESM module type:** Set `"type": "module"` in package.json for Next.js 15+ App Router compatibility (required for Vitest + TypeScript config to work without transform issues).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Initialized package.json before framework install**
- **Found during:** Task 1 (Install test frameworks)
- **Issue:** Project root had no package.json — `npm install` requires a package manifest to write dependencies into
- **Fix:** Ran `npm init -y` then set `"type": "module"` before installing vitest and @playwright/test
- **Files modified:** package.json
- **Verification:** npm install completed successfully, packages in node_modules
- **Committed in:** c96bbba (Task 1 commit)

**2. [Rule 1 - Bug] Replaced test.todo() with test.skip() in Playwright stubs**
- **Found during:** Task 3 (Create e2e test stubs)
- **Issue:** `npx playwright test --list` exited 1 with "TypeError: test.todo is not a function" — Playwright v1.58 does not support `test.todo()` inside describe blocks
- **Fix:** Replaced all `test.todo('title')` with `test.skip('title', async () => {})` in all 6 e2e spec files
- **Files modified:** tests/auth/signup.spec.ts, tests/auth/login.spec.ts, tests/auth/session-persist.spec.ts, tests/auth/password-reset.spec.ts, tests/auth/route-protection.spec.ts, tests/i18n/locale-routing.spec.ts
- **Verification:** `npx playwright test --list` exits 0, lists 25 tests in 6 files
- **Committed in:** 9415365 (Task 3 commit)

**3. [Rule 1 - Bug] Added testIgnore to playwright.config.ts**
- **Found during:** Task 3 (Create e2e test stubs)
- **Issue:** Playwright bundler loading Vitest files from tests/unit/ caused Symbol($$jest-matchers-object) conflict; also --list initially showed 0 files
- **Fix:** Added `testIgnore: ['**/unit/**']` to playwright.config.ts
- **Files modified:** playwright.config.ts
- **Verification:** No Symbol errors in --list output; 6 spec files listed cleanly
- **Committed in:** 9415365 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correctness — no scope creep. The plan's test stub content and structure is preserved exactly as specified.

## Issues Encountered

- Playwright v1.58 does not implement `test.todo()` as a function inside describe blocks (it is only available as `test.todo('title')` at the top level without a callback — but this is not the same as a describe-nested todo). The plan used `test.todo()` syntax from earlier Playwright versions or from Vitest. Resolved with `test.skip()`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 12 Wave 0 test stubs exist and are correctly registered by their test runners
- `npx vitest run` exits 0 (1 pass, 27 todo)
- `npx playwright test --list` exits 0 (25 tests in 6 files)
- Plans 01-01 through 01-04 can begin — their automated verify commands all point to real files
- No blockers for Phase 1 execution

---
*Phase: 01-foundation*
*Completed: 2026-03-08*

## Self-Check: PASSED

All 16 expected files found. All 3 task commits verified (c96bbba, f0950c5, 9415365).
