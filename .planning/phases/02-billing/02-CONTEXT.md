# Phase 2: Billing - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Stripe subscriptions wired end-to-end with webhook sync. A user who pays gets active membership in Supabase within seconds, and lifecycle events (cancellation, payment failure, upgrade/downgrade) update status in real-time. Per-session payments, day passes, and cash payment tracking are explicitly out of scope — deferred to Phase 3 and Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Checkout experience
- Dedicated `/pricing` page (public — visible to guests and all users) with side-by-side plan cards (VIP $50/mo vs Basic $35/mo) and feature comparison bullets
- Context-aware pricing page: logged-in + no plan shows 'Subscribe' CTAs; logged-in + active plan shows current plan highlighted + 'Manage' button; guest shows 'Sign up to subscribe' CTAs
- Confirmation step before Stripe Checkout — Claude designs the content (plan summary, price, billing details)
- Logged-in user clicks plan CTA → sees confirmation step → proceeds to Stripe Checkout
- Guest clicks plan CTA → redirected to /signup with selected plan in URL param → after signup redirected back to /pricing with plan pre-selected
- Abandoned Stripe Checkout → redirect back to /pricing with subtle message: 'No worries — you can subscribe anytime.'
- Minimal trust signals: 'Secured by Stripe' badge near payment CTA, no testimonials
- Dashboard includes a pricing widget for unsubscribed users — Claude decides simplified banner vs full cards
- 'Pricing' link always visible in Navbar — Claude decides whether it changes to 'My Plan' for active members
- Feature differentiation between plans — Claude decides based on requirements (location access is the key differentiator per spec)

### Post-checkout flow
- Animated pending state page after Stripe Checkout return — 'Processing your membership...' with loading animation
- Supabase Realtime listener detects when webhook sets membership to active, then transitions to success celebration
- Success celebration design — Claude's discretion (should match brand energy: Electric Lime, Caribbean vibrancy)
- Timeout handling: after 30 seconds, show reassurance message: 'This is taking a bit longer than usual. Your payment was received — your membership will activate shortly.' + 'Check status' button that refreshes
- Post-checkout CTAs after success: 'Reserve a Court' and 'Go to Dashboard'

### Subscription management
- Stripe Customer Portal for ALL subscription management (upgrade, downgrade, cancel, update payment method, billing history)
- 'Manage Subscription' button lives on a membership status card on the dashboard
- Dashboard membership card shows: plan name, renewal date, status, and 'Manage Subscription' button
- Cancellation state: dashboard card shows 'Your [Plan] membership is active until [date]. After that, you'll lose access to court reservations.' + 'Reactivate' button
- Payment failure: prominent warning banner on dashboard: 'Payment failed — update your payment method to keep your membership.' Link to Stripe Portal. Stripe's built-in dunning emails also handle notification.
- Past-due members: new reservations blocked immediately, existing reservations honored
- Re-subscription for lapsed members — Claude's discretion (Stripe Portal reactivation or /pricing checkout)

### Membership gating (hardening Phase 1 stub)
- `proxy.ts` stub (`isSubscribed = false`) must be replaced with real memberships table query
- Unsubscribed users accessing `/member/*` redirected to `/pricing` (pattern established in Phase 1)

### Claude's Discretion
- Confirmation step content and design
- Dashboard pricing widget layout (banner vs cards)
- Navbar 'Pricing' vs 'My Plan' label for active members
- Plan feature differentiation bullet points
- Success celebration animation and design
- Re-subscription flow for lapsed members
- Exact Realtime subscription channel configuration

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `proxy.ts`: Already has membership gating stub at line 48-67 with commented-out real query — Phase 2 hardens this
- `lib/supabase/admin.ts`: `supabaseAdmin` client with service_role — webhook handler will use this to bypass RLS
- `lib/supabase/server.ts`: Server-side Supabase client for auth-aware queries
- `lib/supabase/client.ts`: Browser Supabase client — Realtime listener will use this
- `components/Navbar.tsx`: Exists — 'Pricing' link can be added here
- `app/actions/auth.ts`: Server Actions pattern established — billing actions follow same pattern
- `messages/en.json` / `messages/es.json`: i18n message files with existing `plansHeading` key in signup namespace

### Established Patterns
- Next.js App Router with route groups: `(marketing)`, `(auth)`, `(member)`, `(admin)`
- Server Actions for form submissions (auth.ts pattern)
- `@supabase/ssr` for SSR auth with cookie handling
- `next-intl` for i18n with `[locale]` route segment
- Brand identity: Electric Lime `#39FF14`, Midnight Blue `#0B1D3A`, Caribbean Turquoise `#1ED6C3`, Sunset Orange `#FF6B2C`
- Typography: Bebas Neue (headings), Inter (body), Poppins (accent)

### Integration Points
- `/pricing` page goes in `(marketing)` route group (public page)
- Post-checkout page goes in `(auth)` or `(member)` route group
- Dashboard membership card goes in `(member)/dashboard`
- Webhook endpoint at `app/api/stripe/webhook/route.ts` (outside `[locale]` — API route)
- `memberships` table already exists with schema supporting subscription status
- `webhook_events` table for idempotency (created in Phase 2 migration)

</code_context>

<specifics>
## Specific Ideas

- Phase 1 signup page already has optional plan selection cards (side-by-side, VIP + Basic) — pricing page should be consistent with this design
- Brand energy should carry through to the post-checkout celebration — not a generic "success" page
- The pending → active state machine should feel responsive and trustworthy, not like the system is broken

</specifics>

<deferred>
## Deferred Ideas

- **Per-session payment ($10/session via Stripe one-time payment)** — Phase 3 (Reservations). Anyone can pay per-session, not just members. User selects time slot first, then pays via Stripe. Online booking = Stripe only.
- **Walk-in cash payments (admin-handled)** — Phase 3/4. Admin checks availability, creates reservation on behalf of walk-in, collects cash, records payment. Walk-in player doesn't need an account.
- **Admin-configurable time ranges per location** — Phase 3. Admin sets operating hours for each location.
- **4 slots per court per time block** — Phase 3. Max capacity = 4 players per court per time slot.
- **1-hour fixed reservation duration** — Phase 3.
- **Two reservation modes by time of day** — Phase 3:
  - Full court rental (e.g., 9 AM–4 PM) — one group books the entire court
  - Open play / individual spots (e.g., 5–8 PM) — users claim individual spots for duos or pickup games with others
- **Day pass purchase flow** — Future phase. Schema support already in `memberships` table from Phase 1.
- **Cash payment tracking (admin UI)** — Phase 4 (Admin & CMS).

</deferred>

---

*Phase: 02-billing*
*Context gathered: 2026-03-08*
