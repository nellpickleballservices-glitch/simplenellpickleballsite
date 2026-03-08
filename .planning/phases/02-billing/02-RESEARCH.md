# Phase 2: Billing - Research

**Researched:** 2026-03-08
**Domain:** Stripe Subscriptions + Supabase Realtime + Next.js App Router Webhooks
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | User selects membership plan during signup: VIP Nell-Picker ($50/mo, all locations) or Basic Nell-Picker ($35/mo, one location) | Stripe Checkout Session with `price` param pointing to pre-created Price ID; `client_reference_id = supabase_user_id` |
| BILL-02 | Stripe Checkout creates a recurring subscription tied to the user's Supabase ID (`client_reference_id`) | `mode: 'subscription'`, `client_reference_id` field, extracted from `checkout.session.completed` webhook event |
| BILL-03 | Stripe webhook handles all subscription lifecycle events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` | Route Handler at `/api/stripe/webhook`, switch on `event.type`, five event branches |
| BILL-04 | Webhook events are deduplicated via `stripe_event_id` before processing (idempotency) | `webhook_events` table with `UNIQUE(stripe_event_id)`; insert-before-process pattern; catch Postgres 23505 on conflict |
| BILL-05 | Webhook endpoint verifies Stripe signature using raw request body (`request.text()`) | App Router Route Handler: `const body = await request.text()` then `stripe.webhooks.constructEvent(body, sig, secret)` |
| BILL-06 | Membership status synced in Supabase `memberships` table in real-time via webhooks | Service-role Supabase client in webhook handler; `upsert` on `memberships` with `on_conflict: 'user_id'` |
| BILL-07 | User can upgrade or downgrade their plan (Stripe handles proration) | Stripe Customer Portal (`billingPortal.sessions.create`) or direct API `subscriptions.update` with `proration_behavior: 'always_invoice'` |
| BILL-08 | User can cancel their subscription (access remains until period end) | Customer Portal handles cancellation; webhook `customer.subscription.deleted` / `status: 'canceled'` fires at period end |
| BILL-09 | Cancelled/past-due members cannot reserve courts (enforced at API and RLS level) | `proxy.ts` stub replaced with real `memberships` query; only `status = 'active'` passes; RLS policy on `reservations` |
</phase_requirements>

---

## Summary

Phase 2 wires Stripe Checkout subscriptions end-to-end with Supabase membership state. The critical data flow is: user selects plan → Stripe Checkout Session created (Server Action) → user pays → Stripe fires `checkout.session.completed` webhook → Route Handler upserts `memberships` row → Supabase Realtime notifies post-checkout page → user sees active status without trusting redirect URL.

The two highest-risk implementation areas are (1) raw body extraction for webhook signature verification — Next.js App Router does NOT parse the body automatically, so `request.text()` is correct and no extra configuration is needed — and (2) idempotency for duplicate webhook delivery. Stripe retries events for up to 3 days on non-2xx responses. The idempotency guard must insert `stripe_event_id` into a `webhook_events` table before any business logic runs, catching unique constraint violations to silently drop duplicates.

Upgrade/downgrade (BILL-07) and cancellation (BILL-08) are best handled through the Stripe Customer Portal, which Stripe hosts and manages. This reduces implementation surface: fire a `billingPortal.sessions.create` Server Action, redirect the user, and handle the resulting `customer.subscription.updated` or `customer.subscription.deleted` webhook event. Proration credit/debit is handled by Stripe automatically.

**Primary recommendation:** Use Stripe-hosted Checkout and Customer Portal for all payment UI. Implement a single `/api/stripe/webhook` Route Handler with a `switch` on `event.type`. Use the Supabase service-role client in the webhook handler (bypasses RLS). Use Supabase Realtime Postgres Changes on the `memberships` table in the post-checkout Client Component.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` (server SDK) | ^20.4.1 | Checkout Session creation, Customer Portal, webhook verification | Official Stripe Node.js SDK; only way to call `stripe.webhooks.constructEvent` |
| `@supabase/ssr` | ^0.9.0 (already installed) | Server client for webhook handler (service role), client for Realtime | Already in project; service-role client bypasses RLS in webhook context |
| `@supabase/supabase-js` | ^2.98.0 (already installed) | Realtime channel subscription in Client Components | Browser client; needed for `supabase.channel().on('postgres_changes', ...)` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stripe CLI | latest | Local webhook forwarding during development | `stripe listen --forward-to localhost:3000/api/stripe/webhook` |
| Stripe Dashboard | hosted | Create Products and Prices, configure Customer Portal | One-time setup; get `STRIPE_PRICE_ID_VIP` and `STRIPE_PRICE_ID_BASIC` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Customer Portal (hosted) | Custom upgrade/downgrade UI | Portal is zero-code for plan changes; custom UI requires building subscription update API + proration preview UI — not worth it for v1 |
| Supabase Realtime | Short-poll `setInterval` | Realtime is lower latency and cleaner; polling works but adds unnecessary load and UX delay |
| Stripe-hosted Checkout | Stripe Embedded Checkout (`ui_mode: 'embedded'`) | Hosted redirects are simpler; embedded keeps users on domain but requires more client code. Hosted is correct for this project. |

**Installation:**
```bash
npm install stripe
```

No other new packages needed. `@supabase/ssr` and `@supabase/supabase-js` are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── api/
│   └── stripe/
│       └── webhook/
│           └── route.ts          # POST handler — raw body, signature verify, event switch
├── [locale]/
│   ├── (auth)/
│   │   └── signup/
│   │       └── page.tsx          # Passes selected plan to checkout action
│   └── (member)/
│       ├── checkout/
│       │   ├── page.tsx          # Triggers createCheckoutSessionAction
│       │   └── actions.ts        # Server Action: stripe.checkout.sessions.create
│       ├── checkout-success/
│       │   └── page.tsx          # Client Component: polls Supabase Realtime for active status
│       └── checkout-cancel/
│           └── page.tsx          # Simple cancel page
├── actions/
│   └── billing.ts                # createCheckoutSessionAction, createPortalSessionAction
lib/
├── stripe/
│   └── index.ts                  # Stripe singleton instance
└── supabase/
    └── service.ts                # Service-role Supabase client (already exists or create)
supabase/
└── migrations/
    └── 0002_webhook_events.sql   # webhook_events idempotency table
```

### Pattern 1: Stripe Checkout Session Server Action

**What:** A `'use server'` function creates a Checkout Session and redirects to Stripe's hosted page.
**When to use:** User clicks "Subscribe" button with a plan selected.

```typescript
// Source: https://docs.stripe.com/checkout/quickstart?client=next
// app/actions/billing.ts
'use server'

import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // verify current version in Dashboard
})

export async function createCheckoutSessionAction(planType: 'vip' | 'basic') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const priceId = planType === 'vip'
    ? process.env.STRIPE_PRICE_ID_VIP!
    : process.env.STRIPE_PRICE_ID_BASIC!

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id, // Supabase user UUID — key link
    customer_email: user.email,
    success_url: `${origin}/es/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/es/checkout-cancel`,
    subscription_data: {
      metadata: {
        supabase_user_id: user.id, // belt-and-suspenders
        plan_type: planType,
      },
    },
  })

  redirect(session.url!)
}
```

### Pattern 2: Webhook Route Handler

**What:** A Next.js App Router Route Handler that receives Stripe events, verifies signatures, and upserts membership state.
**When to use:** Every Stripe lifecycle event.

```typescript
// Source: https://docs.stripe.com/webhooks + verified Next.js App Router pattern
// app/api/stripe/webhook/route.ts
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
})

export async function POST(request: Request) {
  // CRITICAL: Must use request.text() — App Router does not parse body automatically
  // Using request.json() would corrupt the raw bytes needed for signature verification
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 })
  }

  const supabase = createServiceClient() // service role — bypasses RLS

  // IDEMPOTENCY GUARD: Insert event ID before any logic
  // If this insert fails with 23505 (unique violation), event was already processed
  const { error: dedupError } = await supabase
    .from('webhook_events')
    .insert({ stripe_event_id: event.id, event_type: event.type })

  if (dedupError?.code === '23505') {
    return new Response('Duplicate event — already processed', { status: 200 })
  }
  if (dedupError) {
    return new Response('DB error on idempotency check', { status: 500 })
  }

  // Process event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break
      case 'invoice.payment_succeeded':
        // Update current_period_end when invoice paid
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabase)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break
    }
  } catch (err) {
    // Mark event as failed so Stripe retries
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
```

### Pattern 3: checkout.session.completed Handler

**What:** Upsert the `memberships` row in Supabase when the user first subscribes.
**Critical detail:** `client_reference_id` is the Supabase user UUID.

```typescript
// Source: https://docs.stripe.com/api/checkout/sessions/object
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
) {
  const userId = session.client_reference_id // Supabase UUID set during session creation
  if (!userId) throw new Error('Missing client_reference_id')

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Fetch subscription to get plan details and period end
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0].price.id
  const planType = priceId === process.env.STRIPE_PRICE_ID_VIP ? 'vip' : 'basic'
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  await supabase.from('memberships').upsert(
    {
      user_id: userId,
      plan_type: planType,
      status: 'active',
      payment_method: 'stripe',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}
```

### Pattern 4: Supabase Realtime in Post-Checkout Page

**What:** Client Component that listens for the `memberships` row to flip to `active` after Stripe fires the webhook.
**Why:** Never trust the redirect URL — the webhook may arrive before or after the redirect.

```typescript
// Source: https://supabase.com/docs/reference/javascript/subscribe
// app/[locale]/(member)/checkout-success/page.tsx (Client Component)
'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<'pending' | 'active' | 'timeout'>('pending')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    // Get current user ID from session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Set 30-second timeout — show fallback if webhook is slow
      const timeout = setTimeout(() => setStatus('timeout'), 30_000)

      const channel = supabase
        .channel('membership-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'memberships',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.status === 'active') {
              clearTimeout(timeout)
              setStatus('active')
              supabase.removeChannel(channel)
            }
          }
        )
        .subscribe()

      return () => {
        clearTimeout(timeout)
        supabase.removeChannel(channel)
      }
    })
  }, [])

  if (status === 'pending') return <div>Confirming your membership...</div>
  if (status === 'active') return <div>Membership active! Welcome aboard.</div>
  if (status === 'timeout') return <div>Payment received — check your email for confirmation.</div>
}
```

### Pattern 5: Customer Portal for Plan Changes and Cancellation

**What:** Server Action that creates a Stripe Customer Portal session and redirects.
**Covers:** BILL-07 (upgrade/downgrade) and BILL-08 (cancellation).

```typescript
// Source: https://docs.stripe.com/customer-management/integrate-customer-portal
// app/actions/billing.ts
export async function createPortalSessionAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get stripe_customer_id from memberships table
  const { data: membership } = await supabase
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!membership?.stripe_customer_id) throw new Error('No Stripe customer found')

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: membership.stripe_customer_id,
    return_url: `${origin}/es/dashboard`,
  })

  redirect(portalSession.url)
}
```

### Pattern 6: proxy.ts Membership Gate (replace stub from Phase 1)

**What:** Replace the `isSubscribed = false` stub in `proxy.ts` with a real `memberships` table query.

```typescript
// Source: proxy.ts stub comment left by Phase 1
// Replace in proxy.ts — inside the `if (user && pathname.includes('/member/'))` block:
const { data: membership } = await supabase
  .from('memberships')
  .select('status')
  .eq('user_id', user.id)
  .in('status', ['active'])
  .maybeSingle()

const isSubscribed = !!membership
if (!isSubscribed) {
  const url = request.nextUrl.clone()
  url.pathname = '/pricing'  // or '/checkout'
  return NextResponse.redirect(url)
}
```

**NOTE:** The `memberships` table RLS only allows `authenticated` users to read their own row (set in Phase 1 migration). The proxy uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` which is the anon key. The `getUser()` call authenticates the request. The SELECT on `memberships` will succeed because the user is authenticated and the RLS policy allows `SELECT WHERE user_id = auth.uid()`.

### Anti-Patterns to Avoid

- **Trusting the success redirect URL**: Never read `session_id` from the URL and assume payment succeeded. Always wait for the `checkout.session.completed` webhook.
- **Using `request.json()` in webhook handler**: This corrupts the raw body needed for signature verification. Always use `request.text()`.
- **Calling `stripe.webhooks.constructEvent` with parsed JSON**: The signature is computed against the raw bytes of the request body. Parse only after verification.
- **Running business logic before idempotency check**: Always insert `stripe_event_id` first. If you run business logic then fail on dedup insert, you have processed duplicates.
- **Using anon/user Supabase client in webhook handler**: The webhook is a server-to-server call. RLS would block the upsert. Always use `SUPABASE_SERVICE_ROLE_KEY` in the webhook handler.
- **Storing `STRIPE_SECRET_KEY` with `NEXT_PUBLIC_` prefix**: This exposes the key to the browser. It must have no prefix.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recurring billing, invoicing, proration | Custom billing engine | Stripe Subscriptions | Proration math, failed payment retries, dunning, tax — thousands of edge cases |
| Upgrade/downgrade UI | Custom plan change form | Stripe Customer Portal | Portal handles proration preview, immediate billing, and cancellation flows |
| Webhook signature verification | Custom HMAC comparison | `stripe.webhooks.constructEvent()` | Timing-safe comparison, correct timestamp validation to prevent replay attacks |
| Payment UI (card fields) | Custom card input components | Stripe Checkout (hosted) | PCI compliance — you cannot store or process raw card data |
| Subscription status sync | Polling Stripe API | Stripe webhooks + Supabase sync | Webhooks are the source of truth; polling is stale and rate-limited |
| Realtime membership status | `setInterval` polling Supabase | Supabase Realtime Postgres Changes | WebSocket-based; fires within milliseconds of the DB row update |

**Key insight:** The webhook is the single source of truth for subscription state. Never derive membership status from anything except the `memberships` table, which is authoritative because it is only written by the webhook handler.

---

## Common Pitfalls

### Pitfall 1: `request.json()` vs `request.text()` in Webhook Handler

**What goes wrong:** Calling `await request.json()` in the Route Handler before `stripe.webhooks.constructEvent`. This parses and re-serializes the body, changing byte ordering — Stripe signature verification fails with `No signatures found matching the expected signature for payload`.

**Why it happens:** Developers reach for `.json()` by habit. Pages Router required `bodyParser: false` config. App Router doesn't parse at all, but `.json()` still parses the body as JSON before handing it to you.

**How to avoid:** Always `const body = await request.text()`. Pass this string directly to `constructEvent`. Never touch `.json()` in the webhook handler.

**Warning signs:** `WebhookSignatureVerificationError` in logs. Always happens in the webhook handler, not elsewhere.

### Pitfall 2: Missing `webhook_events` Idempotency Table

**What goes wrong:** Stripe retries webhook events for up to 3 days after non-2xx responses. Without deduplication, a transient 500 causes the same event to be processed multiple times — membership upserts twice, email sent twice, etc.

**Why it happens:** Developers assume the webhook fires once. Stripe guarantees delivery but not exactly-once delivery.

**How to avoid:** Insert `stripe_event_id` into `webhook_events` before any processing. Catch Postgres error code `23505` (unique_violation) and return 200 immediately to tell Stripe to stop retrying.

**Warning signs:** Duplicate rows in `memberships`, duplicate emails, inconsistent `updated_at` timestamps.

### Pitfall 3: Supabase Realtime Table Not in Publication

**What goes wrong:** The Realtime subscription channel subscribes, reports status `SUBSCRIBED`, but never fires any change events. The post-checkout page spins forever.

**Why it happens:** Supabase Realtime only broadcasts changes from tables added to the `supabase_realtime` publication. The initial schema migration (Phase 1) does not add `memberships` to the publication.

**How to avoid:** Add `ALTER PUBLICATION supabase_realtime ADD TABLE memberships;` in migration `0002`. Or enable via Supabase Dashboard > Database > Publications > supabase_realtime > toggle `memberships`.

**Warning signs:** No events received on the channel even though the DB row is updated. Channel status is `SUBSCRIBED` but callback never fires.

### Pitfall 4: `client_reference_id` Not Set on Checkout Session

**What goes wrong:** `checkout.session.completed` arrives, but `session.client_reference_id` is null. The handler cannot determine which Supabase user subscribed. Membership row never upserts.

**Why it happens:** Omitting `client_reference_id` when calling `stripe.checkout.sessions.create`.

**How to avoid:** Always pass `client_reference_id: user.id` when creating the session. Also add `supabase_user_id` to `subscription_data.metadata` as belt-and-suspenders.

**Warning signs:** Webhook handler logs `Missing client_reference_id`. No membership row in Supabase. User stuck with pending status.

### Pitfall 5: Stripe API Version Mismatch

**What goes wrong:** Webhook event shape differs from what `stripe.webhooks.constructEvent` expects, or TypeScript types don't match the event object.

**Why it happens:** The Stripe SDK pins an API version but the Dashboard webhook endpoint may be configured with a different version.

**How to avoid:** Set `apiVersion` in the Stripe constructor to match the version configured on the webhook endpoint in the Stripe Dashboard. STATE.md blocker recommends verifying current version. As of research date, latest is `2026-02-25.clover`; the `2025-01-27.acacia` version mentioned in STATE.md should be verified against actual Dashboard settings.

**Warning signs:** TypeScript type errors on event object fields. Events being processed with unexpected shapes.

### Pitfall 6: Proxy Reads `memberships` but RLS Blocks the Query

**What goes wrong:** `proxy.ts` queries `memberships` to check subscription status, but returns no data even for subscribed users — everyone gets redirected to `/pricing`.

**Why it happens:** The `proxy.ts` uses the anon Supabase client with the publishable key. The `memberships` RLS SELECT policy requires `auth.uid() = user_id`. If `getUser()` has been called and the JWT is valid, `auth.uid()` resolves correctly and the query succeeds.

**How to avoid:** Call `getUser()` before the memberships query (already done in proxy pattern). Ensure cookies are forwarded correctly to the Supabase client (standard `@supabase/ssr` cookie pattern already in proxy.ts).

**Warning signs:** All subscribed users redirected to /pricing. `memberships` query returns `null` for known-subscribed users. Check that `getUser()` returns a valid user before the query.

---

## Code Examples

### Stripe Singleton (server-only)

```typescript
// Source: https://github.com/stripe/stripe-node
// lib/stripe/index.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // match Dashboard webhook endpoint version
  typescript: true,
})
```

### Idempotency Table Migration

```sql
-- Source: Stripe docs on idempotency + Postgres UNIQUE constraint pattern
-- supabase/migrations/0002_webhook_events.sql
CREATE TABLE webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,  -- UNIQUE enforces exactly-once processing
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ DEFAULT NOW()
);
-- No RLS needed — only accessed by service role in webhook handler
-- But enable it anyway per project policy
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on webhook_events"
  ON webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Subscription Update Handlers

```typescript
// customer.subscription.updated — fires for upgrades, downgrades, and status changes
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0].price.id
  const planType = priceId === process.env.STRIPE_PRICE_ID_VIP ? 'vip' : 'basic'

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'past_due',
    'trialing': 'active',
  }
  const status = statusMap[subscription.status] ?? 'past_due'
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  await supabase
    .from('memberships')
    .update({
      plan_type: planType,
      status,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
}

// customer.subscription.deleted — fires when subscription fully ends
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
) {
  await supabase
    .from('memberships')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
}

// invoice.payment_failed — set past_due
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
) {
  const subscriptionId = invoice.subscription as string
  await supabase
    .from('memberships')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)
}
```

### Service Role Supabase Client

```typescript
// Source: Supabase docs — service role bypasses RLS
// lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // no NEXT_PUBLIC_ prefix — server only
    { auth: { persistSession: false } }
  )
}
```

### Local Webhook Testing

```bash
# Install Stripe CLI, then:
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# CLI prints: webhook signing secret whsec_xxx — use as STRIPE_WEBHOOK_SECRET in .env.local
# Trigger test events:
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `bodyParser: false` config for raw body | App Router `request.text()` — no config needed | Next.js 13 App Router | Simpler — no export config, just use `.text()` |
| `stripe.webhooks.constructEvent` with Buffer | Pass string directly from `request.text()` | Node.js >= 18 (Web Streams) | String works fine; no need to convert to Buffer |
| Store Stripe customer data in separate `customers` table | Store `stripe_customer_id` and `stripe_subscription_id` on `memberships` | Current pattern | Fewer joins; memberships table is the single source |
| Custom plan change UI | Stripe Customer Portal | Stripe released portal ~2021, matured 2023-2025 | Zero UI to build for plan changes and cancellation |
| Pages Router middleware.ts | Next.js 16 proxy.ts | Next.js 16 rename | Already handled in Phase 1; proxy.ts stub to fill in |

**Deprecated/outdated:**
- `req.rawBody` (Pages Router pattern): Do not use in App Router. Use `request.text()`.
- `stripe.subscriptions.retrieve` in `checkout.session.completed` with `expand: ['latest_invoice']` on the checkout session: Simpler to just call `stripe.subscriptions.retrieve(session.subscription)` directly.

---

## Environment Variables Required

```bash
# .env.local additions for Phase 2
STRIPE_SECRET_KEY=sk_test_...         # Server only — no NEXT_PUBLIC_ prefix
STRIPE_WEBHOOK_SECRET=whsec_...       # From Stripe CLI (dev) or Dashboard (prod)
STRIPE_PRICE_ID_VIP=price_...         # Created in Stripe Dashboard
STRIPE_PRICE_ID_BASIC=price_...       # Created in Stripe Dashboard
# Existing (from Phase 1):
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Open Questions

1. **Stripe API version**
   - What we know: Latest version as of research date is `2026-02-25.clover`. STATE.md blocker says `2025-01-27.acacia` was recommended but not yet verified.
   - What's unclear: Which version is currently set on the project's Stripe Dashboard webhook endpoint.
   - Recommendation: When setting up the webhook endpoint in Stripe Dashboard, note the API version shown. Set the same version in the Stripe constructor `apiVersion` field. This prevents event shape mismatches.

2. **`memberships` table `onConflict` column**
   - What we know: The Phase 1 schema has `user_id` as a FK but no `UNIQUE` constraint declared explicitly in the migration. `upsert` with `onConflict: 'user_id'` requires a UNIQUE constraint.
   - What's unclear: Does the `upsert` need `UNIQUE(user_id)` added explicitly in migration 0002?
   - Recommendation: Add `ALTER TABLE memberships ADD CONSTRAINT memberships_user_id_key UNIQUE (user_id);` in migration 0002. One user, one active membership row. This also prevents duplicate membership rows if checkout fires twice.

3. **Basic plan location assignment**
   - What we know: `memberships.location_id` column exists (Phase 1 schema). BILL-01 says Basic plan is one location.
   - What's unclear: When does the user select their location — during Stripe Checkout or after? Stripe Checkout cannot capture this.
   - Recommendation: After the `checkout.session.completed` webhook creates the membership row, redirect the user to a post-checkout location selection step (a simple form) before showing the success state. Phase 3 enforces location-based court access.

---

## Validation Architecture

> Nyquist validation is enabled (nyquist_validation: true in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 (unit) + Playwright ^1.58.2 (e2e) |
| Config file | vitest.config.ts (existing) + playwright.config.ts (existing) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-01 | Plan selection passed as param to checkout action | unit | `vitest run tests/unit/billing.test.ts` | ❌ Wave 0 |
| BILL-02 | `client_reference_id` = supabase user UUID in session | unit (mock Stripe) | `vitest run tests/unit/billing.test.ts` | ❌ Wave 0 |
| BILL-03 | All 5 webhook event types are handled in switch | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ Wave 0 |
| BILL-04 | Duplicate stripe_event_id returns 200, skips processing | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ Wave 0 |
| BILL-05 | Invalid signature returns 400 | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ Wave 0 |
| BILL-06 | `memberships` row upserted after checkout.session.completed | unit (mock service client) | `vitest run tests/unit/webhookHandler.test.ts` | ❌ Wave 0 |
| BILL-07 | Portal session created with correct customer ID | unit (mock Stripe) | `vitest run tests/unit/billing.test.ts` | ❌ Wave 0 |
| BILL-08 | `customer.subscription.deleted` sets status to `cancelled` | unit | `vitest run tests/unit/webhookHandler.test.ts` | ❌ Wave 0 |
| BILL-09 | `cancelled` member redirected away from `/member/*` in proxy | unit | `vitest run tests/unit/proxyMembership.test.ts` | ❌ Wave 0 |

### Success Criterion Verification Strategy

**Success Criterion 1:** User sees active status via Realtime after checkout (not redirect URL)
- Unit test: Mock Supabase Realtime channel; verify component renders "pending" initially, then "active" when channel fires UPDATE event with `status: 'active'`
- E2E (manual or Stripe CLI): Run `stripe trigger checkout.session.completed`, verify `memberships` row updates in Supabase, verify post-checkout page shows active state
- Automated command: `vitest run tests/unit/checkoutSuccess.test.ts`

**Success Criterion 2:** Cancelled/past-due member blocked from `/member/*`
- Unit test: `proxyMembership.test.ts` — mock `memberships` query returning `status: 'cancelled'`, verify proxy returns redirect to `/pricing`
- Unit test: Mock `status: 'active'`, verify proxy calls `NextResponse.next()`
- Automated command: `vitest run tests/unit/proxyMembership.test.ts`

**Success Criterion 3:** Upgrade/downgrade reflected in Supabase
- Unit test: `handleSubscriptionUpdated` mock with new price ID → verify `plan_type` changes in upsert call
- Automated command: `vitest run tests/unit/webhookHandler.test.ts`

**Success Criterion 4:** Duplicate webhook events rejected
- Unit test: Mock Supabase insert returning `error.code === '23505'` → verify handler returns 200 without processing
- Automated command: `vitest run tests/unit/webhookHandler.test.ts`

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/billing.test.ts` — covers BILL-01, BILL-02, BILL-07: checkout session creation, portal session creation
- [ ] `tests/unit/webhookHandler.test.ts` — covers BILL-03, BILL-04, BILL-05, BILL-06, BILL-08: all event types, idempotency, signature verification, membership upsert
- [ ] `tests/unit/proxyMembership.test.ts` — covers BILL-09: proxy redirects cancelled/past-due members, passes active members
- [ ] `tests/unit/checkoutSuccess.test.ts` — covers Success Criterion 1: Realtime polling component state transitions
- [ ] `supabase/migrations/0002_webhook_events.sql` — `webhook_events` table + `UNIQUE(user_id)` constraint on `memberships`
- [ ] `.env.local` entries: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_VIP`, `STRIPE_PRICE_ID_BASIC`

---

## Sources

### Primary (HIGH confidence)

- [Stripe Checkout Quickstart — official docs](https://docs.stripe.com/checkout/quickstart?client=next) — Session creation parameters verified
- [Stripe Webhooks — official docs](https://docs.stripe.com/webhooks) — Signature verification, retry behavior, idempotency
- [Stripe Customer Portal — official docs](https://docs.stripe.com/customer-management/integrate-customer-portal) — Portal session creation, webhook events on plan change
- [Stripe Subscription Price Change — official docs](https://docs.stripe.com/billing/subscriptions/change-price) — Proration behavior options
- [Supabase Realtime JavaScript subscribe — official docs](https://supabase.com/docs/reference/javascript/subscribe) — Channel setup, filter syntax, cleanup
- [Supabase Postgres Changes — official docs](https://supabase.com/docs/guides/realtime/postgres-changes) — Publication setup requirement, RLS behavior
- [Stripe API Versioning — official docs](https://docs.stripe.com/api/versioning) — Current API version is `2026-02-25.clover`
- [stripe npm package](https://www.npmjs.com/package/stripe) — Latest version 20.4.1

### Secondary (MEDIUM confidence)

- [Stripe Webhook Handling — Supabase Docs](https://supabase.com/docs/guides/functions/examples/stripe-webhooks) — `request.text()` pattern for raw body verified with official Supabase example
- [Next.js App Router + Stripe Webhook Signature Verification — Medium](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) — `request.text()` pattern cross-verified

### Tertiary (LOW confidence — for awareness only)

- Various blog posts on Stripe + Next.js 15/16 — used to confirm community consensus on patterns, not used as authoritative source for code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via npm, official Stripe docs, existing package.json
- Architecture patterns: HIGH — code patterns verified against official Stripe and Supabase docs
- Pitfalls: HIGH — all pitfalls verified against official docs (raw body requirement, publication requirement, idempotency recommendation)
- Open questions: MEDIUM — known unknowns flagged for resolution during planning

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (30 days — Stripe API stable, Supabase Realtime API stable)
