---
phase: 03-reservations
plan: "03"
subsystem: api
tags: [server-actions, stripe, supabase, reservations, booking, cancellation, webhook]

requires:
  - phase: 03-reservations
    provides: "Reservation schema with exclusion constraints, types, Resend email, proxy.ts exception"
provides:
  - "createReservationAction with full booking flow (auth, pending payment block, membership check, booking window, location restriction, VIP guest, name snapshot, DB insert, confirmation email)"
  - "cancelReservationAction with ownership check and cancellation window"
  - "createSessionPaymentAction for Stripe one-time Checkout (mode: payment)"
  - "handleOneTimePaymentCompleted webhook handler for per-session payment completion"
  - "Webhook route dispatch based on session.mode (payment vs subscription)"
affects: [03-reservations]

tech-stack:
  added: []
  patterns: [server-action-booking-flow, pre-insert-conflict-check, webhook-mode-dispatch]

key-files:
  created:
    - app/actions/reservations.ts
    - app/actions/sessionPayment.ts
  modified:
    - lib/stripe/webhookHandlers.ts
    - app/api/stripe/webhook/route.ts
    - messages/en.json
    - messages/es.json

key-decisions:
  - "Application-level pre-insert conflict check complements DB exclusion constraints for cross-mode blocking (full_court vs open_play)"
  - "Webhook route dispatches checkout.session.completed based on session.mode to separate subscription from one-time payment handling"

patterns-established:
  - "Booking flow pattern: auth -> pending payment block -> membership check -> booking window -> location restriction -> DB insert -> email"
  - "Webhook mode dispatch: session.mode === 'payment' routes to handleOneTimePaymentCompleted, else to handleCheckoutCompleted"

requirements-completed: [RESV-02, RESV-05, RESV-06, RESV-08, RESV-09, NOTIF-01]

duration: 2min
completed: 2026-03-08
---

# Phase 3 Plan 03: Reservation Booking Logic Summary

**Server Actions for reservation create/cancel with membership-aware pricing, exclusion constraint protection, Stripe per-session payment checkout, and webhook handler for one-time payment completion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T16:53:37Z
- **Completed:** 2026-03-08T16:55:55Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- createReservationAction with full booking pipeline: auth, pending payment block, membership check, advance booking window, Basic tier location restriction, VIP guest validation, name snapshot, application-level conflict check, DB insert with exclusion constraint error handling, and fire-and-forget confirmation email
- cancelReservationAction with ownership verification and configurable cancellation window from app_config
- createSessionPaymentAction creating Stripe Checkout with mode: payment and reservation_id in metadata
- handleOneTimePaymentCompleted webhook handler updating reservation from pending_payment to paid/confirmed
- Webhook route now dispatches checkout.session.completed based on session.mode

## Task Commits

Each task was committed atomically:

1. **Task 1: createReservationAction and cancelReservationAction** - `b0cd470` (feat)
2. **Task 2: Stripe per-session payment + webhook handler** - `c818c61` (feat)

## Files Created/Modified
- `app/actions/reservations.ts` - createReservationAction and cancelReservationAction Server Actions with full booking/cancellation logic
- `app/actions/sessionPayment.ts` - createSessionPaymentAction for Stripe one-time Checkout
- `lib/stripe/webhookHandlers.ts` - Added handleOneTimePaymentCompleted for per-session payment webhook
- `app/api/stripe/webhook/route.ts` - Updated checkout.session.completed dispatch based on session.mode
- `messages/en.json` - Added Reservations.errors namespace with all error message keys
- `messages/es.json` - Added Reservations.errors namespace with Spanish translations

## Decisions Made
- Application-level pre-insert conflict check added to complement DB exclusion constraints. The DB constraints only prevent same-mode overlaps (full_court vs full_court, open_play vs open_play). The application check prevents cross-mode conflicts (booking open_play during a full_court slot and vice versa).
- Webhook route uses session.mode to separate subscription from one-time payment handling, keeping both flows independent.
- RESV-08 (admin creates reservation on behalf of member) and RESV-09 (admin cancels any reservation) are acknowledged in requirements but deferred to Phase 4 per CONTEXT.md.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in proxy.ts (supabase/ssr cookie type mismatch) and CourtCard module not found error from another plan's work -- neither caused by our changes.

## Next Phase Readiness
- Server Actions ready for UI integration (plan 03-04 court cards and booking flow)
- Webhook handler ready for Stripe per-session payments
- Error messages ready for i18n display in reservation UI

---
*Phase: 03-reservations*
*Completed: 2026-03-08*
