---
phase: 5
slug: reservation-flow-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/unit/pricing.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/pricing.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | RESV-01 | unit | `npx vitest run tests/unit/pricing.test.ts -t "local"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | RESV-01 | unit | `npx vitest run tests/unit/pricing.test.ts -t "tourist"` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | RESV-01 | unit | `npx vitest run tests/unit/pricing.test.ts -t "isTourist"` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | RESV-01 | unit | `npx vitest run tests/unit/pricing.test.ts -t "null"` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | PRIC-04 | unit | `npx vitest run tests/unit/pricing.test.ts -t "surcharge"` | ❌ W0 | ⬜ pending |
| 05-01-06 | 01 | 1 | PRIC-05 | unit | `npx vitest run tests/unit/pricing.test.ts -t "member"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | RESV-02 | manual-only | Verify via Supabase query after reservation | N/A | ⬜ pending |
| 05-02-02 | 02 | 2 | RESV-03 | manual-only | Verify via admin walk-in creation | N/A | ⬜ pending |
| 05-02-03 | 02 | 2 | RESV-04 | manual-only | Verify via admin walk-in creation | N/A | ⬜ pending |
| 05-02-04 | 02 | 2 | ADMN-03 | manual-only | Verify via UI interaction | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/pricing.test.ts` — stubs for RESV-01, PRIC-04, PRIC-05 (calculateSessionPrice and isTourist pure functions)

*No new framework install needed — Vitest already configured. No new fixtures needed — pure functions with no dependencies.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Price snapshot stored correctly | RESV-02 | Requires DB insert via server action | Create reservation, query `reservations` table for `price_cents` |
| is_tourist_price set on walk-in | RESV-03 | Requires admin UI interaction | Create walk-in as tourist guest, verify `is_tourist_price = true` in DB |
| Walk-in price_cents != 0 for non-free | RESV-04 | Requires admin UI interaction | Create non-member walk-in, verify `price_cents > 0` in DB |
| Admin toggle affects calculated price | ADMN-03 | Requires UI toggle interaction | Toggle Local/Tourist in admin walk-in form, verify price preview changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
