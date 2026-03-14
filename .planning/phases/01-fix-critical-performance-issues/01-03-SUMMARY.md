---
phase: 01-fix-critical-performance-issues
plan: 03
subsystem: api
tags: [server-actions, postgres-view, rpc, code-splitting, admin]

# Dependency graph
requires:
  - phase: 01-01
    provides: admin_users_view and batch_reorder_content_blocks RPC
provides:
  - Domain-split admin actions (7 files) with barrel re-export
  - N+1-free user queries via admin_users_view
  - Atomic CMS reorder via batch_reorder_content_blocks RPC
  - 25-per-page server-side admin user pagination
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [domain-split server actions with barrel re-export, Postgres view-based queries replacing auth admin API]

key-files:
  created:
    - app/actions/admin/auth.ts
    - app/actions/admin/stats.ts
    - app/actions/admin/events.ts
    - app/actions/admin/courts.ts
    - app/actions/admin/users.ts
    - app/actions/admin/reservations.ts
    - app/actions/admin/cms.ts
    - tests/unit/adminExports.test.ts
  modified:
    - app/actions/admin.ts

key-decisions:
  - "Barrel re-export preserves all existing imports -- no admin page changes needed"
  - "triggerPasswordResetAction also uses admin_users_view for email lookup (beyond plan scope but consistent)"

patterns-established:
  - "Domain-split server actions: shared guard in auth.ts, domain logic in separate files, barrel re-export for backward compatibility"
  - "View-based queries: use admin_users_view instead of auth admin API for user email/ban lookups"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 01 Plan 03: Admin Monolith Split and N+1 Query Elimination Summary

**Split 902-line admin.ts into 7 domain files, replaced listUsers(1000) N+1 pattern with admin_users_view queries, and batch RPC for CMS reorder**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T07:19:43Z
- **Completed:** 2026-03-14T07:22:54Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Split admin.ts monolith into 7 domain files with barrel re-export for zero-disruption migration
- Eliminated all listUsers(1000) calls and enrichProfilesWithAuthAndMembership by using admin_users_view
- Replaced sequential CMS reorder loop with single batch_reorder_content_blocks RPC call
- 22 filesystem-based tests verifying exports, directives, and query patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Split admin.ts into domain files and rewrite queries** - `f0b6e67` (feat)
2. **Task 2: Create admin exports test** - `aa8d69a` (test)

## Files Created/Modified
- `app/actions/admin/auth.ts` - requireAdmin() guard extracted
- `app/actions/admin/stats.ts` - Dashboard stats action
- `app/actions/admin/events.ts` - Event CRUD actions
- `app/actions/admin/courts.ts` - Court management with maintenance emails
- `app/actions/admin/users.ts` - User management rewritten to use admin_users_view
- `app/actions/admin/reservations.ts` - Reservation management with view-based user search
- `app/actions/admin/cms.ts` - CMS actions with batch reorder RPC
- `app/actions/admin.ts` - Reduced to 12-line barrel re-export
- `tests/unit/adminExports.test.ts` - 22 assertions verifying structure and patterns

## Decisions Made
- Barrel re-export approach means zero changes to any of the 10 admin page files -- all existing imports continue working
- triggerPasswordResetAction also switched to admin_users_view for email lookup (consistent with getUserDetailsAction pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test false positive for listUsers in comment**
- **Found during:** Task 2 (admin exports test)
- **Issue:** Comment in users.ts mentioned "listUsers(1000)" which triggered the "no listUsers" test assertion
- **Fix:** Reworded comment to avoid the literal string while preserving intent
- **Files modified:** app/actions/admin/users.ts
- **Verification:** All 22 tests pass
- **Committed in:** aa8d69a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor comment wording fix. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Database objects (admin_users_view, batch_reorder_content_blocks RPC) were created in Plan 01.

## Next Phase Readiness
- All admin actions split and optimized
- Plan 04 (chat rate limiting) can proceed independently
- No blockers

## Self-Check: PASSED

- [x] app/actions/admin/auth.ts exists
- [x] app/actions/admin/stats.ts exists
- [x] app/actions/admin/events.ts exists
- [x] app/actions/admin/courts.ts exists
- [x] app/actions/admin/users.ts exists
- [x] app/actions/admin/reservations.ts exists
- [x] app/actions/admin/cms.ts exists
- [x] tests/unit/adminExports.test.ts exists
- [x] Commit f0b6e67 (domain split) verified
- [x] Commit aa8d69a (exports test) verified

---
*Phase: 01-fix-critical-performance-issues*
*Completed: 2026-03-14*
