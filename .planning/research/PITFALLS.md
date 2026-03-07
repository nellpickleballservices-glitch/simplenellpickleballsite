# Pitfalls Research

**Domain:** Sports club membership + court reservation platform (Next.js App Router + Supabase + Stripe)
**Researched:** 2026-03-07
**Confidence:** HIGH (training data through Aug 2025 covers all technologies at their current stable versions; these are well-documented production failure modes)

---

## Critical Pitfalls

### Pitfall 1: Supabase Auth Cookie Handling — Using `createClient` Instead of `createServerClient`

**What goes wrong:**
Developers import `createClient` from `@supabase/supabase-js` directly in Server Components, API routes, and middleware instead of using `@supabase/ssr`'s `createServerClient`. The result: the server reads an empty session every request (user appears logged out), auth state is never persisted across navigation, and Server Components always render the unauthenticated state.

**Why it happens:**
The old `@supabase/auth-helpers-nextjs` package had `createServerComponentClient`, `createRouteHandlerClient`, etc. These were deprecated in favor of a single `createServerClient` from `@supabase/ssr`. Tutorials and AI completions still reference the old API. The import works without a type error, so the failure is silent until runtime.

**How to avoid:**
- Use `@supabase/ssr` exclusively for server-side clients. Never use `@supabase/supabase-js`'s `createClient` in Server Components or Route Handlers.
- Create two utility files at project start: `utils/supabase/server.ts` (using `createServerClient` with `cookies()`) and `utils/supabase/client.ts` (using `createBrowserClient` for Client Components).
- Middleware must use `createServerClient` and both read AND write cookies: read to get the session, write because Supabase rotates tokens on every request. If middleware only reads, tokens expire and users get randomly logged out.

```typescript
// utils/supabase/middleware.ts — correct pattern
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)  // MUST write to response
          })
        },
      },
    }
  )
  await supabase.auth.getUser()  // triggers token refresh if needed
  return response
}
```

**Warning signs:**
- `getSession()` returns `null` in Server Components when the user is clearly logged in
- Users randomly get logged out after ~1 hour (token expiry without refresh)
- Middleware auth checks always redirect to login
- `supabase.auth.getUser()` works in Client Components but not Server Components

**Phase to address:** Phase 1 (Authentication foundation) — set up both client files before writing any auth-dependent code.

---

### Pitfall 2: Supabase Middleware — Trusting `getSession()` for Auth Decisions

**What goes wrong:**
`supabase.auth.getSession()` reads the session from the cookie without re-validating it with the Supabase server. An attacker can forge or replay a cookie. Middleware that gates admin routes using `getSession()` can be bypassed. Production applications must use `supabase.auth.getUser()` for all security-critical auth checks.

**Why it happens:**
`getSession()` is faster (no network call) and appears equivalent to `getUser()`. The Supabase docs now explicitly warn against this but many tutorials still use `getSession()`. The distinction is invisible in development where sessions are fresh and valid.

**How to avoid:**
- Use `supabase.auth.getUser()` in middleware and in every Server Component or Route Handler that makes an authorization decision.
- Reserve `getSession()` only for display purposes (e.g., showing the user's name in a Client Component) where security is not at stake.
- For the admin panel route group, always call `getUser()` + verify `user.app_metadata.role === 'admin'` before rendering.

**Warning signs:**
- Middleware uses `getSession()` to decide whether to redirect to login
- Admin route protection relies on data stored in JWT claims without re-validation
- Security audit flags unvalidated session reads

**Phase to address:** Phase 1 (Authentication foundation) — establish the `getUser()` pattern immediately, before any protected routes exist.

---

### Pitfall 3: Stripe Webhooks — Missing Events and Out-of-Order Processing

**What goes wrong:**
The Stripe webhook handler only listens for `checkout.session.completed` and `invoice.payment_succeeded`. In production, subscriptions pass through many more events: `customer.subscription.updated` (plan change), `customer.subscription.deleted` (cancellation), `invoice.payment_failed` (payment failure), `customer.subscription.trial_will_end`. Missing these means a cancelled subscription remains "active" in Supabase — the member can still book courts after cancelling.

Additionally, Stripe does not guarantee event delivery order. A `customer.subscription.updated` for a cancellation may arrive before `customer.subscription.created`. Code that checks `if subscription.status === 'active'` and writes to the DB without considering event ordering will produce stale data.

**Why it happens:**
Tutorials show the minimal happy path. Developers test locally using `stripe listen` which replays events correctly. Production traffic arrives in bursts after network delays, causing out-of-order delivery.

**How to avoid:**
Handle at minimum these events:
```
checkout.session.completed         → provision new subscription
customer.subscription.created      → set membership to active
customer.subscription.updated      → handle plan changes, status changes
customer.subscription.deleted      → revoke membership immediately
invoice.payment_succeeded          → confirm renewal
invoice.payment_failed             → mark payment_past_due, send notification
customer.subscription.trial_will_end → reminder (if trials added later)
```

For out-of-order safety, never use the webhook event's timestamp to order writes. Instead: fetch the current state from Stripe API inside the handler (`stripe.subscriptions.retrieve(subscriptionId)`) and write that authoritative state to Supabase. This way, even if events arrive out of order, you always write the current truth.

Use idempotency: store `stripe_event_id` in a `webhook_events` table and check for duplicates before processing. Stripe retries failed webhooks up to 3 days — duplicate processing a cancellation twice is harmless, but duplicate processing a plan upgrade could cause double credits.

**Warning signs:**
- Subscription table only updates on payment events, not on cancellation events
- No `webhook_events` deduplication table exists
- Webhook handler has fewer than 5 event types handled
- Manual Stripe dashboard checks reveal mismatches with Supabase membership status

**Phase to address:** Phase 2 (Membership + Stripe) — build the full event handler before accepting live payments.

---

### Pitfall 4: Stripe Webhook Security — Skipping Signature Verification

**What goes wrong:**
The `/api/webhooks/stripe` route handler does not verify the `Stripe-Signature` header. Any HTTP request to that endpoint can trigger membership provisioning or cancellation. An attacker can POST a fake `customer.subscription.deleted` event to cancel every user's membership, or a fake `checkout.session.completed` to grant free memberships.

**Why it happens:**
In development, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` signs events automatically. Developers don't notice signature verification is missing until production. Next.js App Router complicates this: verification requires the raw request body, but `request.json()` parses it. Calling `request.json()` before `stripe.webhooks.constructEvent()` destroys the raw body and verification always fails.

**How to avoid:**
```typescript
// CORRECT — App Router webhook handler
export async function POST(request: Request) {
  const body = await request.text()  // raw body, NOT request.json()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  // process event...
}
```

Also: use separate webhook secrets for development (`stripe listen` generates one) and production (Stripe Dashboard generates another). Store the production secret in Vercel environment variables, never in source code.

**Warning signs:**
- Webhook handler calls `request.json()` before `constructEvent`
- `STRIPE_WEBHOOK_SECRET` environment variable is absent or the same for dev and prod
- Webhook endpoint is not rate-limited or IP-restricted

**Phase to address:** Phase 2 (Membership + Stripe) — non-negotiable before going live.

---

### Pitfall 5: Court Reservation Double-Booking — Race Condition Without Locks

**What goes wrong:**
Two members simultaneously check court availability, both see a slot as available, both submit reservations within milliseconds of each other. The application checks availability in JavaScript, then inserts if available — but without a database-level lock, both inserts succeed and the court is double-booked.

This is the single most critical bug for a reservation platform. It will happen at launch if courts become popular.

**Why it happens:**
The naïve implementation is:
```sql
-- Step 1 (read): SELECT count(*) FROM reservations WHERE court_id = X AND slot = Y
-- Step 2 (write): INSERT INTO reservations IF count = 0
```
Between Step 1 and Step 2 of Request A, Request B can complete both steps. Both insert.

**How to avoid:**
Use a Postgres unique constraint + conflict handling. This pushes the race condition check to the database engine, which handles concurrent writes atomically:

```sql
-- Schema
ALTER TABLE reservations
  ADD CONSTRAINT no_double_booking
  UNIQUE (court_id, session_start_time);

-- Or with a partial index for only active reservations:
CREATE UNIQUE INDEX reservations_no_double_book
  ON reservations (court_id, session_start_time)
  WHERE status != 'cancelled';
```

Then in the API Route Handler:
```typescript
const { data, error } = await supabase
  .from('reservations')
  .insert({ court_id, session_start_time, user_id, ... })

if (error?.code === '23505') {  // unique_violation
  return NextResponse.json({ error: 'This slot was just taken.' }, { status: 409 })
}
```

For more complex scenarios (configurable session lengths that overlap), use a Postgres exclusion constraint with `tstzrange`:
```sql
ALTER TABLE reservations
  ADD CONSTRAINT no_overlapping_reservations
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(session_start_time, session_end_time, '[)') WITH &&
  )
  WHERE (status != 'cancelled');
```
This requires the `btree_gist` extension (`CREATE EXTENSION btree_gist`).

**Warning signs:**
- Availability check is done in application code before insert
- No unique constraint or exclusion constraint on `(court_id, session_start_time)`
- Tests only test sequential requests, never concurrent ones
- No `23505` error handling in the reservation API

**Phase to address:** Phase 3 (Court reservation system) — design the schema with the constraint from day one, not as an afterthought.

---

### Pitfall 6: Supabase Row Level Security — Policies That Expose Data or Block Legitimate Access

**What goes wrong:**
Two failure modes:

**Over-permissive (data exposure):** RLS is enabled but policies are written as `USING (true)` or use `auth.uid()` checks only on write operations, not reads. Any authenticated user can read any other user's reservation history, membership details, or personal information.

**Over-restrictive (broken features):** Policies check `auth.uid() = user_id` but the admin user operations run with the anon key (same RLS applies). Admin can't view all reservations, can't cancel any reservation, can't see membership data. The admin panel silently returns empty results.

**Why it happens:**
RLS is added as a compliance checkbox late in development. Policies are written without testing both the member role and the admin role against them. Supabase Studio shows data because Studio uses the service role key, which bypasses RLS — developers never see the access failures that real users will hit.

**How to avoid:**

Define roles clearly upfront:
- `anon`: can read public content (courts, events, about page)
- `authenticated`: can read/write own data only
- `admin`: can read/write all data (implemented via `auth.jwt() ->> 'role' = 'admin'` or a profiles table check)

Standard pattern for reservations:
```sql
-- Members can only see their own reservations
CREATE POLICY "members_read_own_reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all reservations
CREATE POLICY "admins_read_all_reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Members can insert their own reservations
CREATE POLICY "members_insert_own_reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Members can only cancel their own future reservations
CREATE POLICY "members_cancel_own_reservations"
  ON reservations FOR UPDATE
  USING (auth.uid() = user_id AND session_start_time > now())
  WITH CHECK (status = 'cancelled');
```

Test RLS policies using Supabase's SQL editor with `SET ROLE authenticated; SET LOCAL request.jwt.claims = '{"sub":"user-uuid-here"}';` to simulate different users — do not rely on the Studio UI which uses service role.

**Warning signs:**
- RLS policies added after tables are populated (not from the start)
- Admin operations use the anon key (not service role in Route Handlers)
- No test that verifies User A cannot read User B's data
- Policy only covers INSERT/UPDATE, not SELECT
- Admin panel shows empty lists intermittently

**Phase to address:** Phase 1 (Database schema + auth) — write RLS policies simultaneously with table creation.

---

### Pitfall 7: Admin Role Management — Over-Permissioning and Single-Layer Checks

**What goes wrong:**
Admin access is controlled at only one layer (e.g., only in the Next.js middleware redirect, or only in the UI). If the middleware check is misconfigured, admin API routes are reachable by any authenticated user. Alternatively, the admin role is stored only in the JWT claims, which are set at signup and never updated — promoting an existing user to admin requires a database migration.

A common specific mistake: storing `role: 'admin'` only in `user_metadata` (client-writable) rather than `app_metadata` (server-only). Any user can call `supabase.auth.updateUser({ data: { role: 'admin' } })` and grant themselves admin access.

**Why it happens:**
Auth role documentation conflates `user_metadata` (user can write) and `app_metadata` (only service role can write). Tutorials often store roles in `user_metadata` for simplicity.

**How to avoid:**
- Store admin role in a `profiles` table with RLS policies — not in JWT metadata alone. The profiles table is the authoritative source.
- Admin API routes must re-verify admin status on every request using the service role client (which bypasses RLS) or by checking `profiles.role` via a verified `getUser()` call.
- Do not store admin role in `user_metadata`. If using JWT claims for role, populate `app_metadata` using a Supabase service role call or database webhook — `app_metadata` cannot be written by client code.
- Implement three layers: (1) middleware redirect, (2) Route Handler authorization check, (3) RLS policy.

**Warning signs:**
- Admin role stored in `user_metadata` not `app_metadata`
- Admin API routes only check if user is authenticated, not if they're admin
- Promoting a user to admin requires manual SQL or a new deployment
- Admin panel accessible via direct URL if middleware is bypassed

**Phase to address:** Phase 1 (Auth + roles) and Phase 4 (Admin panel) — define role storage strategy in Phase 1, enforce it in Phase 4.

---

### Pitfall 8: Leaflet + Next.js App Router — `window is not defined` SSR Error

**What goes wrong:**
Leaflet reads `window` and `navigator` at module load time. Importing Leaflet in a Server Component (or in a file that gets bundled for SSR) throws `ReferenceError: window is not defined` and crashes the entire page — not just the map component.

**Why it happens:**
App Router renders all components on the server by default. `import L from 'leaflet'` at the top of a component file executes during SSR before `window` exists. The error is confusing because it manifests as a build error or a cryptic runtime error, not a "Leaflet loaded incorrectly" error.

**How to avoid:**
```typescript
// MapComponent.tsx — must be a Client Component
'use client'

import { useEffect, useRef } from 'react'
// Do NOT import leaflet at module level — import inside useEffect:
export function CourtMap({ courts }: Props) {
  const mapRef = useRef(null)

  useEffect(() => {
    import('leaflet').then((L) => {
      // initialize map here
    })
  }, [])
}
```

Better yet, use `next/dynamic` with `ssr: false`:
```typescript
// courts/page.tsx (Server Component)
import dynamic from 'next/dynamic'

const CourtMap = dynamic(
  () => import('@/components/CourtMap'),
  { ssr: false, loading: () => <div>Loading map...</div> }
)
```

Also: Leaflet's default marker icons break in Next.js because the image paths use `__dirname` which doesn't resolve correctly in webpack bundles. Fix by manually setting icon URLs after import:
```typescript
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon.src, shadowUrl: markerShadow.src })
```

Also import `leaflet/dist/leaflet.css` in the component or global CSS — forgetting this makes the map render without styles (controls overlap, tiles misaligned).

**Warning signs:**
- `window is not defined` error in build logs or runtime
- Map container renders but tiles never appear
- Marker icons show as broken images
- Map CSS imported in component but `leaflet.css` is not

**Phase to address:** Phase 3 (Court map feature) — use `dynamic` with `ssr: false` from the first line of map component code.

---

### Pitfall 9: Session Reminder Cron — Supabase Edge Function Timing Unreliability

**What goes wrong:**
The session reminder ("Your pickleball session ends in 10 minutes") is implemented as a Supabase Edge Function triggered on a pg_cron schedule (e.g., every 5 minutes). In practice: (1) pg_cron runs at the scheduled interval but not at a guaranteed sub-minute offset — a reminder scheduled for "10 minutes before end" may fire 5-14 minutes before; (2) if the Edge Function errors silently, reminders are never sent and no alert fires; (3) sessions that start/end while the cron is running may be missed entirely.

**Why it happens:**
pg_cron's minimum resolution is 1 minute. A cron that runs every minute and looks for sessions ending in 10 minutes has ±30 seconds of accuracy — acceptable. But "every 5 minutes" has ±2.5 minutes of accuracy. Developers set "every 5 minutes" to reduce load and don't account for the window shift.

**How to avoid:**
- Run the reminder cron every 1 minute (not every 5). The query is lightweight: `WHERE session_end_time BETWEEN now() + interval '9 minutes' AND now() + interval '11 minutes' AND reminder_sent = false`.
- Use a `reminder_sent` boolean column on reservations — update it atomically in the same transaction as sending the email. This prevents double-sends on retry.
- Add a `reminder_sent_at` timestamp for auditing.
- Log Edge Function invocations to a `cron_runs` table: `{ function_name, invoked_at, reminders_sent, errors }`. Without this, you have no visibility into whether the cron is running.
- For the actual email send, use Resend's API (not Supabase's built-in email which is rate-limited). Wrap the send in a try/catch and mark `reminder_failed = true` if it errors — don't let email failures crash the entire cron run.

```sql
-- Schema additions
ALTER TABLE reservations ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN reminder_sent_at TIMESTAMPTZ;
```

**Warning signs:**
- No `reminder_sent` flag — duplicate reminders are possible
- Cron function has no logging table — failures are invisible
- Cron interval is > 1 minute with a 10-minute reminder window
- Email send failure causes the cron to error, leaving `reminder_sent = false` so it retries forever

**Phase to address:** Phase 3 (Reservations + notifications) — build the `reminder_sent` flag and logging into the initial schema.

---

### Pitfall 10: Bilingual i18n — next-intl Hydration Mismatches and Missing Translations

**What goes wrong:**
The most common bilingual i18n mistake with Next.js App Router: using `useTranslations()` in a Server Component that renders different content based on the Accept-Language header, but the client hydrates with a different locale determination. This causes React hydration mismatches that surface as flickering text or console errors.

Second common mistake: missing translation keys fall back to the key string (`"member.dashboard.greeting"` appears literally in the UI) because error boundaries for missing translations aren't configured.

Third: hardcoding Spanish text in JSX components while "planning to add i18n later." Extracting strings after the fact is expensive — every component must be touched.

**Why it happens:**
i18n is added as a "Phase 2 feature" after most components are written. The locale routing with App Router requires a specific middleware + `[locale]` folder structure that must be set up before writing any components — retrofitting it touches every page file.

**How to avoid:**
- Set up `next-intl` (or `next-i18next` for App Router, though `next-intl` is the current recommended choice) in Phase 1, before writing any user-facing text.
- Use the `[locale]` folder structure from the start: `app/[locale]/page.tsx`, `app/[locale]/layout.tsx`.
- Create translation files immediately: `messages/es.json` and `messages/en.json`. Even if they only have one key, the infrastructure is in place.
- Configure a TypeScript-typed `t()` function — this causes a compile error for missing keys rather than a silent runtime fallback.
- Locale detection: use the `Accept-Language` header in middleware to determine locale, store in a cookie so it's stable across SSR and client hydration.
- Dominican Republic context: Spanish is primary. Default locale should be `es`. English is secondary. Do not use browser detection as the primary mechanism — many Dominican users have English-language browsers.

**Warning signs:**
- Hardcoded Spanish strings in JSX (`<h1>Reserva tu cancha</h1>`)
- i18n added after Phase 1
- Translation files missing keys that exist in the other language
- `useTranslations()` called in Server Components without the locale passed explicitly
- Flickering text on page load (hydration mismatch)

**Phase to address:** Phase 1 (Project scaffolding) — folder structure and translation infrastructure before any UI components.

---

### Pitfall 11: Content Blocks CMS Pattern — Schema That Becomes Unmaintainable

**What goes wrong:**
The `content_blocks` table starts as:
```sql
CREATE TABLE content_blocks (
  id uuid, page text, block_key text, content text, updated_at timestamptz
);
```
Within 3 months this becomes unmaintainable because:
1. Some blocks need rich text (HTML), some need plain text, some need image URLs, some need arrays of items (FAQ entries). The `content text` column can't express this.
2. Bilingual content requires either two rows per block (`block_key + lang`) or a JSON column — developers pick inconsistently.
3. Admin UI for editing arbitrary JSON is unusable without a schema definition per block type.
4. No ordering mechanism — FAQ items sort randomly.

**Why it happens:**
Content blocks are modeled as a generic key-value store because it feels flexible. The flexibility becomes a liability when content types diverge.

**How to avoid:**
Model content blocks with explicit type awareness:
```sql
CREATE TABLE content_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page        text NOT NULL,           -- 'home', 'about', 'learn', 'faq'
  block_key   text NOT NULL,           -- 'hero_title', 'hero_subtitle', 'faq_items'
  block_type  text NOT NULL,           -- 'text', 'richtext', 'image_url', 'json_array'
  content_es  text,                    -- Spanish content
  content_en  text,                    -- English content
  sort_order  integer DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id),
  UNIQUE (page, block_key)
);
```

For complex blocks (FAQ with question+answer pairs, event cards), use `content_es jsonb` / `content_en jsonb` with a defined JSON schema per `block_type`. Store the schema definition in code (TypeScript types) so the admin UI knows how to render the appropriate editor.

Limit the scope: only the pages specified in PROJECT.md need this (About, Rules/Learn, FAQ, Homepage). Do not build a generic CMS — build a targeted editor for known content types.

**Warning signs:**
- `content_blocks` has a single `content text` column
- No `block_type` field — admin UI can't know what editor to show
- No `sort_order` — FAQ items have no stable order
- No language columns — bilingual support retrofitted with `_es`/`_en` suffix rows
- The `content` column stores raw HTML with `<script>` tags possible (XSS risk)

**Phase to address:** Phase 4 (Admin panel + CMS) — design the full schema before building the admin UI, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip RLS on content_blocks table | Faster development | Any authenticated user can edit CMS content | Never — add RLS from creation |
| Use service role key in client-side code | Skip auth complexity | Full database access leaked to browser; catastrophic security breach | Never |
| Hardcode subscription price IDs | Avoids admin price management UI | Price change requires code deployment | MVP only — add Stripe product lookup before launch |
| Call `getSession()` instead of `getUser()` for auth checks | Saves one network round-trip | Session forgery bypass on auth-gated routes | Never for security decisions |
| Use `any` TypeScript type for Supabase rows | Faster early development | Database schema changes break silently at runtime | Never — use `supabase gen types typescript` from day one |
| Skip webhook idempotency table | Simpler webhook handler | Stripe retry loops cause duplicate membership operations | Never — add from day one |
| Store Stripe `customer_id` only in Stripe metadata, not in Supabase | Less schema design | Every subscription lookup requires a Stripe API call; slow and rate-limited | Never — always mirror in Supabase |
| Use `next-intl` only in Client Components | Skip server-side i18n complexity | Server-rendered text is not translated; SEO impact for Spanish content | Never for user-facing text |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase + Next.js | Using `createClient` from `@supabase/supabase-js` in Server Components | Use `createServerClient` from `@supabase/ssr` with cookie read/write |
| Stripe Webhooks + Next.js App Router | Calling `request.json()` before `constructEvent()` destroys the raw body | Use `request.text()` then pass to `constructEvent()` |
| Stripe + Supabase | Writing webhook data directly from event payload without re-fetching | Call `stripe.subscriptions.retrieve()` inside handler for authoritative state |
| Stripe Customer Portal | Redirecting to portal without creating a Billing Portal Configuration in Stripe Dashboard | Configure allowed features (cancel, upgrade, payment method update) in Dashboard first |
| Leaflet + Next.js | Static import of leaflet in any file that SSR touches | Dynamic import with `ssr: false` using `next/dynamic` |
| Supabase Storage + RLS | Uploading files without a storage bucket policy | Set bucket to private + add RLS policy; public bucket exposes all files to anyone with a URL |
| Supabase Edge Functions + Resend | Not setting `RESEND_API_KEY` as a Supabase secret | Use `supabase secrets set RESEND_API_KEY=...` — env vars not available without this |
| Stripe Checkout + Supabase | Not storing `checkout_session_id` before redirect | On payment success, webhook may arrive before user returns; must handle both paths |
| next-intl + App Router | Using `useTranslations()` in Server Components without the locale parameter | Always pass locale explicitly; use `getTranslations({ locale })` in Server Components |
| Supabase pg_cron + Edge Functions | Invoking Edge Functions from pg_cron via `pg_net` without error handling | Wrap in try/catch; log results; `pg_net` calls are fire-and-forget by default |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries in reservation list | Admin "all reservations" page loads slowly; each reservation triggers a user profile query | Use Supabase joins: `reservations.select('*, profiles(first_name, last_name)')` | 50+ reservations |
| No database index on `(court_id, session_start_time)` | Availability check slows as reservations table grows | Add index at schema creation time, not after complaints | ~10,000 reservations |
| Fetching all content_blocks on every page render | CMS pages slow on each request | Cache with Next.js `revalidate` or use ISR; CMS content changes infrequently | Every page load |
| Leaflet loading all court markers on initial render | Map interactive delay with many courts | Cluster markers with `leaflet.markercluster`; only render visible viewport | 20+ courts |
| Stripe API calls in middleware | Every request that hits middleware calls Stripe API | Mirror all needed Stripe data in Supabase; never call Stripe from middleware | Every page load |
| Real-time subscription on reservations table for all users | Supabase Realtime connection limit hit | Use realtime only for the user's own reservations with a filter | 100+ concurrent users |
| Storing large base64 images in content_blocks | CMS page response huge; slow admin editor | Store images in Supabase Storage; store URL in content_blocks | Any image > 100KB |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `STRIPE_SECRET_KEY` in client-side code or `.env.local` committed to git | Full Stripe account access; attacker can issue refunds, create charges | Never expose secret key; add `.env.local` to `.gitignore` before first commit |
| RLS policies missing on INSERT but present on SELECT | Users can insert data as other users (e.g., reservation for another user's `user_id`) | Every table needs policies for ALL operations: SELECT, INSERT, UPDATE, DELETE |
| Admin role in `user_metadata` (user-writable) | Any user can promote themselves to admin via `supabase.auth.updateUser()` | Store role in `app_metadata` (service-role-only write) or in `profiles` table with strict RLS |
| Content blocks XSS via unsanitized HTML | Admin-entered richtext with `<script>` executed by members' browsers | Sanitize HTML with DOMPurify before storing; or use a structured richtext format (tiptap output JSON) |
| Webhook endpoint without rate limiting | DoS via webhook flood; database overloaded | Vercel Edge Config rate limiting or Upstash Redis rate limiter on `/api/webhooks/*` |
| No login rate limiting | Brute-force credential attacks | Supabase has built-in rate limiting on auth endpoints, but custom login flows need explicit limiting |
| Storing `stripe_customer_id` without verifying it matches the authenticated user | Horizontal privilege escalation — user modifies their own Stripe customer to another user's | Always derive `stripe_customer_id` from the authenticated user's profile record; never accept it from client input |
| Supabase Storage bucket set to public for court images | Any URL holder can access all uploaded images without auth | Use private buckets with signed URLs (expires after 1 hour) for member-uploaded content |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Reserving a slot that gets double-booked — error shown after payment attempt | User confused; trust broken; may think they lost money | Check availability immediately on slot selection; disable slot button on optimistic lock; show "Just taken" error before payment |
| Stripe redirect timeout — user clicks "Subscribe" but Stripe Checkout takes 3+ seconds to redirect | User clicks again, creating duplicate checkout sessions | Show immediate loading state on Subscribe button; disable after first click; use `stripe.redirectToCheckout()` with timeout feedback |
| Cancellation window confusion — user tries to cancel 25 minutes before session but cutoff is 30 minutes | User sees generic "cannot cancel" error | Show the exact cutoff time on the reservation card ("Cancel by 2:30 PM"); explain in the error message |
| Membership required gate without clear path to subscribe | User clicks "Reserve Court" → gets "Members only" error → no CTA to subscribe | Gate page must include direct link to membership signup; never dead-end |
| Password reset email in English for Spanish-primary users | Confusion; user thinks it's spam | Configure Supabase email templates in Spanish; use bilingual templates |
| Session reminder email sent in English to Spanish-speaking members | Low open rates; reminder misunderstood | Send reminder in user's preferred language (stored in profile); default to Spanish |
| Court map loads before CSS — unstyled tiles | Jarring visual on page load | Import `leaflet.css` in `_app.tsx` or global CSS, not lazily with the component |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stripe Webhooks:** Handler exists and logs events, but only handles `checkout.session.completed` — verify all 5+ subscription lifecycle events are handled.
- [ ] **Double-booking prevention:** Reservations insert successfully in testing — verify a unique constraint or exclusion constraint exists in the database schema (application-level checks are insufficient).
- [ ] **RLS policies:** All tables show data in Supabase Studio — verify policies exist for each operation (SELECT, INSERT, UPDATE, DELETE) and test with a non-admin user session.
- [ ] **Admin route protection:** Admin panel is hidden in the UI — verify the Route Handlers in `/api/admin/*` reject non-admin authenticated requests (not just unauthenticated ones).
- [ ] **Webhook signature verification:** Webhook endpoint processes events — verify `stripe.webhooks.constructEvent()` is called and a failed verification returns 400 (not silently ignored).
- [ ] **Bilingual email templates:** Transactional emails send successfully — verify Supabase email templates (password reset, confirmation) are in Spanish, not the default English templates.
- [ ] **Session reminder deduplication:** Reminder cron runs — verify `reminder_sent = true` is written atomically and a second cron run does not re-send the reminder.
- [ ] **Content blocks XSS:** Rich text saves and displays — verify HTML is sanitized before storage (search for `dangerouslySetInnerHTML` and confirm a sanitizer wraps it).
- [ ] **Leaflet SSR:** Map renders — verify `next/dynamic` with `ssr: false` is used (search for `import L from 'leaflet'` at module scope — should not exist).
- [ ] **Stripe customer_id storage:** Subscriptions process — verify `stripe_customer_id` is stored in the `profiles` table and looked up from there, never accepted from client-side input.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-booking discovered in production | HIGH | Add unique constraint (requires deduplication of existing conflicts first); audit all double-booked slots; issue manual refunds or resolutions; notify affected members |
| RLS misconfiguration exposes user data | HIGH | Immediately add correct RLS policies; audit access logs for the exposure window; notify affected users per GDPR/local regulations; document the incident |
| Stripe webhooks missed (subscription not cancelled) | MEDIUM | Build a Stripe reconciliation script: list all Stripe subscriptions, compare with Supabase memberships, patch mismatches; add to ops runbook |
| Admin role in `user_metadata` — unauthorized admin access | HIGH | Migrate role to `app_metadata` via service role; audit actions taken by elevated accounts; rotate Supabase service role key if compromised |
| Missing i18n — hardcoded strings throughout | MEDIUM | Systematic extraction using `i18n-ally` VS Code extension; create translation files; update each component; plan 2-3 days of work per 100 components |
| Webhook signature not verified — fake events processed | HIGH | Add signature verification immediately; audit processed webhook log for suspicious events; reverse any fraudulent membership grants |
| `window is not defined` Leaflet crash in production | LOW | Wrap in `dynamic()` with `ssr: false`; deploy; takes < 1 hour if caught early |
| Content blocks XSS in production | HIGH | Sanitize all existing `content_blocks` HTML immediately; add DOMPurify to render path; audit for injected scripts in browser console |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Supabase Auth cookie handling (`createServerClient`) | Phase 1: Auth scaffolding | Auth state persists across Server Components; middleware rotates tokens correctly |
| `getUser()` vs `getSession()` for security decisions | Phase 1: Auth scaffolding | Audit all auth checks — no `getSession()` on protected routes |
| Admin role in `app_metadata` vs `user_metadata` | Phase 1: Auth + roles | Confirm role field is not changeable via `supabase.auth.updateUser()` |
| RLS policies on all tables | Phase 1: Database schema | Test with non-admin user: cannot read other users' data; admin can read all |
| Bilingual i18n infrastructure (folder structure, next-intl) | Phase 1: Project scaffolding | `app/[locale]/` folder exists; `messages/es.json` and `messages/en.json` exist |
| Stripe webhook signature verification | Phase 2: Membership + Stripe | Forged webhook POST returns 400; valid Stripe event processes correctly |
| Stripe webhook event coverage (all lifecycle events) | Phase 2: Membership + Stripe | Test cancellation, upgrade, payment failure — all update Supabase correctly |
| Stripe webhook idempotency | Phase 2: Membership + Stripe | Replaying the same event ID does not double-process |
| `stripe_customer_id` stored in Supabase profiles | Phase 2: Membership + Stripe | Subscription lookup uses DB record, not client input |
| Court reservation double-booking constraint | Phase 3: Reservation system | Concurrent test sends two identical reservations simultaneously; only one succeeds |
| Leaflet SSR (`next/dynamic` with `ssr: false`) | Phase 3: Court map | Build passes without `window is not defined`; map renders on first load |
| Session reminder deduplication (`reminder_sent` flag) | Phase 3: Notifications | Cron invoked twice in a row; reminder email sent once |
| Session reminder logging | Phase 3: Notifications | `cron_runs` table populated after each invocation |
| Content blocks schema (typed, bilingual, ordered) | Phase 4: Admin panel + CMS | Schema has `block_type`, `content_es`, `content_en`, `sort_order` columns |
| Content blocks XSS | Phase 4: Admin panel + CMS | Storing `<script>alert(1)</script>` in a content block does not execute on the frontend |
| Admin route protection (API layer) | Phase 4: Admin panel | Authenticated non-admin user calling `/api/admin/*` receives 403 |

---

## Sources

- Supabase Auth + SSR documentation: `@supabase/ssr` package (current as of Aug 2025 — replaced deprecated `@supabase/auth-helpers-nextjs`)
- Supabase official warning on `getSession()` vs `getUser()` for security: https://supabase.com/docs/reference/javascript/auth-getsession (explicitly warns "Do not use getSession() to validate authentication on server-side code")
- Stripe webhook best practices: Stripe documentation on idempotency keys, event ordering, and signature verification
- Postgres exclusion constraints for range overlap: `btree_gist` extension documentation; standard pattern for reservation systems
- Next.js App Router with Leaflet: Known issue documented in Leaflet GitHub issues and Next.js discussions — dynamic import is the canonical fix
- Stripe `user_metadata` vs `app_metadata` security: Supabase Auth documentation on JWT claims and what client code can modify
- `next-intl` with App Router: next-intl official docs recommend `[locale]` folder structure with middleware locale detection
- pg_cron + Supabase Edge Functions: Supabase docs on scheduled functions (minimum 1-minute resolution)

---
*Pitfalls research for: NELL Pickleball Club — Next.js App Router + Supabase + Stripe sports club platform*
*Researched: 2026-03-07*
