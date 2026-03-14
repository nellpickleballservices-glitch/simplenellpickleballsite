---
phase: 04-admin-pricing-panel
plan: 01
subsystem: database, api
tags: [postgres, supabase, rls, server-actions, pricing, validation]

# Dependency graph
requires:
  - phase: 03-signup-country-collection
    provides: country field on users for tourist classification
provides:
  - session_pricing table with per-court day-of-week pricing
  - tourist_surcharge_pct config value in app_config
  - CRUD server actions for pricing management
  - TypeScript pricing types and validation helpers
affects: [04-02-admin-pricing-ui, 05-pricing-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure validation helper extraction for testability]

key-files:
  created:
    - supabase/migrations/0009_session_pricing.sql
    - app/actions/admin/pricing.ts
    - lib/types/pricing.ts
    - lib/utils/pricingValidation.ts
    - tests/unit/pricingActions.test.ts
  modified:
    - app/actions/admin.ts

key-decisions:
  - "Extracted validation helpers to lib/utils/pricingValidation.ts to avoid Supabase client import in unit tests"

patterns-established:
  - "Pure validation extraction: server actions import validators from lib/utils/ to keep tests free of infrastructure deps"

requirements-completed: [PRIC-01, PRIC-03]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 04 Plan 01: Pricing Data Layer Summary

**Session pricing migration with day-of-week per-court pricing, tourist surcharge config, and validated CRUD server actions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T20:20:05Z
- **Completed:** 2026-03-14T20:22:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created session_pricing table with RLS, seeded 21 default rows (3 courts x 7 days at $10)
- Seeded tourist_surcharge_pct (25%) in app_config
- Built 4 server actions: getSessionPricing, upsertSessionPricing, getTouristSurcharge, updateTouristSurcharge
- 16 validation tests pass with zero regressions across 114 total tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and pricing types** - `493605a` (feat)
2. **Task 2: Admin pricing server actions (TDD RED)** - `6fda3a2` (test)
3. **Task 2: Admin pricing server actions (TDD GREEN)** - `a7ebed5` (feat)

## Files Created/Modified
- `supabase/migrations/0009_session_pricing.sql` - Session pricing table, RLS, tourist surcharge seed, default pricing seed
- `lib/types/pricing.ts` - SessionPricing, PricingByDay, CourtPricingGrid types and day name constants
- `lib/utils/pricingValidation.ts` - Pure validation helpers for day-of-week, price, and surcharge
- `app/actions/admin/pricing.ts` - 4 server actions with requireAdmin + supabaseAdmin pattern
- `tests/unit/pricingActions.test.ts` - 16 validation tests
- `app/actions/admin.ts` - Barrel re-export for pricing actions

## Decisions Made
- Extracted validation helpers to `lib/utils/pricingValidation.ts` instead of keeping them in the server action file, to avoid triggering Supabase client initialization during unit tests (same pattern as countryValidation.ts)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Validation helpers extracted to separate module**
- **Found during:** Task 2 (TDD GREEN phase)
- **Issue:** Importing validators from app/actions/admin/pricing.ts triggered supabaseAdmin module-level createClient, which fails without env vars in test
- **Fix:** Moved pure validation functions to lib/utils/pricingValidation.ts, server action imports from there
- **Files modified:** lib/utils/pricingValidation.ts, app/actions/admin/pricing.ts, tests/unit/pricingActions.test.ts
- **Verification:** All 16 tests pass, full suite 114/114 pass
- **Committed in:** a7ebed5

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for testability. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Migration must be run against Supabase via SQL Editor.

## Next Phase Readiness
- Data layer complete, Plan 02 (admin pricing UI) can build on these server actions
- All types and server actions exported via barrel file

---
*Phase: 04-admin-pricing-panel*
*Completed: 2026-03-14*
