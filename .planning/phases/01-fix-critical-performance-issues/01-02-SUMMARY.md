---
phase: 01-fix-critical-performance-issues
plan: 02
subsystem: middleware
tags: [next-middleware, supabase-auth, cookie-cache, hmac, route-scoping, next-intl]

# Dependency graph
requires:
  - phase: 01-01
    provides: Cookie signing utility (setMembershipCookie, getMembershipFromCookie)
provides:
  - Route-scoped auth middleware (public routes skip Supabase)
  - Membership cookie caching with 5-minute TTL
  - Route classification helpers (isProtectedRoute, isAuthRedirectRoute, needsAuthCheck, isReservationRoute)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [Route-scoped middleware with conditional Supabase client creation, Signed cookie membership cache]

key-files:
  created:
    - lib/middleware/route-helpers.ts
    - tests/unit/middlewareRouting.test.ts
  modified:
    - middleware.ts

key-decisions:
  - "Used regex locale stripping for auth redirect matching to prevent false positives on nested routes like /member/login"
  - "Membership cache cookie read before DB query -- DB only on cache miss/expiry"

patterns-established:
  - "Route classification: extract pure helper functions for testability, import in middleware"
  - "Conditional Supabase client: only create createServerClient on protected routes"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 01 Plan 02: Middleware Route-Scoped Auth and Membership Caching Summary

**Route-scoped middleware eliminating getUser() on public routes, with signed cookie membership cache (5-min TTL) and auth redirect for logged-in users**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T07:19:45Z
- **Completed:** 2026-03-14T07:22:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Public routes (/, /about, /learn, /events, /contact, /pricing) now have zero Supabase auth overhead
- Membership status cached in HMAC-signed cookie with 5-minute TTL, eliminating ~95% of membership DB queries
- Logged-in users visiting /login or /signup are redirected to /member/dashboard
- 18 unit tests covering route classification with locale-prefix variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Route classification helpers + tests (TDD)** - `cbfb0e7` (feat)
2. **Task 2: Rewrite middleware with route-scoped auth** - `94636cf` (feat)

## Files Created/Modified
- `lib/middleware/route-helpers.ts` - Pure route classification functions (isProtectedRoute, isAuthRedirectRoute, needsAuthCheck, isReservationRoute)
- `tests/unit/middlewareRouting.test.ts` - 18 unit tests for route classification
- `middleware.ts` - Rewritten with conditional auth, membership caching, auth redirects

## Decisions Made
- Used regex-based locale stripping (`/^\/[a-z]{2}(?=\/|$)/`) in isAuthRedirectRoute to prevent false positives on nested routes (e.g., /member/login should not trigger auth redirect)
- Membership cache is checked before DB query; DB only queried on cache miss or expiry
- Membership query now selects `status, plan` (not just `status`) to cache plan type in the cookie

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed isAuthRedirectRoute specificity**
- **Found during:** Task 1 (route classification tests)
- **Issue:** Plan's `endsWith()` pattern would match /member/login as an auth redirect route
- **Fix:** Used regex locale stripping + exact match instead of endsWith
- **Files modified:** lib/middleware/route-helpers.ts
- **Verification:** Test for /member/login returning false passes
- **Committed in:** cbfb0e7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was necessary for correct route classification. No scope creep.

## Issues Encountered
None

## User Setup Required
None - MEMBERSHIP_COOKIE_SECRET env var was already documented in Plan 01.

## Next Phase Readiness
- Middleware optimization complete, ready for Plans 03-04 (admin split, chat rate limiter)
- All 48 tests pass, TypeScript compiles clean
- No blockers

## Self-Check: PASSED

- [x] lib/middleware/route-helpers.ts exists
- [x] tests/unit/middlewareRouting.test.ts exists
- [x] middleware.ts modified
- [x] Commit cbfb0e7 (route helpers + tests) verified
- [x] Commit 94636cf (middleware rewrite) verified

---
*Phase: 01-fix-critical-performance-issues*
*Completed: 2026-03-14*
