---
phase: 3
slug: reservations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + Playwright 1.58.2 |
| **Config file** | vitest.config.ts (unit), playwright.config.ts (e2e) |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | ALL | stub | `npx vitest run tests/unit/courtAvailability.test.ts tests/unit/createReservation.test.ts tests/unit/doubleBooking.test.ts tests/unit/cancelReservation.test.ts tests/unit/courtCard.test.ts tests/unit/confirmationEmail.test.ts tests/unit/reminderEmail.test.ts tests/unit/dashboardReservations.test.ts tests/unit/profileUpdate.test.ts tests/unit/passwordChange.test.ts tests/unit/pendingPayment.test.ts tests/unit/sessionPayment.test.ts tests/unit/timezoneDisplay.test.ts tests/unit/locationRestriction.test.ts` | Wave 0 | ⬜ pending |
| 03-01-01 | 01 | 1 | RESV-01, RESV-04 | unit | `npx vitest run tests/unit/courtAvailability.test.ts tests/unit/timezoneDisplay.test.ts` | Wave 0 | ⬜ pending |
| 03-02-01 | 02 | 1 | MAP-01, MAP-02, MAP-03 | unit | `npx vitest run tests/unit/courtCard.test.ts` | Wave 0 | ⬜ pending |
| 03-03-01 | 03 | 2 | RESV-02, RESV-03, RESV-05, RESV-06, RESV-07 | unit | `npx vitest run tests/unit/createReservation.test.ts tests/unit/doubleBooking.test.ts tests/unit/cancelReservation.test.ts tests/unit/locationRestriction.test.ts` | Wave 0 | ⬜ pending |
| 03-03-02 | 03 | 2 | NOTIF-01 | unit | `npx vitest run tests/unit/confirmationEmail.test.ts` | Wave 0 | ⬜ pending |
| 03-04-01 | 04 | 3 | NOTIF-02, NOTIF-03, NOTIF-04 | unit | `npx vitest run tests/unit/reminderEmail.test.ts` | Wave 0 | ⬜ pending |
| 03-04-02 | 04 | 3 | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05 | unit | `npx vitest run tests/unit/dashboardReservations.test.ts tests/unit/profileUpdate.test.ts tests/unit/passwordChange.test.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/courtAvailability.test.ts` — stubs for RESV-01
- [ ] `tests/unit/createReservation.test.ts` — stubs for RESV-02, RESV-05
- [ ] `tests/unit/doubleBooking.test.ts` — stubs for RESV-03
- [ ] `tests/unit/timezoneDisplay.test.ts` — stubs for RESV-04
- [ ] `tests/unit/cancelReservation.test.ts` — stubs for RESV-06
- [ ] `tests/unit/locationRestriction.test.ts` — stubs for RESV-07
- [ ] `tests/unit/courtCard.test.ts` — stubs for MAP-01
- [ ] `tests/unit/confirmationEmail.test.ts` — stubs for NOTIF-01
- [ ] `tests/unit/reminderEmail.test.ts` — stubs for NOTIF-04
- [ ] `tests/unit/dashboardReservations.test.ts` — stubs for DASH-02
- [ ] `tests/unit/profileUpdate.test.ts` — stubs for DASH-04
- [ ] `tests/unit/passwordChange.test.ts` — stubs for DASH-05
- [ ] `tests/unit/pendingPayment.test.ts` — stubs for pending payment blocking logic
- [ ] `tests/unit/sessionPayment.test.ts` — stubs for Stripe one-time payment webhook

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google Maps thumbnail renders with pin | MAP-01, MAP-04 | Requires API key + visual verification | Open court card, verify map image loads with correct pin location |
| Stripe per-session Checkout completes | RESV-02 (non-member) | Requires Stripe test mode interaction | Reserve slot as non-member, choose Stripe, complete with test card 4242... |
| Reminder email arrives 10 min before session end | NOTIF-02, NOTIF-03 | Requires Edge Function deployment + time-based trigger | Create reservation, wait for reminder window, verify email received |
| Court diagram modal shows correct occupancy | MAP-03 | Visual UI verification | Book spots, open modal, verify green/red nodes match availability |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
