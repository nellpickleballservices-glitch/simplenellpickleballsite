---
phase: 05-reservation-flow-integration
plan: 03
subsystem: ui
tags: [typescript, react, pricing-display, server-actions, i18n]

requires:
  - phase: 05-reservation-flow-integration
    provides: calculateSessionPrice, isTourist from Plan 01; getCourtAvailability returning pricing data from Plan 02
provides:
  - CourtCard with dynamic server-computed pricing display
  - getAvailabilityAction returning displayPriceCents for date-change updates
  - Server-side price computation in page.tsx SSR for initial render
affects: [05-04]

tech-stack:
  added: []
  patterns: [server-side price computation propagated to client via displayPriceCents, onPriceChange callback for date tab switching]

key-files:
  created: []
  modified:
    - app/[locale]/(member)/reservations/actions.ts
    - app/[locale]/(member)/reservations/CourtCard.tsx
    - app/[locale]/(member)/reservations/page.tsx
    - app/[locale]/(member)/reservations/TimeSlotGrid.tsx
    - lib/types/reservations.ts

key-decisions:
  - "All price calculation server-side only -- CourtCard never imports calculateSessionPrice (PRIC-05)"
  - "displayPriceCents computed in getAvailabilityAction using user profile country + membership status"
  - "onPriceChange callback propagates price updates from TimeSlotGrid date tab switches to CourtCard"

patterns-established:
  - "Server-computed displayPriceCents pattern: server action returns final price, client only displays"
  - "Price update on date change via onPriceChange callback from TimeSlotGrid to CourtCard"

requirements-completed: [RESV-01]

duration: 2min
completed: 2026-03-15
---

# Phase 5 Plan 3: CourtCard Dynamic Pricing Display Summary

**CourtCard displays server-computed dynamic pricing per PRIC-05 -- members see Free, non-members see day-of-week price with tourist surcharge, price updates on date tab switch**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T04:43:48Z
- **Completed:** 2026-03-15T04:46:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- getAvailabilityAction now computes displayPriceCents server-side using calculateSessionPrice + isTourist, returning it alongside timeSlots and availabilitySummary
- page.tsx SSR computes initial displayPriceCents for each court using user country and membership status
- CourtCard displays server-computed price with no client-side pricing imports (PRIC-05 compliant)
- Price updates dynamically when user switches date tabs via onPriceChange callback
- i18n keys pricingFree and pricingSession verified in both en.json and es.json

## Task Commits

Both tasks were already implemented in a prior commit during Plan 04 execution:

1. **Task 1: Server-side price computation and CourtCard display** - `5287457` (feat, committed with 05-04)
2. **Task 2: i18n keys for pricing display** - Already present (pre-existing keys)

**Plan metadata:** (pending)

## Files Created/Modified
- `app/[locale]/(member)/reservations/actions.ts` - getAvailabilityAction computes and returns displayPriceCents server-side
- `app/[locale]/(member)/reservations/CourtCard.tsx` - Displays server-computed pricing, no pricing imports
- `app/[locale]/(member)/reservations/page.tsx` - SSR computes initial displayPriceCents per court
- `app/[locale]/(member)/reservations/TimeSlotGrid.tsx` - Accepts and calls onPriceChange callback on date switch
- `lib/types/reservations.ts` - Added displayPriceCents to CourtWithConfig interface

## Decisions Made
- All price calculation server-side only -- CourtCard never imports calculateSessionPrice (PRIC-05 compliance)
- displayPriceCents computed in getAvailabilityAction by fetching user profile country and checking membership status
- onPriceChange callback added to propagate price updates from TimeSlotGrid date tab switches to CourtCard state

## Deviations from Plan

None - plan executed exactly as written. Implementation was completed as part of the Plan 04 commit (5287457) which bundled UI pricing display changes alongside the admin walk-in form work.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CourtCard fully displays dynamic pricing for all user types (members, locals, tourists)
- Price updates on date change via server action
- Ready for Plan 04 (admin walk-in tourist toggle) which is also already implemented
- Zero new dependencies added

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit 5287457 verified in git log
- TypeScript compiles clean (npx tsc --noEmit)
- CourtCard has zero imports of calculateSessionPrice/isTourist (PRIC-05)
- i18n keys pricingFree and pricingSession verified in both en.json and es.json

---
*Phase: 05-reservation-flow-integration*
*Completed: 2026-03-15*
