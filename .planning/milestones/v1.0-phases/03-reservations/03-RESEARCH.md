# Phase 3: Reservations - Research

**Researched:** 2026-03-08
**Domain:** Court reservation system with two booking modes, per-session payments, email notifications, and dashboard enhancements
**Confidence:** HIGH

## Summary

Phase 3 builds the core member value loop: court booking with two modes (full court and open play), court cards with Google Maps thumbnails, per-session Stripe payment for non-members, email notifications via Resend, and dashboard enhancements. The existing codebase provides strong foundations -- Stripe singleton, Server Action patterns, webhook infrastructure, Supabase client utilities, and i18n structure are all in place.

The primary technical challenges are: (1) schema migration to support court configuration, two booking modes, guest tracking, variable pricing, and pending payment status; (2) Postgres exclusion constraint via `btree_gist` for double-booking prevention at the database level; (3) Resend integration for confirmation and reminder emails; (4) Supabase Edge Function with pg_cron for the 10-minute reminder; and (5) modifying `proxy.ts` to allow all authenticated users (not just active members) to access reservation routes.

**Primary recommendation:** Use a new migration (0003) for schema changes including `btree_gist` extension, `court_config` table, enhanced `reservations` table with mode/payment/guest fields, and exclusion constraint. Use Resend with plain text emails (no react-email needed). Implement reminder cron via pg_cron + pg_net calling a Supabase Edge Function. Use Google Maps Static API for court card thumbnails.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- ALL logged-in users can make reservations -- not just active members
- Members with active subscriptions book free (instant confirmation, no payment step)
- Non-members reserve first then choose payment: Stripe ($10 per session) or cash at location
- Cash reservations have "pending payment" status with an expiring hold (admin-configurable window before session start; default 2 hours). If not confirmed by admin before window, slot opens back up
- Stripe per-session payment: after reserving, user clicks "Pay with Stripe" -> Stripe Checkout -> payment completes -> reservation status changes from "pending payment" to "paid"
- Users with any pending payment reservation are BLOCKED from making new bookings until they pay or admin clears it
- proxy.ts membership gate does NOT apply to reservation routes -- everyone with an account can access
- Members can book further in advance than non-members (admin-configurable, e.g., 48-72hrs for members)
- Non-members limited to 24 hours advance booking
- Variable pricing: admin sets per-session prices per court or per mode (full court vs open play)
- Members always play free (included in subscription)
- VIP ($50/mo) can bring guest(s) -- guest plays free, does not need an account
- VIP member enters guest's full name when booking -- admin sees who to expect at entrance
- Guest limit is admin-configurable (default 1)
- Two reservation modes: full court rental and open play (individual spots)
- Admin configures per court: open time, close time, and which hour ranges are full-court vs open-play
- Schedule supports weekday vs weekend variation (two schedule configs per court)
- 1-hour fixed time slots generated from configured hours
- 4 spots per slot per court (always)
- Full court mode: one person books entire court (all 4 spots)
- Open play mode: each person books individual spot (up to 4 per court per slot)
- Court cards (not Leaflet map): 3 cards with Google Maps thumbnail, time slot table, court diagram modal
- Court diagram: 4 quadrants with green/red nodes showing spot availability
- Tab strip for date selection: Today, Tomorrow, +2 days, +3 days
- Dashboard: simple table for reservations, separate settings page for profile/password
- Simple text emails via Resend for confirmation and reminders
- Reminder email 10 minutes before session ends
- Configurable cancellation window (e.g., 2 hours before session)

### Claude's Discretion
- Court diagram design (realistic doubles positions vs abstract 2x2 quadrants)
- Google Maps implementation (static image API vs embedded mini-map -- considering 3 cards on one page)
- Post-reserve payment flow UX (inline panel vs confirmation page)
- Exact admin config UI for court hours, mode schedule, pricing, booking windows
- Re-subscription flow for lapsed members wanting to book
- Expiring hold implementation (cron job vs on-demand check)

### Deferred Ideas (OUT OF SCOPE)
- Admin UI for court configuration (hours, modes, pricing, booking windows) -- Phase 4. Phase 3 stores config in database; admin sets via Supabase dashboard or seed data for v1.
- Cash payment tracking admin UI -- Phase 4. Admin marks cash payments as received and clears pending status.
- Admin creates reservation on behalf of walk-in -- Phase 4 (RESV-08). Walk-in does not need an account; admin handles.
- Admin cancels any reservation -- Phase 4 (RESV-09).
- Day pass purchase flow -- Future milestone.
- Guest passes for non-VIP members -- v2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RESV-01 | Active members can view available courts as a time-slot grid | Court cards UI with tab strip date selector, time slot table per court, availability computed from reservations table |
| RESV-02 | Members can reserve a time slot (session length: default 60 min) | Server Action with booking form, fixed 1-hour slots from court_config, two modes (full court / open play) |
| RESV-03 | System prevents double-booking via Postgres exclusion constraint on (court_id, tstzrange) using btree_gist | btree_gist extension confirmed available on Supabase; exclusion constraint with partial WHERE clause for non-cancelled bookings |
| RESV-04 | All reservation timestamps stored as UTC; displayed in America/Santo_Domingo (UTC-4, no DST) | Store as TIMESTAMPTZ, render with Intl.DateTimeFormat or date-fns-tz in America/Santo_Domingo |
| RESV-05 | Reservations store snapshot of user first_name and last_name at booking time | Already in schema: reservation_user_first_name, reservation_user_last_name columns exist |
| RESV-06 | Members can cancel their own reservation within configurable cancellation window | Server Action checks cancellation window from app_config, updates status to 'cancelled' |
| RESV-07 | Basic tier members can only reserve courts at their assigned location | Server Action checks membership.location_id against court.location_id; VIP has no restriction |
| RESV-08 | Admin can create reservation on behalf of any member | DEFERRED to Phase 4 per CONTEXT.md |
| RESV-09 | Admin can cancel any reservation | DEFERRED to Phase 4 per CONTEXT.md |
| MAP-01 | Reservation page displays court cards (CONTEXT.md overrides Leaflet map to court cards) | 3 court cards with Google Maps Static API thumbnails, not interactive Leaflet map |
| MAP-02 | Cards show availability status with color-coded spots | Court diagram modal with green (available) and red (taken) nodes for each time slot |
| MAP-03 | Court card shows available time slots | Time slot table embedded in each court card with tab strip date selector |
| MAP-04 | Admin can set GPS coordinates for each court | Stored in courts table (lat/lng columns already exist); admin sets via SQL/seed in Phase 3, admin UI in Phase 4 |
| MAP-05 | Google Maps thumbnails display correctly | Static Maps API with API key, marker at court lat/lng, sized for card width |
| NOTIF-01 | Confirmation email sent immediately when reservation is made | Resend plain text email from Server Action after successful insert |
| NOTIF-02 | Session end reminder triggered 10 minutes before session ends via Supabase Edge Function + pg_cron | pg_cron every minute -> pg_net calls Edge Function -> queries reservations ending in 10 min -> sends Resend email |
| NOTIF-03 | Reminder message bilingual | User locale_pref from profiles table determines language; two message templates |
| NOTIF-04 | Reminder system tracks reminder_sent boolean per reservation | Already in schema: reminder_sent BOOLEAN DEFAULT FALSE; Edge Function updates after sending |
| DASH-01 | Member can view current membership status | Already implemented in MembershipCard.tsx; may need minor enhancements |
| DASH-02 | Member can view upcoming reservations with cancellation option | New reservations table on dashboard page, sorted by date |
| DASH-03 | Member can cancel a reservation within cancellation window | Cancel button with confirmation dialog calling cancelReservation Server Action |
| DASH-04 | Member can update profile: first name, last name, phone | New /dashboard/settings page with profile edit form and Server Action |
| DASH-05 | Member can change password | Password change section on settings page using supabase.auth.updateUser() |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.9.3 | Email delivery (confirmation + reminder) | Official Node.js SDK, simple API, plain text support, Next.js Server Action compatible |
| stripe | ^20.4.1 | Per-session one-time payment (already installed) | Already in project; mode: 'payment' for one-time checkout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Google Maps Static API | N/A (URL-based) | Court card thumbnails | No npm package needed; construct URL with API key, lat/lng, zoom, size |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Google Maps Static API | Embedded Google Maps iframe | Heavier, 3 iframes on one page impacts performance; static image is lighter |
| react-email | Plain text string | CONTEXT.md specifies simple text emails -- no HTML templates needed |
| date-fns-tz | Intl.DateTimeFormat | Both work; Intl is built-in with no dependency, sufficient for America/Santo_Domingo |
| Leaflet map | Court cards | CONTEXT.md explicitly chose court cards over Leaflet map |

### Discretion Recommendations

**Court diagram design:** Use abstract 2x2 quadrant layout. Simpler to implement, more universally understandable than realistic doubles court positions. Each quadrant is a clickable/visual node. Use Electric Lime (#39FF14) for available, a red/coral for taken.

**Google Maps implementation:** Use Google Maps Static API. For 3 cards on one page, static images load faster than 3 embedded iframes. URL format: `https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=16&size=400x200&markers=color:green|{lat},{lng}&key={API_KEY}`. Clicking the image links to `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` for directions.

**Post-reserve payment flow UX:** After reserving, show an inline panel on the reservation confirmation with two buttons: "Pay with Stripe ($10)" and "Pay Cash at Location". The Stripe button redirects to Stripe Checkout (mode: 'payment'); cash sets status to 'pending_payment'. This avoids an extra page load.

**Expiring hold implementation:** Use on-demand check (not cron). When querying available slots, filter out reservations with status 'pending_payment' whose hold has expired (check `created_at + hold_window < NOW()`). A cron could clean these up periodically for data hygiene, but the availability check is the critical path and should be real-time. The pg_cron reminder function can also clean expired holds as a side effect.

**Installation:**
```bash
npm install resend
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  migrations/
    0003_reservations.sql         # btree_gist, court_config, reservations schema changes, app_config
  functions/
    session-reminder/
      index.ts                    # Edge Function: query + send reminder emails via Resend

app/
  [locale]/
    (member)/
      reservations/
        page.tsx                  # Court cards page (Server Component)
        CourtCard.tsx             # Individual court card (Client Component)
        CourtDiagram.tsx          # 4-quadrant diagram modal (Client Component)
        TimeSlotGrid.tsx          # Time slot table with tab strip (Client Component)
        ReservationForm.tsx       # Booking form (Client Component with useActionState)
        PaymentPanel.tsx          # Post-reserve payment options (Client Component)
      dashboard/
        page.tsx                  # Enhanced dashboard with reservations table
        ReservationsTable.tsx     # Upcoming reservations table (Client Component)
        CancelDialog.tsx          # Cancellation confirmation modal
        settings/
          page.tsx                # Profile edit + password change (Server Component)
          ProfileForm.tsx         # Name/phone edit form (Client Component)
          PasswordForm.tsx        # Password change form (Client Component)

app/
  actions/
    reservations.ts               # Server Actions: createReservation, cancelReservation
    profile.ts                    # Server Actions: updateProfile, changePassword

lib/
  resend/
    index.ts                      # Resend singleton
    emails.ts                     # sendConfirmationEmail, sendReminderEmail functions
```

### Pattern 1: Reservation Server Action with Double-Booking Prevention
**What:** Server Action validates user eligibility, checks pending payments, enforces booking window, then inserts into `reservations` table. The exclusion constraint at the DB level prevents double-booking even under race conditions.
**When to use:** Every reservation creation.
**Example:**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { sendConfirmationEmail } from '@/lib/resend/emails'

export async function createReservationAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Check for pending payment reservations (blocks new bookings)
  const { data: pending } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending_payment')
    .limit(1)
  if (pending?.length) return { error: 'You have a pending payment. Complete or cancel it first.' }

  // 2. Check membership for free booking vs payment required
  const { data: membership } = await supabase
    .from('memberships')
    .select('plan_type, status, location_id')
    .eq('user_id', user.id)
    .in('status', ['active'])
    .maybeSingle()

  const isMember = !!membership
  const isVip = membership?.plan_type === 'vip'

  // 3. Enforce advance booking window
  // 4. Enforce Basic tier location restriction (RESV-07)
  // 5. Insert reservation -- DB exclusion constraint handles race conditions
  // 6. If non-member, set status to 'pending_payment'
  // 7. Send confirmation email via Resend
}
```

### Pattern 2: Stripe One-Time Payment for Per-Session Booking
**What:** Reuse existing Stripe singleton with `mode: 'payment'` instead of `mode: 'subscription'`. After checkout completes, webhook updates reservation status from 'pending_payment' to 'paid'.
**When to use:** Non-member pays $10 per session via Stripe.
**Example:**
```typescript
'use server'
import { stripe } from '@/lib/stripe'

export async function createSessionPaymentAction(reservationId: string) {
  // ... auth checks ...
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',  // NOT 'subscription'
    line_items: [{ price: process.env.STRIPE_PRICE_ID_SESSION!, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { reservation_id: reservationId },
    success_url: `${origin}/reservations?paid=true`,
    cancel_url: `${origin}/reservations?cancelled=true`,
  })
  redirect(session.url!)
}
```

### Pattern 3: Resend Plain Text Email
**What:** Simple text email via Resend SDK. No react-email, no HTML templates.
**When to use:** Confirmation and reminder emails.
**Example:**
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendConfirmationEmail(
  to: string,
  courtName: string,
  date: string,
  time: string,
  locale: string
) {
  const subject = locale === 'es'
    ? 'Reserva confirmada - NELL Pickleball Club'
    : 'Reservation confirmed - NELL Pickleball Club'

  const text = locale === 'es'
    ? `Tu reserva ha sido confirmada.\n\nCancha: ${courtName}\nFecha: ${date}\nHora: ${time}\n\nNos vemos en la cancha!`
    : `Your reservation has been confirmed.\n\nCourt: ${courtName}\nDate: ${date}\nTime: ${time}\n\nSee you on the court!`

  await resend.emails.send({
    from: 'NELL Pickleball Club <noreply@nellpickleball.com>',
    to,
    subject,
    text,
  })
}
```

### Pattern 4: pg_cron + Edge Function for Reminders
**What:** pg_cron runs every minute, calls Edge Function via pg_net. Edge Function queries reservations ending in ~10 minutes with `reminder_sent = false`, sends email, updates flag.
**When to use:** NOTIF-02 session end reminder.
**Example SQL:**
```sql
-- Store secrets in Vault
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_ANON_KEY', 'anon_key');

-- Schedule every minute
SELECT cron.schedule(
  'session-reminder',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/session-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Anti-Patterns to Avoid
- **Client-side availability checks only:** Always enforce at DB level with exclusion constraint. Client-side checks are for UX, not correctness.
- **Trusting Stripe redirect for payment status:** Always use webhooks to update reservation status from 'pending_payment' to 'paid'. Never trust the success_url redirect.
- **Using setInterval for reminders:** Use pg_cron, not application-level timers. The cron survives server restarts and scales to zero.
- **Storing times in local timezone:** Store as UTC (TIMESTAMPTZ), display in America/Santo_Domingo. Never store as TEXT or bare TIMESTAMP.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Double-booking prevention | Application-level locking | Postgres exclusion constraint with btree_gist | Race conditions are impossible to prevent at app level; DB handles concurrent transactions correctly |
| Email delivery | Custom SMTP/nodemailer setup | Resend SDK | Deliverability, bounce handling, rate limiting all handled |
| Scheduled tasks | Application cron (node-cron, setInterval) | Supabase pg_cron + Edge Function | Survives deploys, serverless-friendly, managed infrastructure |
| Payment processing | Custom payment form | Stripe Checkout (mode: 'payment') | PCI compliance, refunds, disputes all handled by Stripe |
| Map thumbnails | Custom map rendering | Google Maps Static API | Single URL, no JS bundle cost, cacheable images |
| Timezone handling | Manual UTC offset math | TIMESTAMPTZ + Intl.DateTimeFormat | Postgres handles storage correctly; browser API handles display |

**Key insight:** The reservation system's correctness guarantee comes from the database (exclusion constraint), not the application code. Application code handles UX; the database handles truth.

## Common Pitfalls

### Pitfall 1: btree_gist Not Enabled Before Exclusion Constraint
**What goes wrong:** Migration fails with "operator class not found" error.
**Why it happens:** `btree_gist` extension must be enabled before creating an exclusion constraint that combines UUID equality with tstzrange overlap.
**How to avoid:** Always run `CREATE EXTENSION IF NOT EXISTS btree_gist;` at the top of the migration, before the EXCLUDE constraint.
**Warning signs:** Migration error mentioning "gist" or "operator class."

### Pitfall 2: Exclusion Constraint Blocks Cancelled Reservations
**What goes wrong:** Cancelling a reservation and rebooking the same slot fails because the cancelled row still occupies the range.
**Why it happens:** The exclusion constraint applies to all rows, including cancelled ones.
**How to avoid:** Use a partial exclusion constraint: `EXCLUDE USING GIST (...) WHERE (status NOT IN ('cancelled', 'expired'))`. Only active/pending reservations participate in the constraint.
**Warning signs:** "conflicting key value" error when booking a slot that was previously cancelled.

### Pitfall 3: Open Play vs Full Court Spot Counting
**What goes wrong:** System allows 5+ individual bookings in open play mode, or treats a full-court booking as 1 spot instead of 4.
**Why it happens:** The exclusion constraint prevents time overlap but does not count spots.
**How to avoid:** For open play, use a `spot_number` column (1-4) and include it in the exclusion constraint: `EXCLUDE USING GIST (court_id WITH =, spot_number WITH =, time_range WITH &&)`. For full court, insert 4 rows (spots 1-4) in a single transaction, or use a separate `booking_mode` field and check count before insert.
**Warning signs:** Overbooking in open play mode.

### Pitfall 4: Pending Payment Hold Not Checked in Availability Query
**What goes wrong:** A pending-payment reservation's slot appears as available to other users.
**Why it happens:** Availability query only checks status = 'confirmed' or 'paid', forgetting 'pending_payment'.
**How to avoid:** Include 'pending_payment' in the "occupied" statuses when computing availability. Only exclude it when the hold has expired.
**Warning signs:** Double-booking where one person has pending payment and another books the same slot.

### Pitfall 5: Resend From Address Domain Verification
**What goes wrong:** Emails fail to send or go to spam.
**Why it happens:** Resend requires domain verification (DNS records) before sending from a custom domain.
**How to avoid:** Either verify the custom domain in Resend dashboard or use `onboarding@resend.dev` for development. Plan domain verification as a prerequisite.
**Warning signs:** 403 error from Resend API, emails in spam folder.

### Pitfall 6: Edge Function Environment Variables
**What goes wrong:** Edge Function cannot connect to Resend or Supabase.
**Why it happens:** Edge Functions have their own environment; they do not inherit Next.js `.env` variables.
**How to avoid:** Set secrets via `supabase secrets set RESEND_API_KEY=xxx`. Access via `Deno.env.get('RESEND_API_KEY')`.
**Warning signs:** "undefined" API key errors in Edge Function logs.

### Pitfall 7: proxy.ts Over-Gating Reservation Routes
**What goes wrong:** Non-members get redirected to /pricing when accessing reservation page.
**Why it happens:** Current proxy.ts gates all `/member/` routes by membership status.
**How to avoid:** Add an exception for reservation paths before the membership check. E.g., skip membership check if `pathname.includes('/reservations')`.
**Warning signs:** Non-members cannot access the booking page.

## Code Examples

### Migration 0003: Reservations Schema Enhancement
```sql
-- Enable btree_gist for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Court configuration (admin-managed, no admin UI in Phase 3)
CREATE TABLE court_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id        UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_type        TEXT NOT NULL DEFAULT 'weekday', -- 'weekday' | 'weekend'
  open_time       TIME NOT NULL DEFAULT '06:00',
  close_time      TIME NOT NULL DEFAULT '22:00',
  full_court_start TIME,  -- NULL = no full court hours
  full_court_end   TIME,
  open_play_start  TIME,  -- NULL = no open play hours
  open_play_end    TIME,
  UNIQUE(court_id, day_type)
);
ALTER TABLE court_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read court_config" ON court_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on court_config" ON court_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- App-wide configuration (booking windows, cancellation window, guest limit, hold duration)
CREATE TABLE app_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read app_config" ON app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on app_config" ON app_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed default config
INSERT INTO app_config (key, value) VALUES
  ('member_advance_booking_hours', '72'),
  ('non_member_advance_booking_hours', '24'),
  ('cancellation_window_hours', '2'),
  ('vip_guest_limit', '1'),
  ('pending_payment_hold_hours', '2'),
  ('session_price_default', '10');

-- Enhance reservations table
ALTER TABLE reservations
  ADD COLUMN booking_mode TEXT NOT NULL DEFAULT 'open_play',  -- 'full_court' | 'open_play'
  ADD COLUMN spot_number  INT,  -- 1-4 for open play, NULL for full court
  ADD COLUMN payment_status TEXT DEFAULT 'free',  -- 'free' | 'pending_payment' | 'paid' | 'cash_pending'
  ADD COLUMN payment_method TEXT,  -- 'stripe' | 'cash' | NULL (for free/member)
  ADD COLUMN stripe_payment_id TEXT,  -- Stripe Checkout session ID for per-session payment
  ADD COLUMN guest_name TEXT,  -- VIP guest full name (NULL if no guest)
  ADD COLUMN price_cents INT DEFAULT 0;  -- Price in cents (0 for members)

-- Update status to support more states
-- Existing: 'confirmed' (default)
-- New: 'pending_payment', 'paid', 'cancelled', 'expired'

-- Exclusion constraint: prevent double-booking for open play (same court, same spot, overlapping time)
ALTER TABLE reservations
  ADD CONSTRAINT no_double_booking_open_play
  EXCLUDE USING GIST (
    court_id WITH =,
    spot_number WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'expired') AND booking_mode = 'open_play' AND spot_number IS NOT NULL);

-- Exclusion constraint: prevent double-booking for full court (same court, overlapping time)
ALTER TABLE reservations
  ADD CONSTRAINT no_double_booking_full_court
  EXCLUDE USING GIST (
    court_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'expired') AND booking_mode = 'full_court');

-- RLS: Allow all authenticated users to read reservations for courts they can see
-- (needed for availability display)
CREATE POLICY "All authenticated can read court reservations"
  ON reservations FOR SELECT TO authenticated
  USING (true);
-- Note: This replaces the owner-only read policy for availability purposes.
-- Users can see that spots are taken (for availability) but the full details
-- are filtered in the application layer.

-- Court pricing (per court, per mode)
CREATE TABLE court_pricing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id    UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL, -- 'full_court' | 'open_play'
  price_cents INT NOT NULL DEFAULT 1000, -- $10.00 default
  UNIQUE(court_id, mode)
);
ALTER TABLE court_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read court_pricing" ON court_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on court_pricing" ON court_pricing FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Resend Singleton
```typescript
// lib/resend/index.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)
```

### Edge Function: session-reminder
```typescript
// supabase/functions/session-reminder/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Find reservations ending in ~10 minutes that haven't been reminded
  const now = new Date()
  const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
  const elevenMinLater = new Date(now.getTime() + 11 * 60 * 1000)

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, user_id, court_id, ends_at, courts(name), profiles(first_name, locale_pref)')
    .eq('reminder_sent', false)
    .in('status', ['confirmed', 'paid', 'free'])
    .gte('ends_at', tenMinLater.toISOString())
    .lt('ends_at', elevenMinLater.toISOString())

  // Send reminders and update flags...
  for (const res of reservations ?? []) {
    // Send via Resend REST API (no npm in Deno)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NELL Pickleball Club <noreply@nellpickleball.com>',
        to: res.user_id, // resolve email from auth
        subject: 'Session ending soon',
        text: 'Your pickleball session ends in 10 minutes...',
      }),
    })

    await supabase
      .from('reservations')
      .update({ reminder_sent: true })
      .eq('id', res.id)
  }

  return new Response('OK')
})
```

### Webhook Handler for One-Time Payment
```typescript
// Add to webhookHandlers.ts or new file
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  if (session.mode === 'payment') {
    // Per-session payment completed
    const reservationId = session.metadata?.reservation_id
    if (reservationId) {
      await supabaseAdmin
        .from('reservations')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          stripe_payment_id: session.id,
        })
        .eq('id', reservationId)
    }
  } else {
    // Existing subscription flow
    await handleCheckoutCompleted(session, supabaseAdmin)
  }
  break
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Leaflet interactive map | Court cards with static maps | CONTEXT.md decision | Simpler implementation, better performance with 3 courts |
| Only active members can reserve | All logged-in users can reserve | CONTEXT.md decision | proxy.ts modification needed, payment flow for non-members |
| Single booking mode | Full court + open play modes | CONTEXT.md decision | Schema needs spot_number, booking_mode columns |
| Fixed $10 price | Variable admin-configurable pricing | CONTEXT.md decision | court_pricing table, price lookup at booking time |

**Deprecated/outdated:**
- MAP-01 through MAP-05 originally specified Leaflet map -- CONTEXT.md overrides to court cards with Google Maps Static API thumbnails
- RESV-01 originally specified "active members" -- CONTEXT.md changes to "all logged-in users"
- BILL-09 originally blocked non-members from reservation routes -- CONTEXT.md reverses this

## Open Questions

1. **Google Maps API Key and Domain Verification**
   - What we know: Static Maps API requires an API key with Maps Static API enabled
   - What's unclear: Whether the project has a Google Cloud project set up yet
   - Recommendation: Document as a prerequisite; use placeholder image during development

2. **Resend Domain Verification**
   - What we know: Custom from address requires DNS domain verification in Resend dashboard
   - What's unclear: Whether nellpickleball.com domain is available for verification
   - Recommendation: Use `onboarding@resend.dev` during development, plan verification as deployment task

3. **Supabase Edge Function Deployment**
   - What we know: Edge Functions deployed via `supabase functions deploy`
   - What's unclear: Whether Supabase CLI is set up locally, whether project is linked
   - Recommendation: Include Edge Function deployment as a manual step; code can be tested locally with `supabase functions serve`

4. **Exclusion Constraint with Two Booking Modes**
   - What we know: Need separate constraints for open play (per-spot) and full court (per-court)
   - What's unclear: Whether partial exclusion constraints with complex WHERE clauses work correctly on Supabase's Postgres version
   - Recommendation: Test the migration in a Supabase project before relying on it; have a fallback of application-level check + unique constraint on (court_id, spot_number, starts_at)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + Playwright 1.58.2 |
| Config file | vitest.config.ts (unit), playwright.config.ts (e2e) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESV-01 | Court availability renders with time slots | unit | `npx vitest run tests/unit/courtAvailability.test.ts -x` | Wave 0 |
| RESV-02 | Reservation creation succeeds with valid input | unit | `npx vitest run tests/unit/createReservation.test.ts -x` | Wave 0 |
| RESV-03 | Double-booking prevented by exclusion constraint | unit | `npx vitest run tests/unit/doubleBooking.test.ts -x` | Wave 0 |
| RESV-04 | Timestamps stored UTC, displayed Santo Domingo | unit | `npx vitest run tests/unit/timezoneDisplay.test.ts -x` | Wave 0 |
| RESV-05 | Name snapshot stored at booking time | unit | `npx vitest run tests/unit/createReservation.test.ts -x` | Wave 0 |
| RESV-06 | Cancellation within window succeeds, outside fails | unit | `npx vitest run tests/unit/cancelReservation.test.ts -x` | Wave 0 |
| RESV-07 | Basic tier restricted to assigned location | unit | `npx vitest run tests/unit/locationRestriction.test.ts -x` | Wave 0 |
| MAP-01 | Court cards render with Google Maps thumbnail | unit | `npx vitest run tests/unit/courtCard.test.ts -x` | Wave 0 |
| NOTIF-01 | Confirmation email sent on reservation | unit | `npx vitest run tests/unit/confirmationEmail.test.ts -x` | Wave 0 |
| NOTIF-04 | Reminder sent exactly once (reminder_sent flag) | unit | `npx vitest run tests/unit/reminderEmail.test.ts -x` | Wave 0 |
| DASH-02 | Upcoming reservations displayed on dashboard | unit | `npx vitest run tests/unit/dashboardReservations.test.ts -x` | Wave 0 |
| DASH-04 | Profile update saves changes | unit | `npx vitest run tests/unit/profileUpdate.test.ts -x` | Wave 0 |
| DASH-05 | Password change validates and updates | unit | `npx vitest run tests/unit/passwordChange.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/courtAvailability.test.ts` -- covers RESV-01
- [ ] `tests/unit/createReservation.test.ts` -- covers RESV-02, RESV-05
- [ ] `tests/unit/doubleBooking.test.ts` -- covers RESV-03
- [ ] `tests/unit/timezoneDisplay.test.ts` -- covers RESV-04
- [ ] `tests/unit/cancelReservation.test.ts` -- covers RESV-06
- [ ] `tests/unit/locationRestriction.test.ts` -- covers RESV-07
- [ ] `tests/unit/courtCard.test.ts` -- covers MAP-01
- [ ] `tests/unit/confirmationEmail.test.ts` -- covers NOTIF-01
- [ ] `tests/unit/reminderEmail.test.ts` -- covers NOTIF-04
- [ ] `tests/unit/dashboardReservations.test.ts` -- covers DASH-02
- [ ] `tests/unit/profileUpdate.test.ts` -- covers DASH-04
- [ ] `tests/unit/passwordChange.test.ts` -- covers DASH-05
- [ ] `tests/unit/pendingPayment.test.ts` -- covers pending payment blocking logic
- [ ] `tests/unit/sessionPayment.test.ts` -- covers Stripe one-time payment webhook

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/0001_initial_schema.sql` -- verified existing schema structure
- Existing codebase: `proxy.ts` -- verified current membership gating logic
- Existing codebase: `lib/stripe/webhookHandlers.ts` -- verified Stripe webhook pattern
- Existing codebase: `app/actions/billing.ts` -- verified Server Action pattern for Stripe
- [PostgreSQL btree_gist docs](https://www.postgresql.org/docs/current/btree-gist.html) -- extension capabilities
- [PostgreSQL range types](https://www.postgresql.org/docs/current/rangetypes.html) -- tstzrange exclusion constraint syntax

### Secondary (MEDIUM confidence)
- [Resend API reference](https://resend.com/docs/api-reference/emails/send-email) -- send email parameters verified
- [Resend npm package](https://www.npmjs.com/package/resend) -- version 6.9.3, plain text support confirmed
- [Supabase Edge Function scheduling](https://supabase.com/docs/guides/functions/schedule-functions) -- pg_cron + pg_net pattern verified
- [Supabase extensions](https://supabase.com/docs/guides/database/extensions) -- btree_gist confirmed available
- [Google Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview) -- URL-based static map images

### Tertiary (LOW confidence)
- Google Maps Static API pricing specifics for 2025+ restructured tiers -- needs verification of free tier limits

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend is well-documented, Stripe already integrated, Google Maps Static API is mature
- Architecture: HIGH - Follows established project patterns (Server Actions, Supabase clients, webhook handlers)
- Pitfalls: HIGH - Exclusion constraints and btree_gist are well-documented PostgreSQL features; Resend domain verification is a known requirement
- Schema design: MEDIUM - Two-mode booking with spot_number is sound but the partial exclusion constraint needs testing on Supabase specifically

**Research date:** 2026-03-08
**Valid until:** 2026-04-07 (30 days -- stable technologies)
