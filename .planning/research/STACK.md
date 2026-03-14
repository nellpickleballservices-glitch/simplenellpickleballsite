# Technology Stack: v1.1 Local vs Tourist Pricing

**Project:** NELL Pickleball Club
**Milestone:** Differential per-session pricing (local vs tourist)
**Researched:** 2026-03-14
**Confidence:** HIGH

---

## Key Finding: No New Dependencies Required

The v1.1 pricing milestone requires **zero new npm packages**. Every feature -- country-based user classification, dynamic day-of-week pricing, tourist surcharge percentages, and admin pricing management -- is implementable with the existing stack through schema changes, server action modifications, and new admin UI pages.

This is the correct outcome. Adding libraries for problems solvable with plain TypeScript and Postgres is anti-pattern territory.

---

## Existing Stack (Unchanged)

These are already installed and validated. Listed here for reference; DO NOT reinstall or upgrade.

| Technology | Installed Version | Role in v1.1 |
|------------|------------------|--------------|
| Next.js | 16.1.6 | Server Actions for pricing logic, admin pages |
| TypeScript | 5.9.3 | Type safety for pricing calculations |
| Supabase (`@supabase/supabase-js`) | 2.98.0 | Schema changes, RLS policies, admin RPC |
| Supabase SSR (`@supabase/ssr`) | 0.9.0 | Auth context in pricing server actions |
| Stripe (`stripe`) | 20.4.1 | Dynamic `price_data.unit_amount` in checkout sessions |
| TailwindCSS | 4.2.1 | Admin pricing UI styling |
| next-intl | 4.8.3 | Bilingual pricing labels, admin form translations |

---

## Stack Modifications by Feature

### 1. Country-Based User Classification

**What changes:** `profiles` table gets a `country` column. Signup form gets a country select field. No library needed.

**Schema change:**
```sql
ALTER TABLE profiles ADD COLUMN country TEXT DEFAULT 'DO';
-- 'DO' = Dominican Republic (ISO 3166-1 alpha-2)
-- Any country code != 'DO' → tourist
```

**Why a simple TEXT column, not a lookup table:**
- The business logic is binary: Dominican (`DO`) = local, everything else = tourist
- No need for a full countries table -- the form uses a static `<select>` with ISO country codes
- ISO 3166-1 alpha-2 codes are a stable standard (249 entries) that can be hardcoded as a TypeScript constant array
- If the club expands to other Caribbean countries as "local," just update the check to `IN ('DO', 'HT', ...)` -- a one-line server-side change

**Why NOT use a geolocation library or API:**
- The requirement says "country field on signup" -- explicit user input, not IP geolocation
- IP geolocation is unreliable for tourists using VPNs or local SIMs
- Address-based classification is transparent and legally defensible (user self-declares)
- Zero runtime cost, zero API dependency

**Integration point -- `app/actions/auth.ts` and `app/[locale]/(auth)/signup/SignupForm.tsx`:**
- Add `country` to the signup form as a required `<select>` field
- Pass `country` to the profile insert/upsert in the signup action
- Add `country` to the `completeOAuthProfileAction` for Google OAuth users

**Integration point -- `app/[locale]/(admin)/admin/users/UserSlideOut.tsx`:**
- Display country and local/tourist badge in admin user detail view
- Allow admin to override country classification for walk-in users

### 2. Dynamic Day-of-Week Pricing

**What changes:** Replace the current `court_pricing` table (which has a flat per-court, per-mode price) with a day-aware pricing table. No library needed.

**Current schema (to be replaced):**
```sql
-- court_pricing: court_id + mode → price_cents (flat, no day awareness)
```

**New schema:**
```sql
CREATE TABLE session_pricing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=Sunday, 6=Saturday (matches JS Date.getDay())
  booking_mode TEXT NOT NULL CHECK (booking_mode IN ('full_court', 'open_play')),
  price_cents  INT NOT NULL DEFAULT 1000,
  label_es     TEXT,  -- e.g., "Lunes de $5"
  label_en     TEXT,  -- e.g., "$5 Mondays"
  UNIQUE (day_of_week, booking_mode)
);
```

**Why per-day instead of per-court:**
- The club currently has 3 courts at 1 location with identical pricing
- The business requirement is day-of-week specials ("$5 Mondays"), not court-specific pricing
- Per-court pricing adds complexity (3 courts x 7 days x 2 modes = 42 rows vs 14 rows) with no business value
- If per-court pricing is needed later, add a nullable `court_id` FK with a fallback to the global day price

**Why `SMALLINT` for day_of_week, not a TEXT day name:**
- Directly maps to JavaScript `Date.getDay()` -- zero conversion needed in server actions
- Avoids locale-dependent day name comparisons
- Compact, indexable, constraint-checkable

**Integration point -- `app/actions/reservations.ts` (step 9):**
- Replace the current `court_pricing` lookup with a `session_pricing` lookup using the reservation date's day-of-week
- Calculate: `const dayOfWeek = new Date(date).getDay()`

### 3. Tourist Surcharge Percentage

**What changes:** Add a single `app_config` entry for the surcharge percentage. Applied as a multiplier on the base price. No library needed.

**Config entry:**
```sql
INSERT INTO app_config (key, value) VALUES
  ('tourist_surcharge_percent', '50'::jsonb);
-- 50 = 50% surcharge. Tourist pays base_price * 1.5
```

**Why a percentage, not a fixed dollar amount:**
- Scales automatically when base prices change (e.g., "$5 Monday" for locals = $7.50 for tourists)
- Single config value covers all days and modes
- Admin changes one number, not N price entries

**Why in `app_config`, not a separate table:**
- It is a single scalar value, not a relational entity
- `app_config` already exists and is used for `cancellation_window_hours`, `pending_payment_hold_hours`, etc.
- Consistent with the existing configuration pattern

**Price calculation (server-side only):**
```typescript
// In reservations.ts, step 9
const basePriceCents = pricing?.price_cents ?? 1000

// Determine if user is tourist
const { data: profile } = await supabase
  .from('profiles')
  .select('country')
  .eq('id', user.id)
  .single()

const isTourist = profile?.country !== 'DO'

let finalPriceCents = basePriceCents
if (isTourist) {
  const surchargePercent = configMap['tourist_surcharge_percent'] ?? 0
  finalPriceCents = Math.round(basePriceCents * (1 + surchargePercent / 100))
}
```

**Why server-side only, never client-side:**
- Prevents price manipulation via browser dev tools
- The client displays the calculated price; the server determines it
- Stripe receives the server-calculated amount -- never trust client-provided prices

**Integration point -- `app/actions/sessionPayment.ts`:**
- The `reservation.price_cents` stored at booking time is already the final price (tourist surcharge included)
- Stripe checkout `unit_amount` uses this stored value -- no change needed in the payment action
- This is the correct pattern: calculate once at reservation time, store the result

### 4. Admin Pricing Management

**What changes:** New admin page at `app/[locale]/(admin)/admin/pricing/page.tsx` with server actions in `app/actions/admin/pricing.ts`. No library needed.

**Admin UI components (all using existing patterns):**
- Day-of-week pricing grid: 7 rows x 2 columns (full_court, open_play) with editable price inputs
- Tourist surcharge slider/input: single percentage field
- Special label inputs: bilingual labels for promotional day names
- Save action: bulk upsert to `session_pricing` + update `app_config`

**Why a single admin page, not scattered settings:**
- All pricing configuration in one place reduces admin confusion
- The pricing grid naturally shows the week at a glance
- Tourist surcharge visually relates to base prices (admin sees both)

**Integration point -- `app/[locale]/(admin)/admin/layout.tsx`:**
- Add "Pricing" to the admin sidebar navigation
- Uses existing admin layout with three-layer protection (middleware + layout + action)

### 5. Walk-In Tourist/Local Designation

**What changes:** Modify the admin reservation form to include a local/tourist toggle. No library needed.

**Integration point -- `app/[locale]/(admin)/admin/reservations/AdminReservationForm.tsx`:**
- Add a toggle/switch for "Tourist" designation
- When creating a walk-in reservation, pass `is_tourist: true/false` to the action
- The action calculates the price with or without surcharge based on this flag
- For walk-ins without accounts, the `is_tourist` flag overrides the country-based check

**Integration point -- `app/actions/admin/reservations.ts`:**
- Accept `is_tourist` boolean parameter for admin-created reservations
- Apply surcharge logic identically to the user-facing flow

---

## What NOT to Add

| Do Not Add | Why | What to Do Instead |
|------------|-----|---------------------|
| `i18n-iso-countries` or `country-list` npm packages | Overkill for a `<select>` dropdown. The full ISO 3166-1 list is 249 entries -- trivially stored as a TypeScript constant. | Create `lib/constants/countries.ts` with `{ code: string, name_en: string, name_es: string }[]` |
| IP geolocation service (MaxMind, ipinfo, etc.) | Requirement is explicit country selection, not detection. IP geolocation fails for VPN users, tourists on local SIMs, and locals abroad. | Country `<select>` on signup form |
| Separate pricing microservice | The pricing logic is a single multiplication. No need for a service boundary. | Server action with inline calculation |
| `decimal.js` or `big.js` for price math | All prices are in integer cents. `Math.round(baseCents * 1.5)` has no floating-point risk when the result is rounded to integer. | Integer arithmetic with `Math.round()` |
| `react-hook-form` for admin pricing form | The admin pricing form has ~16 fields (7 days x 2 modes + surcharge + labels). React 19 `useActionState` handles this fine. Adding a form library for one page is unnecessary. | `useActionState` + native form validation |
| Zod for pricing validation | The existing codebase does not use Zod (despite the v1.0 research recommending it). Adding it for one feature would be inconsistent. | Inline validation in server actions, matching existing patterns |
| Database trigger for price calculation | Triggers hide business logic. The surcharge calculation is 3 lines of TypeScript -- keep it visible in the server action. | Explicit calculation in `createReservationAction` |

---

## Schema Migration Summary

One new migration file: `supabase/migrations/0008_session_pricing.sql`

| Change | Table | Type |
|--------|-------|------|
| Add `country` column | `profiles` | ALTER TABLE |
| Create `session_pricing` table | (new) | CREATE TABLE |
| Seed 14 rows (7 days x 2 modes) | `session_pricing` | INSERT |
| Add `tourist_surcharge_percent` config | `app_config` | INSERT |
| Add `is_tourist` column | `reservations` | ALTER TABLE |
| Deprecate `court_pricing` table | `court_pricing` | (keep for rollback, stop using in code) |

**RLS for `session_pricing`:**
- SELECT: all authenticated users (needed to display prices on reservation page)
- INSERT/UPDATE/DELETE: service_role only (admin actions use service role client)
- Matches existing pattern from `court_pricing` and `court_config`

---

## Stripe Integration Notes

**No Stripe API changes needed.** The existing `sessionPayment.ts` already uses `price_data.unit_amount` with the stored `reservation.price_cents`. Since the surcharge is applied at reservation creation time and stored in `price_cents`, the Stripe checkout session receives the correct final amount automatically.

**One enhancement to consider:** Add `metadata.is_tourist` and `metadata.base_price_cents` to the Stripe checkout session for reporting/reconciliation:

```typescript
metadata: {
  reservation_id: reservationId,
  is_tourist: String(isTourist),
  base_price_cents: String(basePriceCents),
  surcharge_percent: String(surchargePercent),
},
```

This costs nothing and helps with financial reporting in the Stripe dashboard.

---

## Sources

- Existing codebase analysis (package.json, migrations, server actions) -- PRIMARY source
- ISO 3166-1 country codes standard -- stable, no verification needed
- Supabase RLS patterns -- consistent with existing `court_pricing` policies in `0003_reservations.sql`
- Stripe `price_data` documentation -- existing pattern in `app/actions/sessionPayment.ts` already uses dynamic pricing

---

*Stack research for: v1.1 Local vs Tourist Pricing (NELL Pickleball Club)*
*Researched: 2026-03-14*
