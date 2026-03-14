---
phase: 02-billing
verified: 2026-03-08T20:00:00Z
status: gaps_found
score: 4/4 success criteria verified (1 minor i18n bug found, non-blocking)
gaps:
  - truth: "Abandoned checkout shows correct reassurance message on /pricing"
    status: partial
    reason: "Duplicate cancelledMessage key in Billing i18n namespace (en.json and es.json) — second value overwrites first. Pricing page abandoned checkout banner renders MembershipCard interpolation text with unresolved {plan} and {date} instead of 'No worries — you can subscribe anytime.'"
    artifacts:
      - path: "messages/en.json"
        issue: "Duplicate key 'cancelledMessage' at lines 158 and 178 within Billing namespace — JSON last-value-wins causes pricing page banner to show wrong text"
      - path: "messages/es.json"
        issue: "Same duplicate key 'cancelledMessage' at lines 158 and 178"
    missing:
      - "Rename one of the two cancelledMessage keys — e.g. use 'checkoutCancelledMessage' for the pricing banner and keep 'cancelledMessage' for the MembershipCard"
---

# Phase 2: Billing Verification Report

**Phase Goal:** A user who signs up can pay for a membership via Stripe, and that membership status is immediately reflected in Supabase -- including all lifecycle events (cancellation, payment failure) -- so court reservation gating is trustworthy.
**Verified:** 2026-03-08T20:00:00Z
**Status:** gaps_found (minor -- one i18n key collision)
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A user who completes Stripe Checkout sees their membership status as active in Supabase within seconds, without trusting the redirect URL -- the post-checkout page polls Supabase Realtime | VERIFIED | `CheckoutSuccessClient.tsx` (214 lines) implements pending/active/timeout state machine with `postgres_changes` Realtime subscription on `memberships` table filtered by `user_id`. Initial query checks if already active before subscribing. 30s timeout with "Check Status" fallback button. |
| 2 | A cancelled or payment-failed subscription causes the membership status in Supabase to update to inactive, and that member can no longer access court reservation routes | VERIFIED | `webhookHandlers.ts`: `handleSubscriptionDeleted` sets status to `cancelled`, `handleInvoicePaymentFailed` sets status to `past_due`. `proxy.ts` line 51-63: queries `memberships` with `.in('status', ['active'])` -- only active members pass through to `/member/` routes. |
| 3 | A member can upgrade from Basic to VIP or downgrade from VIP to Basic -- Stripe handles proration and the Supabase memberships row reflects the new plan | VERIFIED | `webhookHandlers.ts`: `handleSubscriptionUpdated` reads `subscription.items.data[0].price.id`, calls `determinePlanType()`, and updates `plan_type` + `status` in memberships. `PricingCards.tsx`: active members see "Manage Subscription" button on both plan cards, linking to Stripe Customer Portal via `createPortalSessionAction`. |
| 4 | All Stripe webhook events are processed exactly once -- duplicate events are rejected via stripe_event_id idempotency check | VERIFIED | `webhook/route.ts` lines 36-49: inserts into `webhook_events` table before processing; catches error code `23505` (unique_violation) and returns 200 for duplicates. `0002_webhook_events.sql`: `stripe_event_id TEXT NOT NULL UNIQUE` constraint. |

**Score:** 4/4 success criteria verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/stripe/index.ts` | Stripe singleton | VERIFIED | 6 lines, exports `stripe` with API version `2026-02-25.clover` |
| `app/actions/billing.ts` | Server Actions for checkout and portal | VERIFIED | 78 lines, exports `createCheckoutSessionAction` and `createPortalSessionAction`. Uses `client_reference_id: user.id`, `mode: 'subscription'`, correct success/cancel URLs |
| `app/api/stripe/webhook/route.ts` | POST Route Handler | VERIFIED | 94 lines, exports `POST`. Uses `request.text()` for raw body, `constructEvent` for signature, idempotency guard, dispatches to all 5 handlers |
| `lib/stripe/webhookHandlers.ts` | 5 handler functions | VERIFIED | 181 lines, exports all 5: `handleCheckoutCompleted`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `handleInvoicePaymentSucceeded`, `handleInvoicePaymentFailed`. All use `supabaseAdmin` for service-role DB access |
| `app/[locale]/(marketing)/pricing/page.tsx` | Pricing page | VERIFIED | 50 lines, Server Component fetching user + membership, passes to PricingCards |
| `app/[locale]/(marketing)/pricing/PricingCards.tsx` | Context-aware plan cards | VERIFIED | 211 lines, three CTA states (guest/unsubscribed/active), confirmation step, cancelled banner |
| `app/[locale]/(marketing)/pricing/PlanConfirmation.tsx` | Confirmation before Stripe redirect | VERIFIED | 63 lines, calls `createCheckoutSessionAction(planType)` on confirm |
| `app/[locale]/(member)/checkout-success/CheckoutSuccessClient.tsx` | Realtime state machine | VERIFIED | 214 lines, pending/active/timeout states, `postgres_changes` subscription, confetti animation |
| `app/[locale]/(member)/checkout-success/page.tsx` | Server wrapper | VERIFIED | 5 lines, renders CheckoutSuccessClient |
| `app/[locale]/(member)/dashboard/page.tsx` | Dashboard page | VERIFIED | 67 lines, fetches membership + profile, renders MembershipCard or subscribe banner |
| `app/[locale]/(member)/dashboard/MembershipCard.tsx` | Membership status card | VERIFIED | 105 lines, active/cancelled/past_due states, Manage/Reactivate/Update Payment buttons via portal |
| `proxy.ts` | Real membership gating | VERIFIED | Line 51: queries `from('memberships')` with `.in('status', ['active'])`. Stub `isSubscribed = false` replaced |
| `supabase/migrations/0002_webhook_events.sql` | Migration | VERIFIED | webhook_events table with UNIQUE(stripe_event_id), memberships UNIQUE(user_id), supabase_realtime publication |
| `tests/unit/billing.test.ts` | 8 test stubs | VERIFIED | 8 test.skip stubs |
| `tests/unit/webhookHandler.test.ts` | 10 test stubs | VERIFIED | 10 test.skip stubs |
| `tests/unit/proxyMembership.test.ts` | 4 test stubs | VERIFIED | 4 test.skip stubs |
| `tests/unit/checkoutSuccess.test.ts` | 3 test stubs | VERIFIED | 3 test.skip stubs |
| `components/Navbar.tsx` | Pricing link | VERIFIED | Line 32-36: Pricing link using `tBilling('pricingNav')` |
| `messages/en.json` | Billing i18n namespace | VERIFIED (with bug) | Billing namespace present with all keys. Duplicate `cancelledMessage` key -- see gaps |
| `messages/es.json` | Billing i18n namespace (Spanish) | VERIFIED (with bug) | Billing namespace present with all keys. Same duplicate key issue |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| PricingCards.tsx | billing.ts | `createCheckoutSessionAction` call via PlanConfirmation | WIRED | PlanConfirmation.tsx line 20: `await createCheckoutSessionAction(planType)` |
| PricingCards.tsx | billing.ts | `createPortalSessionAction` form action | WIRED | Lines 177, 191: `<form action={createPortalSessionAction}>` |
| billing.ts | lib/stripe/index.ts | `stripe.checkout.sessions.create` | WIRED | Line 28: `stripe.checkout.sessions.create({...})` |
| billing.ts | lib/stripe/index.ts | `stripe.billingPortal.sessions.create` | WIRED | Line 72: `stripe.billingPortal.sessions.create({...})` |
| webhook/route.ts | lib/stripe/index.ts | `stripe.webhooks.constructEvent` | WIRED | Line 26: `stripe.webhooks.constructEvent(body, signature, ...)` |
| webhook/route.ts | lib/supabase/admin.ts | `supabaseAdmin` for DB access | WIRED | Line 3: import, lines 36-41: used for idempotency insert |
| webhookHandlers.ts | memberships table | `from('memberships')` upsert/update | WIRED | Lines 66, 98, 120, 148, 171: all 5 handlers query memberships |
| CheckoutSuccessClient.tsx | memberships table | Realtime `postgres_changes` | WIRED | Lines 43-61: subscribes to `postgres_changes` on `memberships` table |
| proxy.ts | memberships table | `from('memberships')` SELECT | WIRED | Line 51: `.from('memberships').select('status').eq('user_id', user.id).in('status', ['active'])` |
| MembershipCard.tsx | billing.ts | `createPortalSessionAction` | WIRED | Line 4: import, lines 54, 95: form actions |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BILL-01 | 02-00, 02-01 | User selects VIP ($50/mo) or Basic ($35/mo) plan | SATISFIED | PricingCards.tsx renders both plans with i18n prices; billing.ts resolves `STRIPE_PRICE_ID_VIP`/`STRIPE_PRICE_ID_BASIC` |
| BILL-02 | 02-00, 02-01 | Stripe Checkout creates subscription with `client_reference_id` | SATISFIED | billing.ts line 31: `client_reference_id: user.id` |
| BILL-03 | 02-00, 02-02 | Webhook handles all 5 lifecycle events | SATISFIED | webhook/route.ts dispatches to 5 handlers; webhookHandlers.ts implements all 5 |
| BILL-04 | 02-00, 02-02 | Events deduplicated via `stripe_event_id` | SATISFIED | webhook/route.ts lines 36-49: insert to webhook_events, catch 23505 |
| BILL-05 | 02-00, 02-02 | Webhook verifies Stripe signature using raw body | SATISFIED | webhook/route.ts line 16: `request.text()`, line 26: `constructEvent` |
| BILL-06 | 02-00, 02-02, 02-03 | Membership status synced via webhooks | SATISFIED | All 5 handlers write to memberships table with correct status values |
| BILL-07 | 02-00, 02-01, 02-03 | User can upgrade/downgrade (Stripe proration) | SATISFIED | `handleSubscriptionUpdated` updates `plan_type`; Portal session for plan management |
| BILL-08 | 02-00, 02-01, 02-03 | User can cancel (access until period end) | SATISFIED | `handleSubscriptionDeleted` sets status `cancelled`; MembershipCard shows end date + Reactivate |
| BILL-09 | 02-00, 02-03 | Cancelled/past_due members cannot reserve courts | SATISFIED | proxy.ts: only `active` status passes; non-active redirected to /pricing |

**All 9 BILL requirements satisfied. No orphaned requirements.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| messages/en.json | 158, 178 | Duplicate JSON key `cancelledMessage` in Billing namespace | Warning | Second value overwrites first; pricing page abandoned checkout banner shows wrong text with unresolved `{plan}` and `{date}` interpolation variables |
| messages/es.json | 158, 178 | Same duplicate key | Warning | Same issue in Spanish |

No TODOs, FIXMEs, stubs, or placeholder implementations found in any production file. The Phase 1 `isSubscribed = false` stub in proxy.ts has been fully replaced with a real database query.

### Human Verification Required

### 1. End-to-End Stripe Checkout Flow

**Test:** Sign up, visit /pricing, click Subscribe on a plan, complete Stripe Checkout with test card 4242 4242 4242 4242, observe post-checkout page transition from pending to active
**Expected:** Pending spinner visible for a few seconds, then success celebration with confetti animation
**Why human:** Requires real Stripe test mode integration, visual animation verification

### 2. Stripe Customer Portal for Upgrade/Downgrade/Cancel

**Test:** As an active member, click "Manage Subscription" from dashboard or pricing page, verify Stripe Customer Portal loads, attempt plan change and cancellation
**Expected:** Portal opens with current plan, allows plan change and cancellation
**Why human:** Requires Stripe Customer Portal configuration, real Stripe session

### 3. Webhook-Driven Status Changes

**Test:** Cancel subscription in Stripe Portal, verify dashboard shows cancelled state with end date. Trigger payment failure via Stripe CLI, verify past_due warning banner
**Expected:** Dashboard reflects correct state within seconds of webhook processing
**Why human:** Requires Stripe webhook delivery, timing verification

### 4. Membership Gating

**Test:** Log in with account that has no subscription, attempt to navigate to /dashboard directly
**Expected:** Redirected to /pricing page
**Why human:** Requires browser navigation, cookie state verification

### 5. Abandoned Checkout Banner (affected by duplicate key bug)

**Test:** Start checkout, cancel on Stripe page, verify /pricing shows reassurance message
**Expected:** Should show "No worries -- you can subscribe anytime" but currently shows interpolated membership text due to duplicate key bug
**Why human:** Visual verification of text content

### Gaps Summary

One minor gap found: a duplicate `cancelledMessage` key exists in both `messages/en.json` and `messages/es.json` within the `Billing` namespace. The first occurrence (line 158) is the pricing page abandoned checkout message ("No worries..."), and the second (line 178) is the MembershipCard cancellation message with `{plan}` and `{date}` interpolation. Since JSON last-value-wins, the pricing page banner will display incorrect text with unresolved template variables when a user abandons Stripe Checkout.

This is a one-line fix: rename one of the two keys (e.g., `checkoutCancelledMessage` for the pricing banner). It does not block any core billing functionality -- all subscription lifecycle events, webhook processing, Realtime status transitions, and membership gating work correctly.

All 4 success criteria are verified at the code level. All 9 BILL requirements are satisfied. The codebase is substantive and fully wired -- no stubs, no placeholders, no orphaned components.

---

_Verified: 2026-03-08T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
