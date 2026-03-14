---
phase: 01-fix-critical-performance-issues
plan: 01
subsystem: database
tags: [postgres, hmac, web-crypto, pg_cron, migration, cookie-signing]

# Dependency graph
requires: []
provides:
  - admin_users_view for admin query optimization
  - batch_reorder_content_blocks RPC for atomic CMS reordering
  - chat_rate_limits table for persistent rate limiting
  - Composite index on reservations(court_id, starts_at)
  - pg_cron cleanup job for stale rate limit rows
  - Cookie signing utility (setMembershipCookie, getMembershipFromCookie)
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [HMAC-SHA256 via Web Crypto API for Edge Runtime, pg_cron for table maintenance]

key-files:
  created:
    - supabase/migrations/0007_admin_view_rpc_ratelimit_index.sql
    - lib/middleware/cookie-signing.ts
    - tests/unit/cookieSigning.test.ts
  modified: []

key-decisions:
  - "Used plain view (not security definer function) for admin_users_view since all queries go through service_role client"
  - "Used Web Crypto API crypto.subtle for HMAC signing (Edge Runtime compatible, no Node.js crypto import)"

patterns-established:
  - "HMAC cookie signing: sign/verify via crypto.subtle, payload.signature format"
  - "pg_cron cleanup: hourly DELETE of stale rows older than 2 hours"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 01 Plan 01: Foundation Database Objects and Cookie Signing Summary

**Postgres migration with admin view, batch reorder RPC, rate limit table, reservation index, pg_cron cleanup job, plus HMAC-SHA256 cookie signing utility for Edge Runtime**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T07:15:16Z
- **Completed:** 2026-03-14T07:17:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created single migration with all 5 database objects needed by subsequent plans
- Implemented Edge Runtime-compatible cookie signing with HMAC-SHA256 via Web Crypto API
- 9 unit tests covering sign/verify, tamper detection, TTL expiry, and cookie get/set

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Postgres migration** - `60838e2` (feat)
2. **Task 2: Cookie signing - RED** - `0674e9f` (test)
3. **Task 2: Cookie signing - GREEN** - `83bd0a8` (feat)

## Files Created/Modified
- `supabase/migrations/0007_admin_view_rpc_ratelimit_index.sql` - Migration with admin_users_view, batch_reorder_content_blocks RPC, chat_rate_limits table, composite reservation index, pg_cron cleanup job
- `lib/middleware/cookie-signing.ts` - HMAC-SHA256 cookie signing with setMembershipCookie and getMembershipFromCookie exports
- `tests/unit/cookieSigning.test.ts` - 9 unit tests for cookie signing utility

## Decisions Made
- Used plain view for admin_users_view (not security definer function) since all queries go through supabaseAdmin service_role client which bypasses RLS anyway
- Used Web Crypto API (crypto.subtle) for HMAC signing -- Edge Runtime compatible, no Node.js crypto import needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Supabase CLI lint unavailable (no local Postgres running) -- SQL syntax verified by manual review against existing migration patterns

## User Setup Required
- Add `MEMBERSHIP_COOKIE_SECRET` environment variable (generate with `openssl rand -base64 32`)
- Run migration 0007 in Supabase Dashboard SQL Editor

## Next Phase Readiness
- All database objects ready for Plans 02-04 (middleware optimization, admin split, chat rate limiter)
- Cookie signing utility ready for Plan 02 (middleware membership caching)
- No blockers

## Self-Check: PASSED

- [x] supabase/migrations/0007_admin_view_rpc_ratelimit_index.sql exists
- [x] lib/middleware/cookie-signing.ts exists
- [x] tests/unit/cookieSigning.test.ts exists
- [x] Commit 60838e2 (migration) verified
- [x] Commit 0674e9f (test RED) verified
- [x] Commit 83bd0a8 (implementation GREEN) verified

---
*Phase: 01-fix-critical-performance-issues*
*Completed: 2026-03-14*
