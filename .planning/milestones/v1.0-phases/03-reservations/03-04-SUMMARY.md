---
phase: 03-reservations
plan: "04"
subsystem: ui
tags: [react, useActionState, server-actions, reservations, dashboard, stripe, cancellation, i18n]

requires:
  - phase: 03-reservations
    provides: "Court diagram modal, time slot grid, court cards (03-02) and Server Actions for booking/cancel/payment (03-03)"
provides:
  - "ReservationForm component wiring court diagram to createReservationAction via useActionState"
  - "PaymentPanel component with Stripe and cash payment options for non-members"
  - "ReservationsTable component showing upcoming reservations with cancel and pay-now actions"
  - "CancelDialog modal with useActionState calling cancelReservationAction"
  - "Dashboard page with membership card + reservations table + settings link"
  - "Stripe payment return handling (paid/cancelled query params)"
affects: [03-reservations]

tech-stack:
  added: []
  patterns: [useActionState-form-binding, inline-reservation-form, responsive-table-card-layout]

key-files:
  created:
    - app/[locale]/(member)/reservations/ReservationForm.tsx
    - app/[locale]/(member)/reservations/PaymentPanel.tsx
    - app/[locale]/(member)/dashboard/ReservationsTable.tsx
    - app/[locale]/(member)/dashboard/CancelDialog.tsx
  modified:
    - app/[locale]/(member)/reservations/CourtDiagram.tsx
    - app/[locale]/(member)/reservations/TimeSlotGrid.tsx
    - app/[locale]/(member)/reservations/page.tsx
    - app/[locale]/(member)/dashboard/page.tsx
    - messages/en.json
    - messages/es.json

key-decisions:
  - "ReservationForm as separate component composable into both CourtDiagram (open play) and TimeSlotGrid (full court) contexts"
  - "CourtDiagram simplified to remove onBookingRequest callback, replaced with embedded ReservationForm for direct Server Action submission"
  - "Dashboard reservations table uses responsive card/table layout (cards on mobile, table on desktop)"

patterns-established:
  - "Inline form pattern: ReservationForm toggles open below time slot row for full court booking"
  - "Payment return pattern: page.tsx reads searchParams for Stripe redirect status banners"
  - "Dashboard namespace: Dashboard i18n keys separate from Billing for reservations-specific text"

requirements-completed: [DASH-01, DASH-02, DASH-03]

duration: 4min
completed: 2026-03-08
---

# Phase 3 Plan 04: Booking UI Wiring + Dashboard Reservations Summary

**ReservationForm and PaymentPanel wired to Server Actions via useActionState, dashboard reservations table with cancellation dialog, Stripe payment return banners**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T17:00:50Z
- **Completed:** 2026-03-08T17:05:15Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- ReservationForm component using React 19 useActionState to submit bookings via createReservationAction, with member success state and non-member PaymentPanel transition
- PaymentPanel with Stripe card payment (createSessionPaymentAction) and cash-at-location option for non-members
- CourtDiagram and TimeSlotGrid updated to embed ReservationForm directly (replacing placeholder console.log callback)
- Dashboard page now shows membership card plus upcoming reservations table with cancellation and pay-now actions
- CancelDialog modal with useActionState calling cancelReservationAction, showing reservation details and error handling
- Stripe payment return handling on reservations page with success/cancelled banners
- Full bilingual i18n support for all new UI text (en/es)

## Task Commits

Each task was committed atomically:

1. **Task 1: ReservationForm + PaymentPanel components** - `dda459a` (feat)
2. **Task 2: Wire ReservationForm into CourtDiagram + update page.tsx** - `c38ee08` (feat)
3. **Task 3: Dashboard reservations table + cancellation dialog** - `8bed502` (feat)

## Files Created/Modified
- `app/[locale]/(member)/reservations/ReservationForm.tsx` - Client component form with useActionState calling createReservationAction, hidden fields, VIP guest input, success/error states
- `app/[locale]/(member)/reservations/PaymentPanel.tsx` - Client component with Stripe payment form and cash option for non-members
- `app/[locale]/(member)/dashboard/ReservationsTable.tsx` - Responsive table (mobile cards / desktop table) showing upcoming reservations with cancel and pay-now actions
- `app/[locale]/(member)/dashboard/CancelDialog.tsx` - Modal confirmation dialog with useActionState calling cancelReservationAction
- `app/[locale]/(member)/reservations/CourtDiagram.tsx` - Updated to embed ReservationForm on spot selection, removed onBookingRequest callback
- `app/[locale]/(member)/reservations/TimeSlotGrid.tsx` - Updated with inline ReservationForm for full court booking, removed placeholder handler
- `app/[locale]/(member)/reservations/page.tsx` - Added searchParams handling for Stripe return banners (paid/cancelled)
- `app/[locale]/(member)/dashboard/page.tsx` - Added reservations fetch, cancellation window config, ReservationsTable rendering, settings link
- `messages/en.json` - Added Reservations payment keys, Dashboard namespace with table/cancel/status keys
- `messages/es.json` - Added Spanish translations for all new keys

## Decisions Made
- ReservationForm designed as a standalone composable component that can be embedded in different contexts (CourtDiagram modal for open play spots, inline below time slot rows for full court)
- CourtDiagram simplified by removing the onBookingRequest callback pattern and replacing with direct form submission via embedded ReservationForm
- Dashboard reservations table uses a responsive dual layout (mobile cards, desktop table) rather than a single table that breaks on small screens
- Dashboard namespace created for i18n to keep reservation management keys separate from Billing and Reservations namespaces

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors (proxy.ts cookie type mismatch, Deno edge function types, settings page missing modules) unrelated to plan changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- End-to-end booking flow complete: select spot/court -> reserve -> member confirmation or non-member payment panel -> Stripe checkout or cash
- Dashboard shows upcoming reservations with cancellation workflow
- Ready for Plan 03-05 (user settings/profile management)

---
*Phase: 03-reservations*
*Completed: 2026-03-08*
