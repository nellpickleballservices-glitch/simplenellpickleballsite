---
phase: 2
slug: billing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 (unit) + Playwright ^1.58.2 (e2e) |
| **Config file** | vitest.config.ts (existing) + playwright.config.ts (existing) |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) / ~3 min (full with e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-00-01 | 00 | 0 | BILL-01,02,07 | unit stub | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 2-00-02 | 00 | 0 | BILL-03,04,05,06,08 | unit stub | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 2-00-03 | 00 | 0 | BILL-09 | unit stub | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 2-00-04 | 00 | 0 | SC-1 | unit stub | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | BILL-01 | unit | `vitest run tests/unit/billing.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | BILL-02 | unit | `vitest run tests/unit/billing.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | BILL-07 | unit | `vitest run tests/unit/billing.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | BILL-05 | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | BILL-04 | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 1 | BILL-03 | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-04 | 02 | 1 | BILL-06 | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-05 | 02 | 1 | BILL-08 | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | SC-1 | unit | `vitest run tests/unit/checkoutSuccess.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | BILL-09 | unit | `vitest run tests/unit/proxyMembership.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/billing.test.ts` — stubs for BILL-01, BILL-02, BILL-07 (checkout session + portal session creation)
- [ ] `tests/unit/webhookHandler.test.ts` — stubs for BILL-03, BILL-04, BILL-05, BILL-06, BILL-08 (all event types, idempotency, signature verification, membership upsert)
- [ ] `tests/unit/proxyMembership.test.ts` — stubs for BILL-09 (proxy redirects cancelled/past-due, passes active members)
- [ ] `tests/unit/checkoutSuccess.test.ts` — stubs for Success Criterion 1 (Realtime polling component state transitions)

*Existing infrastructure (vitest.config.ts, playwright.config.ts) covers all phase requirements — no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Dashboard webhook endpoint configured | BILL-03, BILL-05 | External system setup | Create webhook in Stripe Dashboard pointing to production URL; verify API version matches constructor |
| Stripe CLI local webhook forwarding | BILL-03 | Requires running process | `stripe listen --forward-to localhost:3000/api/stripe/webhook`; trigger `checkout.session.completed`; verify membership row in Supabase |
| Post-checkout page Realtime fires within 30s | SC-1 | Requires live Stripe + Supabase | Complete a test checkout; observe post-checkout page transitions from "pending" to "active" without page refresh |
| Customer Portal plan upgrade reflected in Supabase | BILL-07 | External Stripe-hosted UI | Use portal to switch plans; verify `memberships.plan_type` and `memberships.status` updated in Supabase within 10s |
| Cancelled member blocked from `/member/*` routes | SC-2, BILL-09 | Requires full auth + membership state | Login as cancelled member; attempt to navigate to `/member/dashboard`; verify redirect to `/pricing` |
| `memberships` table in supabase_realtime publication | SC-1 | Supabase Dashboard toggle | Verify via Supabase Dashboard > Database > Publications > supabase_realtime > memberships enabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
