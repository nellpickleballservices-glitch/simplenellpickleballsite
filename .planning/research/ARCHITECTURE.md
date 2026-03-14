# Architecture Patterns: Local vs Tourist Differential Pricing

**Domain:** Dynamic pricing integration for existing pickleball club platform
**Researched:** 2026-03-14
**Confidence:** HIGH (integrating with well-understood existing codebase)

## Executive Summary

The differential pricing system integrates into the existing Supabase + Stripe + Next.js architecture by adding a new `session_pricing` table for day-of-week base prices, a `tourist_surcharge_pct` key in the existing `app_config` table, a `country` column on `profiles`, and a pricing calculation layer that sits between the reservation action and Stripe checkout creation. The existing `court_pricing` table (per-court, per-mode) becomes the fallback when no day-specific price is configured. No existing tables need destructive changes -- only additive columns and a new table.

## Recommended Architecture

### How It Integrates With What Exists

The current per-session payment flow:

```
User selects slot -> createReservationAction() -> reads court_pricing -> inserts reservation with price_cents -> createSessionPaymentAction() -> creates Stripe Checkout with reservation.price_cents
```

The new flow adds a pricing calculation step:

```
User selects slot -> createReservationAction() -> calculateSessionPrice() [NEW] -> inserts reservation with calculated price_cents -> createSessionPaymentAction() -> creates Stripe Checkout with reservation.price_cents (unchanged)
```

The key insight: `createSessionPaymentAction()` already reads `reservation.price_cents` from the database and passes it to Stripe. It does NOT need to change. The only thing that changes is HOW `price_cents` gets calculated before insertion.

### Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `profiles` table | Stores user `country` for local/tourist classification | **MODIFY** (add column) | signup action, pricing calc |
| `session_pricing` table | Base price per day-of-week per booking mode | **NEW** | pricing calc, admin pricing UI |
| `app_config` table | Stores `tourist_surcharge_pct` as new key | **MODIFY** (add row) | pricing calc, admin pricing UI |
| `calculateSessionPrice()` | Pure function: (day, mode, isLocal) -> price_cents | **NEW** | reservation action |
| `signUpAction()` | Collects country on signup | **MODIFY** | profiles table |
| `completeOAuthProfileAction()` | Collects country for OAuth users | **MODIFY** | profiles table |
| `createReservationAction()` | Uses new pricing calc instead of court_pricing lookup | **MODIFY** | pricing calc |
| `adminCreateReservationAction()` | Adds local/tourist toggle for walk-ins | **MODIFY** | pricing calc |
| Admin Pricing page | CRUD for session_pricing + surcharge config | **NEW** | session_pricing, app_config |
| `createSessionPaymentAction()` | **NO CHANGE** -- already reads price_cents from reservation | KEEP | Stripe API |
| `handleOneTimePaymentCompleted()` | **NO CHANGE** -- already confirms reservation on payment | KEEP | webhook route |
| Reservation UI | Shows calculated price before booking | **MODIFY** | pricing calc (via server) |

### New vs Modified: Explicit Inventory

**New files to create:**
1. `supabase/migrations/0008_session_pricing.sql` -- new table + profile column + app_config seed
2. `lib/pricing/calculateSessionPrice.ts` -- pure pricing logic
3. `lib/pricing/index.ts` -- barrel export
4. `app/[locale]/(admin)/admin/pricing/page.tsx` -- admin pricing management page
5. `app/[locale]/(admin)/admin/pricing/PricingForm.tsx` -- day-of-week price editor
6. `app/[locale]/(admin)/admin/pricing/SurchargeForm.tsx` -- tourist surcharge editor
7. `app/actions/admin/pricing.ts` -- server actions for admin pricing CRUD
8. `lib/types/pricing.ts` -- type definitions for pricing domain

**Files to modify:**
1. `app/actions/auth.ts` -- add `country` to signUpAction profile insert
2. `app/actions/reservations.ts` -- replace court_pricing lookup with calculateSessionPrice()
3. `app/actions/admin/reservations.ts` -- add isLocal param to adminCreateReservationAction()
4. `app/[locale]/(auth)/signup/SignupForm.tsx` -- add country dropdown
5. `app/[locale]/(auth)/signup/complete-profile/actions.ts` -- add country for OAuth
6. `app/[locale]/(auth)/signup/complete-profile/CompleteProfileForm.tsx` -- add country dropdown
7. `lib/types/reservations.ts` -- add AppConfigKey for new keys
8. `components/admin/AdminSidebar.tsx` -- add pricing nav link
9. `app/[locale]/(member)/reservations/CourtCard.tsx` -- show price with surcharge indicator

**Files that do NOT change (critical to understand):**
- `app/actions/sessionPayment.ts` -- already uses reservation.price_cents
- `lib/stripe/webhookHandlers.ts` -- handleOneTimePaymentCompleted already works
- `app/api/stripe/webhook/route.ts` -- no changes needed
- `lib/stripe/index.ts` -- no changes needed
- `app/actions/billing.ts` -- subscription flow unaffected

## Data Model

### New Table: `session_pricing`

```sql
CREATE TABLE session_pricing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  mode        TEXT NOT NULL CHECK (mode IN ('full_court', 'open_play')),
  price_cents INT NOT NULL,
  label_es    TEXT,
  label_en    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (day_of_week, mode)
);
```

**Why this structure:**
- `day_of_week` integer (not day name string) because JavaScript `getDay()` returns 0-6, making lookup trivial with no string parsing.
- `UNIQUE (day_of_week, mode)` ensures one price per day per booking mode, matching how `court_pricing` uses `UNIQUE (court_id, mode)`.
- `label_es`/`label_en` allows admin to set promotional text like "$5 Mondays" that displays in the UI, following the bilingual pattern already used in `events` and `content_blocks`.
- `is_active` lets admin disable a special without deleting the row. Deactivated specials are invisible to the pricing calculator.
- Anon read policy because unauthenticated users browsing the site should see promotional pricing on public pages.

**Why NOT per-court pricing per day:** The business requirement is day-of-week specials (e.g., "$5 Mondays"), not per-court-per-day pricing. Adding court_id would create a `courts x 7 days x 2 modes = 42 rows` management burden for 3 courts. The existing `court_pricing` table already handles per-court base pricing as a fallback.

### Modified Table: `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN country TEXT;
```

**Why TEXT not ENUM:** Country codes may expand. TEXT with application-level validation (ISO 3166-1 alpha-2) is simpler than maintaining a Postgres ENUM. The classification logic lives in the app, not the database.

**Why on profiles, not auth.users metadata:** `profiles` is the application data table. User metadata in `auth.users` is for Supabase Auth internals. All existing user data queries go through `profiles`, and adding here means RLS policies already cover it. The signup action already inserts into profiles via `supabaseAdmin`.

### Modified Table: `app_config`

```sql
INSERT INTO app_config (key, value) VALUES
  ('tourist_surcharge_pct', '25'::jsonb);
```

**Why in app_config:** This is a single global value, exactly what `app_config` was designed for. The reservation action already fetches from `app_config` (see lines 73-83 of `reservations.ts`). Adding one more key to the `.in('key', [...])` call is trivial.

### Modified Table: `reservations` (informational column)

```sql
ALTER TABLE reservations
  ADD COLUMN is_tourist_price BOOLEAN NOT NULL DEFAULT false;
```

**Why:** Audit trail. When reviewing reservation history, admin needs to know if tourist surcharge was applied. Without this, you'd have to re-derive it from the user's country at query time, which is fragile if the user updates their country later. Follows the same "snapshot at booking time" pattern already used for `reservation_user_first_name`/`reservation_user_last_name`.

## Data Flow

### Price Calculation Flow (the core logic)

```
calculateSessionPrice(date: Date, mode: BookingMode, isLocal: boolean): PriceResult

1. Get day_of_week from date (0-6)
2. Query session_pricing WHERE day_of_week = X AND mode = Y AND is_active = true
3. If found -> use session_pricing.price_cents as base
4. If not found -> fall back to court_pricing.price_cents (existing behavior)
5. If not found -> fall back to app_config.session_price_default (1000 cents = $10)
6. If !isLocal:
   a. Read app_config.tourist_surcharge_pct (e.g., 25)
   b. surcharge = Math.round(base * pct / 100)
   c. total = base + surcharge
7. Return total price_cents
```

**Price resolution priority:**
1. Day-of-week special (session_pricing) -- highest priority
2. Court/mode pricing (court_pricing) -- existing per-court rates
3. Global default (app_config.session_price_default) -- fallback

### User Classification Flow

```
isLocal(country: string | null): boolean
  Return country === 'DO'
```

**Why hardcode 'DO':** The club is in the Dominican Republic. "Local" means Dominican. This is a business rule, not a configuration. If multi-country expansion happens, this becomes a config value, but YAGNI for now.

**Edge case -- null country:** Users who signed up before v1.1 will have `country = NULL`. Default to tourist pricing (conservative). This incentivizes users to update their profile to get local rates, which is better than accidentally undercharging tourists.

### Reservation Action Integration

Current code in `createReservationAction()` (lines 132-143):

```typescript
// CURRENT: Simple court_pricing lookup
let priceCents = 0
if (!isMember) {
  const { data: pricing } = await supabase
    .from('court_pricing')
    .select('price_cents')
    .eq('court_id', courtId)
    .eq('mode', bookingMode)
    .single()
  priceCents = pricing?.price_cents ?? 1000
}
```

Becomes:

```typescript
// NEW: Dynamic pricing with day-of-week specials and tourist surcharge
let priceCents = 0
let isTouristPrice = false
if (!isMember) {
  const isLocal = profile?.country === 'DO'
  const reservationDate = new Date(startTime)

  const result = await calculateSessionPrice(supabase, {
    date: reservationDate,
    courtId,
    bookingMode,
    isLocal,
  })

  priceCents = result.totalCents
  isTouristPrice = result.isTouristPrice
}
```

**Note:** The profile query for country can be merged with the existing profile query on line 38-42 that already fetches `first_name, last_name, locale_pref`. Just add `country` to the select. No new query needed.

### Admin Walk-in Flow

Current code in `adminCreateReservationAction()` always sets `price_cents: 0`. This needs to change:

```typescript
// Admin designates walk-in as local or tourist via form toggle
const isLocal = formData.get('isLocal') === 'true'

// Calculate price for walk-in (not a member by definition)
const result = await calculateSessionPrice(supabaseAdmin, {
  date: new Date(startsAt),
  courtId,
  bookingMode: bookingMode || 'full_court',
  isLocal,
})

// Insert with calculated price
price_cents: result.totalCents,
is_tourist_price: result.isTouristPrice,
payment_status: 'cash_pending',
```

### Price Display Flow (UI)

The reservation UI needs to show the price BEFORE the user commits. This means the pricing calculation must be callable as a server action that returns price info without creating a reservation.

```typescript
// New server action: getSessionPricePreview
export async function getSessionPricePreviewAction(
  date: string,
  courtId: string,
  bookingMode: BookingMode
): Promise<{
  baseCents: number
  totalCents: number
  isTouristPrice: boolean
  specialLabel?: string
}>
```

This action calls `calculateSessionPrice()` with the current user's country to show:
- "$5.00" for a local on a Monday special
- "$6.25 (includes tourist surcharge)" for a tourist on a Monday special
- "$10.00" / "$12.50" on a normal day

## Patterns to Follow

### Pattern 1: Pricing as a Pure Calculation Layer

**What:** Isolate all pricing logic in `lib/pricing/calculateSessionPrice.ts` as a function that takes a Supabase client and input params, returns a price result. Database reads only, no writes.

**Why:** The same pricing logic is needed in three places:
1. `createReservationAction()` -- to set price_cents on insert
2. `adminCreateReservationAction()` -- to set walk-in prices
3. `getSessionPricePreviewAction()` -- to show price before booking

Duplicating the logic guarantees drift. A single function ensures consistency.

**Example:**

```typescript
// lib/pricing/calculateSessionPrice.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookingMode } from '@/lib/types/reservations'

interface PriceInput {
  date: Date
  courtId: string
  bookingMode: BookingMode
  isLocal: boolean
}

interface PriceResult {
  baseCents: number
  surchargeCents: number
  totalCents: number
  isTouristPrice: boolean
  specialLabel?: { es: string | null; en: string | null }
}

export async function calculateSessionPrice(
  supabase: SupabaseClient,
  input: PriceInput
): Promise<PriceResult> {
  const dayOfWeek = input.date.getDay()

  // 1. Check day-of-week special
  const { data: special } = await supabase
    .from('session_pricing')
    .select('price_cents, label_es, label_en')
    .eq('day_of_week', dayOfWeek)
    .eq('mode', input.bookingMode)
    .eq('is_active', true)
    .single()

  let baseCents: number
  let specialLabel: { es: string | null; en: string | null } | undefined

  if (special) {
    baseCents = special.price_cents
    specialLabel = { es: special.label_es, en: special.label_en }
  } else {
    // 2. Fall back to court_pricing
    const { data: courtPrice } = await supabase
      .from('court_pricing')
      .select('price_cents')
      .eq('court_id', input.courtId)
      .eq('mode', input.bookingMode)
      .single()

    if (courtPrice) {
      baseCents = courtPrice.price_cents
    } else {
      // 3. Fall back to global default
      const { data: defaultPrice } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'session_price_default')
        .single()

      baseCents = defaultPrice?.value ?? 1000
    }
  }

  // 4. Apply tourist surcharge
  let surchargeCents = 0
  let isTouristPrice = false

  if (!input.isLocal) {
    const { data: surchargeConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'tourist_surcharge_pct')
      .single()

    const pct = surchargeConfig?.value ?? 0
    if (pct > 0) {
      surchargeCents = Math.round(baseCents * pct / 100)
      isTouristPrice = true
    }
  }

  return {
    baseCents,
    surchargeCents,
    totalCents: baseCents + surchargeCents,
    isTouristPrice,
    specialLabel,
  }
}
```

### Pattern 2: Snapshot Pricing at Booking Time

**What:** Store the calculated price on the reservation row at booking time. Never re-derive price from current pricing tables.

**Why:** Prices change. If admin changes Monday price from $5 to $7, existing Monday reservations should still show $5. The existing codebase already follows this pattern with `reservation_user_first_name` (snapshot of name at booking time). The `price_cents` column on reservations already serves as a price snapshot. Adding `is_tourist_price` extends this pattern.

### Pattern 3: Admin Controls via app_config + Dedicated Table

**What:** Use `app_config` for scalar settings (surcharge percentage) and a dedicated table for structured data (day-of-week prices).

**Why:** This matches the existing pattern. `app_config` already stores `session_price_default`, `cancellation_window_hours`, etc. Adding `tourist_surcharge_pct` there is consistent. But day-of-week prices have structure (7 days x 2 modes with labels), which is better served by a proper table with constraints.

### Pattern 4: Country as User Profile Data

**What:** Store country on the `profiles` table, not in auth metadata or a separate table.

**Why:** The signup flow already inserts into `profiles` via `supabaseAdmin` (see auth.ts line 62). Adding `country` to the same insert is one line of code. The reservation action already queries `profiles` for name snapshot (line 38-42). Adding `country` to the same select is one field. No new queries, no new joins.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Real-Time Price Calculation at Stripe Checkout

**What:** Computing the price in `createSessionPaymentAction()` instead of reading it from the reservation.

**Why bad:** The reservation already has `price_cents` stored. Recalculating at checkout time means: (a) prices could differ if admin changed pricing between reservation creation and payment, (b) race conditions between price lookup and Stripe session creation, (c) duplicated logic.

**Instead:** Keep `createSessionPaymentAction()` unchanged. It already reads `reservation.price_cents` and passes to Stripe.

### Anti-Pattern 2: Per-Court Per-Day Pricing Matrix

**What:** Adding `court_id` to `session_pricing` to allow different day-specials per court.

**Why bad:** With 3 courts x 7 days x 2 modes = 42 pricing configurations for the admin to manage. The business requirement is "$5 Mondays" across all courts, not per-court-per-day variation.

**Instead:** Day-of-week specials are global. Per-court pricing stays in `court_pricing` as the fallback.

### Anti-Pattern 3: Storing Classification Instead of Source Data

**What:** Adding a `user_type: 'local' | 'tourist'` column to profiles.

**Why bad:** Classification logic may change. Store the source data (country code) and derive the classification at query time. If you store the derived classification, you must migrate all rows when the rule changes.

**Instead:** Store `country TEXT` on profiles. Derive `isLocal = country === 'DO'` in application code.

### Anti-Pattern 4: Querying Pricing Tables on Every Page Load

**What:** Fetching session_pricing and surcharge config on every reservation page render.

**Why bad:** These values change rarely. Fetching on every page load adds unnecessary database queries.

**Instead:** Use `getSessionPricePreviewAction()` only when the user selects a specific date and time slot. The price preview is per-interaction, not per-page-load.

## Migration Strategy

### Database Migration: `0008_session_pricing.sql`

```sql
-- 1. Add country to profiles
ALTER TABLE profiles ADD COLUMN country TEXT;

-- 2. Create session_pricing table
CREATE TABLE session_pricing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  mode        TEXT NOT NULL CHECK (mode IN ('full_court', 'open_play')),
  price_cents INT NOT NULL,
  label_es    TEXT,
  label_en    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (day_of_week, mode)
);
ALTER TABLE session_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read session_pricing"
  ON session_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read session_pricing"
  ON session_pricing FOR SELECT TO anon USING (true);
CREATE POLICY "Service role full access on session_pricing"
  ON session_pricing FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Add tourist price flag to reservations
ALTER TABLE reservations
  ADD COLUMN is_tourist_price BOOLEAN NOT NULL DEFAULT false;

-- 4. Add tourist surcharge config
INSERT INTO app_config (key, value) VALUES
  ('tourist_surcharge_pct', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

**Migration is fully additive:** No columns dropped, no tables altered destructively, no data changed. Existing reservations get `is_tourist_price = false` (correct -- all pre-v1.1 reservations were flat-rate). Existing profiles get `country = NULL` (users can update via profile settings).

## Suggested Build Order

Based on dependency analysis:

### Step 1: Database migration + types (foundation, no UI dependency)
- Write and apply `0008_session_pricing.sql`
- Create `lib/types/pricing.ts`
- Update `AppConfigKey` union type in `lib/types/reservations.ts`

### Step 2: Pricing calculation function (depends on Step 1)
- Create `lib/pricing/calculateSessionPrice.ts`
- Unit testable with mocked Supabase client

### Step 3: Signup country collection (depends on Step 1, independent of Step 2)
- Add country dropdown to `SignupForm.tsx` and `CompleteProfileForm.tsx`
- Modify `signUpAction()` and `completeOAuthProfileAction()` to store country
- Add country field to profile settings for existing users

### Step 4: Reservation pricing integration (depends on Steps 1-3)
- Modify `createReservationAction()` to use `calculateSessionPrice()`
- Modify `adminCreateReservationAction()` to add local/tourist toggle
- Create `getSessionPricePreviewAction()` for UI price display
- Modify `CourtCard.tsx` to show price with surcharge indicator

### Step 5: Admin pricing panel (depends on Step 1, parallel with Steps 2-4)
- Create admin pricing page with day-of-week price CRUD
- Create surcharge percentage editor
- Add nav link in AdminSidebar

### Step 6: Integration testing (depends on all above)
- End-to-end: local user books Monday special, pays $5
- End-to-end: tourist user books Monday special, pays $6.25 (25% surcharge)
- Admin walk-in: set tourist, verify price calculation
- Edge case: no day-of-week special configured, falls back to court_pricing
- Edge case: user with no country set, defaults to tourist pricing

## Scalability Considerations

| Concern | Current (3 courts) | Future (20+ courts) | Recommendation |
|---------|---------------------|---------------------|----------------|
| Pricing table size | 14 rows max (7 days x 2 modes) | Same 14 rows (day specials are global) | No scaling issue |
| Price calculation queries | 3-4 queries per reservation | Same 3-4 queries | Batch into single RPC function if latency becomes concern |
| Admin pricing management | 14 rows to manage | Same 14 rows | No scaling issue |
| Country classification | Single column check | Same single check | If expansion crosses borders, make "local countries" a config list in app_config |

## Sources

- Codebase analysis: `supabase/migrations/0001_initial_schema.sql` (profiles, courts, reservations tables)
- Codebase analysis: `supabase/migrations/0003_reservations.sql` (court_config, court_pricing, app_config, reservation columns)
- Codebase analysis: `app/actions/reservations.ts` (reservation creation with price lookup)
- Codebase analysis: `app/actions/sessionPayment.ts` (Stripe checkout using reservation.price_cents)
- Codebase analysis: `lib/stripe/webhookHandlers.ts` (handleOneTimePaymentCompleted confirmation flow)
- Codebase analysis: `app/actions/auth.ts` (signup profile insertion)
- Codebase analysis: `app/actions/admin/reservations.ts` (admin walk-in reservation creation)
- Codebase analysis: `app/api/stripe/webhook/route.ts` (webhook dispatch)
