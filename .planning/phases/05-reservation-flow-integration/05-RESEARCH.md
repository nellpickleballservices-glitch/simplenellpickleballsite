# Phase 5: Reservation Flow Integration - Research

**Researched:** 2026-03-14
**Domain:** Pricing engine integration into reservation and admin flows (Next.js server actions, Supabase queries, React client components)
**Confidence:** HIGH

## Summary

Phase 5 wires the pricing engine (built conceptually in Phase 2 context, tables created in Phase 4) into both user-facing and admin reservation flows. The codebase is well-understood: all integration points are existing files with clear modification points. Zero new packages are needed -- this is purely internal wiring of pure functions, server action modifications, and client component updates.

The critical new artifact is `calculateSessionPrice()` in `lib/utils/pricing.ts` -- a pure function with no DB dependencies. It gets called from three places: `createReservationAction()`, `adminCreateReservationAction()`, and price display on `CourtCard.tsx`. The admin walk-in form needs a local/tourist toggle and live price preview. The admin reservation list needs `is_tourist_price` badge and filter support.

**Primary recommendation:** Build `calculateSessionPrice()` and `isTourist()` as pure functions first, unit test them, then wire into the three server actions, then update UI components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Members (any country, local or tourist) always pay $0 per session -- membership covers it
- Non-member locals pay the admin-set base price for that court + day-of-week
- Non-member tourists pay base price + tourist surcharge percentage
- VIP guest slots inherit the member's $0 pricing (guest is free)
- Null country = treated as tourist (conservative)
- Price shown on CourtCard alongside operating hours (upfront, before slot selection)
- Price updates dynamically when user changes date in the date picker (day-of-week pricing)
- Tourist users see total price only -- no breakdown of base + surcharge
- Members always see "Free" regardless of local/tourist classification
- No "local price" label for locals -- just the price, no explanation
- Stripe checkout uses the calculated price (tourist surcharge included in Stripe amount)
- Stripe description stays generic: "Court Session - CourtName"
- calculateSessionPrice() is a pure function: `calculateSessionPrice({ basePriceCents, surchargePercent, isTourist })` -- no DB queries
- Lives in `lib/utils/pricing.ts` alongside existing `pricingValidation.ts`
- Returns result object: `{ basePriceCents, surchargePercent, surchargeAmountCents, totalCents, isTourist }`
- Companion helper: `isTourist(country: string | null): boolean` -- returns true if country !== 'DO' or null
- Add `default_session_price_cents` key to app_config
- Registered users in admin walk-in: auto-detect from profile country -- read-only indicator
- Guest walk-ins: simple Local/Tourist radio toggle next to guest name field, defaults to "Local"
- Live price preview as admin fills in court + date + local/tourist
- All walk-ins are cash for now (payment_status: 'cash_pending')
- Price calculated server-side at confirmation time (moment of reservation insert)
- Only `price_cents` (total) stored -- no separate base/surcharge columns
- `is_tourist_price` flag set based on user's country at booking time (snapshot)
- `is_tourist_price` set on ALL reservations including members ($0)
- Cancelled reservations retain their price snapshot and is_tourist_price flag
- Local/Tourist badge on every reservation row (green "Local" / amber "Tourist")
- New Local/Tourist/All filter dropdown alongside existing filters
- Price format: always two decimals -- "$10.00/session", "$12.50/session"
- Spanish: "$10.00/sesion" and "Gratis"
- Admin badges and toggle labels are bilingual

### Claude's Discretion
- Legacy court_pricing table cleanup vs session_pricing migration
- Loading skeleton for price updates on date change
- Exact placement of live price preview in admin walk-in form
- Error state handling when pricing lookup fails
- Exact filter UI for local/tourist in admin reservations

### Deferred Ideas (OUT OF SCOPE)
- Stripe payment link for tourist walk-ins
- DIFF-01: Price breakdown showing base + surcharge on checkout
- DIFF-02: Price preview tooltips on time-slot grid
- DIFF-03: Price included in confirmation email
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RESV-01 | User sees correct calculated price before confirming a reservation | CourtCard.tsx price display wired to session_pricing + calculateSessionPrice(); dynamic update on date change via getAvailabilityAction |
| RESV-02 | Reservation stores the calculated price at booking time (snapshot) | createReservationAction() replaces court_pricing lookup with session_pricing + calculateSessionPrice(); stores totalCents + is_tourist_price |
| RESV-03 | Walk-in reservations created by admin include local/tourist designation | AdminReservationForm.tsx gets local/tourist toggle; adminCreateReservationAction() sets is_tourist_price |
| RESV-04 | Walk-in reservations use correct pricing instead of hardcoded $0 | adminCreateReservationAction() replaces `price_cents: 0` with calculateSessionPrice() result |
| ADMN-03 | Admin walk-in form includes local/tourist toggle that affects price | Local/Tourist radio for guests, read-only indicator for registered users; live price preview |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App Router, Server Actions | Already in use |
| Supabase | existing | Database queries, RLS | Already in use |
| next-intl | existing | i18n translations | Already in use |
| Vitest | 4.0.18 | Unit testing pure functions | Already configured |

### Supporting
No new packages needed. All work uses existing stack.

### Alternatives Considered
None -- this phase is pure integration work with existing tools.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  utils/
    pricing.ts           # NEW: calculateSessionPrice(), isTourist()
    pricingValidation.ts  # EXISTS: validation helpers (pattern to follow)
  types/
    pricing.ts           # EXISTS: add PriceCalculation result type
  queries/
    reservations.ts      # MODIFY: swap court_pricing -> session_pricing
app/
  actions/
    reservations.ts      # MODIFY: wire pricing engine into createReservationAction
    sessionPayment.ts    # VERIFY: already reads price_cents from reservation (no change needed)
    admin/
      reservations.ts    # MODIFY: wire pricing into adminCreateReservationAction
  [locale]/(member)/reservations/
    CourtCard.tsx         # MODIFY: dynamic day-of-week pricing display
    actions.ts            # MODIFY: return pricing data on date change
  [locale]/(admin)/admin/reservations/
    AdminReservationForm.tsx  # MODIFY: add local/tourist toggle + price preview
    page.tsx              # MODIFY: add is_tourist_price badge + filter
tests/
  unit/
    pricing.test.ts       # NEW: test calculateSessionPrice + isTourist
```

### Pattern 1: Pure Function in lib/utils (follow pricingValidation.ts)
**What:** Extract business logic as pure functions with no Supabase imports
**When to use:** Any calculation or classification logic
**Example:**
```typescript
// lib/utils/pricing.ts
export interface PriceCalculationInput {
  basePriceCents: number
  surchargePercent: number
  isTourist: boolean
}

export interface PriceCalculationResult {
  basePriceCents: number
  surchargePercent: number
  surchargeAmountCents: number
  totalCents: number
  isTourist: boolean
}

export function calculateSessionPrice(input: PriceCalculationInput): PriceCalculationResult {
  const { basePriceCents, surchargePercent, isTourist } = input
  const surchargeAmountCents = isTourist
    ? Math.round(basePriceCents * surchargePercent / 100)
    : 0
  const totalCents = basePriceCents + surchargeAmountCents
  return { basePriceCents, surchargePercent, surchargeAmountCents, totalCents, isTourist }
}

export function isTourist(country: string | null): boolean {
  return country !== 'DO'
}
```

### Pattern 2: Server Action Data Fetching (follow createReservationAction)
**What:** Fetch session_pricing + tourist_surcharge_pct + user country inside server action, pass to pure function
**When to use:** Any server action that needs to calculate price
**Example:**
```typescript
// Inside createReservationAction, replace step 9:
// 1. Fetch profile country (already fetched in step 2 -- add 'country' to select)
// 2. Fetch session_pricing for court + day_of_week
// 3. Fetch tourist_surcharge_pct from app_config
// 4. Fetch default_session_price_cents from app_config as fallback
// 5. Call calculateSessionPrice()
// 6. Use result.totalCents for price_cents, isTourist(country) for is_tourist_price
```

### Pattern 3: Client-Side Price Display (follow CourtCard existing pattern)
**What:** Pass pricing data from server to client component, format for display
**When to use:** CourtCard price display, admin price preview
**Example:**
```typescript
// CourtCard currently uses: pricing[0]?.price_cents ?? 1000
// Replace with: session pricing for selected day-of-week
// For members: always show t('pricingFree')
// For non-members: show formatted price with surcharge included
```

### Anti-Patterns to Avoid
- **Client-side price calculation:** Price MUST be calculated server-side. Client only displays.
- **Storing surcharge separately:** Only `price_cents` (total) and `is_tourist_price` (boolean) on reservations.
- **Trusting client-submitted price:** Server recalculates at insert time; client price is display-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Day-of-week from date | Manual day calculation | `new Date(dateStr).getDay()` in Santo Domingo TZ | Timezone edge cases |
| Currency formatting | String concatenation | `(cents / 100).toFixed(2)` with `$` prefix | Consistent decimal display |
| Tourist classification | Complex country logic | Simple `country !== 'DO'` check | KISS per CONTEXT.md |

## Common Pitfalls

### Pitfall 1: Timezone-Incorrect Day-of-Week
**What goes wrong:** `new Date('2026-03-14').getDay()` returns UTC day, which may differ from Santo Domingo day
**Why it happens:** JavaScript Date uses UTC by default; Santo Domingo is UTC-4
**How to avoid:** When determining day-of-week for pricing lookup, parse the date string in the correct timezone. The codebase already uses `America/Santo_Domingo` timezone for today's date computation (see `page.tsx` line 39). For pricing, the date comes as YYYY-MM-DD string -- append `T12:00:00` (noon) to avoid midnight rollover issues, or use the date directly since `new Date('2026-03-14T00:00:00').getDay()` gives local day.
**Warning signs:** Weekend prices showing on Friday evenings or Monday mornings

### Pitfall 2: Legacy court_pricing vs New session_pricing
**What goes wrong:** Code still references `court_pricing` table (used in `createReservationAction` step 9 and `getCourtAvailability` query)
**Why it happens:** Two pricing tables exist: `court_pricing` (per booking mode, legacy) and `session_pricing` (per day-of-week, new)
**How to avoid:** Replace ALL `court_pricing` references with `session_pricing` lookups. The `getCourtAvailability` function in `lib/queries/reservations.ts` line 205 fetches `court_pricing` -- this must switch to `session_pricing`. The `createReservationAction` step 9 (lines 135-143) queries `court_pricing` -- replace with `session_pricing` + day-of-week.
**Recommendation (Claude's discretion):** Do NOT drop `court_pricing` table in this phase. Just stop reading from it. Cleanup can be a separate migration.
**Warning signs:** Wrong prices displayed, prices not varying by day

### Pitfall 3: Missing is_tourist_price on Member Reservations
**What goes wrong:** `is_tourist_price` only set for non-members, members get default `false`
**Why it happens:** Developer assumes flag only matters for paid reservations
**How to avoid:** Per CONTEXT.md, `is_tourist_price` is set on ALL reservations (including members at $0) for demographic tracking. Always compute and store it.
**Warning signs:** Admin filter shows 0 tourist members

### Pitfall 4: Admin Walk-In Price Always $0
**What goes wrong:** `adminCreateReservationAction` hardcodes `price_cents: 0` (current line 146)
**Why it happens:** Walk-ins were originally free
**How to avoid:** Wire `calculateSessionPrice()` into admin action. For registered users: fetch their country. For guests: use the local/tourist toggle value from form.
**Warning signs:** Walk-in reservations show $0 in admin list

### Pitfall 5: Price Display Not Updating on Date Change
**What goes wrong:** CourtCard shows initial day's price but doesn't update when user picks a different date
**Why it happens:** `getAvailabilityAction` returns timeSlots and availabilitySummary but not pricing data
**How to avoid:** Either (a) return session_pricing data from `getAvailabilityAction` so CourtCard can update, or (b) have CourtCard fetch pricing separately on date change. Option (a) is cleaner -- extend the action response to include pricing for the selected day.
**Warning signs:** Monday price shown when user views Saturday slots

### Pitfall 6: Surcharge Rounding Errors
**What goes wrong:** Fractional cents from percentage calculation
**Why it happens:** `1000 * 25 / 100 = 250` is clean, but `750 * 25 / 100 = 187.5`
**How to avoid:** Use `Math.round()` on `surchargeAmountCents` before adding to base. Per CONTEXT.md decision.
**Warning signs:** Stripe rejects non-integer amounts

## Code Examples

### calculateSessionPrice (pure function)
```typescript
// lib/utils/pricing.ts
// Source: CONTEXT.md locked decisions

export interface PriceCalculationInput {
  basePriceCents: number
  surchargePercent: number
  isTourist: boolean
}

export interface PriceCalculationResult {
  basePriceCents: number
  surchargePercent: number
  surchargeAmountCents: number
  totalCents: number
  isTourist: boolean
}

export function calculateSessionPrice(input: PriceCalculationInput): PriceCalculationResult {
  const { basePriceCents, surchargePercent, isTourist } = input
  const surchargeAmountCents = isTourist
    ? Math.round(basePriceCents * surchargePercent / 100)
    : 0
  const totalCents = basePriceCents + surchargeAmountCents
  return {
    basePriceCents,
    surchargePercent,
    surchargeAmountCents,
    totalCents,
    isTourist,
  }
}

export function isTourist(country: string | null): boolean {
  return country !== 'DO'
}
```

### Server Action Price Lookup Pattern
```typescript
// Inside createReservationAction, replacing step 9:
// Source: existing code patterns in app/actions/reservations.ts

// Fetch profile with country (modify step 2 select to include 'country')
const { data: profile } = await supabase
  .from('profiles')
  .select('first_name, last_name, locale_pref, country')
  .eq('id', user.id)
  .single()

const userCountry = profile?.country ?? null

// Fetch session pricing for court + day-of-week
const selectedDate = new Date(date + 'T12:00:00') // noon to avoid TZ issues
const dayOfWeek = selectedDate.getDay()

const { data: sessionPricing } = await supabase
  .from('session_pricing')
  .select('price_cents')
  .eq('court_id', courtId)
  .eq('day_of_week', dayOfWeek)
  .maybeSingle()

// Fetch config values: tourist_surcharge_pct + default_session_price_cents
// (can batch with existing app_config fetch in step 5)

const basePriceCents = sessionPricing?.price_cents
  ?? (configMap['default_session_price_cents'] ?? 1000)
const surchargePercent = configMap['tourist_surcharge_pct'] ?? 25

// Calculate
let priceCents = 0
let isTouristPrice = isTourist(userCountry)

if (!isMember) {
  const result = calculateSessionPrice({
    basePriceCents,
    surchargePercent,
    isTourist: isTouristPrice,
  })
  priceCents = result.totalCents
} // else member = $0

// Insert with is_tourist_price on ALL reservations
```

### CourtCard Dynamic Pricing
```typescript
// CourtCard.tsx -- replace static pricing[0]?.price_cents
// Need to receive: sessionPricing array (all 7 days for this court)
// and tourist surcharge pct, and user's tourist status

// On date change: look up pricing for that day-of-week
// For members: always show t('pricingFree')
// For non-members who are tourists: show total (base + surcharge)
// For non-members who are locals: show base price
```

### Admin Walk-In Toggle
```typescript
// AdminReservationForm.tsx -- add to guest mode section
// For registered user: fetch country from search result, show read-only badge
// For guest: Local/Tourist radio, defaults to "Local"

// Live price preview: when courtId + date + local/tourist all populated,
// call a server action to calculate price and display it
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `court_pricing` table (per booking mode) | `session_pricing` table (per day-of-week) | Phase 4 (0009 migration) | Price varies by day, not just by court |
| Hardcoded $10 fallback | `default_session_price_cents` in app_config | Phase 5 (this phase) | Admin-configurable default |
| No tourist distinction | `is_tourist_price` flag + surcharge calculation | Phase 3 (0008 migration) + Phase 5 | Differential pricing |
| Walk-in always $0 | Walk-in uses calculateSessionPrice() | Phase 5 (this phase) | Bug fix, correct revenue tracking |

## Open Questions

1. **Legacy court_pricing table cleanup**
   - What we know: `court_pricing` table exists, used by `getCourtAvailability()` and `createReservationAction()`. `session_pricing` is the replacement.
   - What's unclear: Should we drop `court_pricing` references entirely or keep for backward compatibility?
   - Recommendation: Stop reading from `court_pricing` in all code. Do NOT drop the table (migration risk). Leave cleanup for a future housekeeping phase. Remove the `court_pricing` data from `CourtWithConfig` type and `getCourtAvailability()` query.

2. **Admin price preview implementation**
   - What we know: Need live price preview in walk-in form as admin selects court + date + local/tourist
   - What's unclear: Should this be a client-side calculation or server action call?
   - Recommendation: Use a lightweight server action (`getSessionPricePreview`) that takes courtId + date + isTourist and returns the calculated price. This keeps pricing server-side per PRIC-05 while providing live feedback. Debounce the call on form field changes.

3. **CourtCard pricing data flow on date change**
   - What we know: `getAvailabilityAction` currently returns only timeSlots + availabilitySummary
   - What's unclear: How to get updated pricing to CourtCard when user switches dates
   - Recommendation: Extend `getAvailabilityAction` response to include `sessionPriceCents` for the queried date's day-of-week. Add session_pricing lookup to the query. This keeps it as a single server call.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (exists, configured for `tests/unit/**/*.test.ts`) |
| Quick run command | `npx vitest run tests/unit/pricing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESV-01 | calculateSessionPrice returns correct total for local | unit | `npx vitest run tests/unit/pricing.test.ts -t "local"` | No -- Wave 0 |
| RESV-01 | calculateSessionPrice returns correct total for tourist | unit | `npx vitest run tests/unit/pricing.test.ts -t "tourist"` | No -- Wave 0 |
| RESV-01 | isTourist returns true for non-DO country | unit | `npx vitest run tests/unit/pricing.test.ts -t "isTourist"` | No -- Wave 0 |
| RESV-01 | isTourist returns true for null country | unit | `npx vitest run tests/unit/pricing.test.ts -t "null"` | No -- Wave 0 |
| RESV-02 | Price snapshot stored correctly | manual-only | Verify via Supabase query after reservation | N/A |
| RESV-03 | is_tourist_price set on walk-in | manual-only | Verify via admin walk-in creation | N/A |
| RESV-04 | Walk-in price_cents != 0 for non-free | manual-only | Verify via admin walk-in creation | N/A |
| ADMN-03 | Admin toggle affects calculated price | manual-only | Verify via UI interaction | N/A |
| PRIC-04 | Tourist price = base x (1 + surcharge%) | unit | `npx vitest run tests/unit/pricing.test.ts -t "surcharge"` | No -- Wave 0 |
| PRIC-05 | Members always $0 | unit | `npx vitest run tests/unit/pricing.test.ts -t "member"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/pricing.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/pricing.test.ts` -- covers calculateSessionPrice() and isTourist() pure functions
- No new framework install needed -- Vitest already configured
- No new fixtures needed -- pure functions with no dependencies

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all integration points (server actions, components, queries, types, migrations)
- `supabase/migrations/0008_country_column.sql` -- is_tourist_price column exists, profiles.country exists
- `supabase/migrations/0009_session_pricing.sql` -- session_pricing table with day_of_week pricing
- `supabase/migrations/0003_reservations.sql` -- court_pricing table (legacy), reservations schema
- `lib/utils/pricingValidation.ts` -- pure function pattern to follow
- `app/actions/reservations.ts` -- createReservationAction with court_pricing reference (line 135-143)
- `app/actions/admin/reservations.ts` -- adminCreateReservationAction with hardcoded price_cents: 0 (line 146)
- `app/actions/sessionPayment.ts` -- already reads price_cents from reservation (line 64), no changes needed
- `lib/queries/reservations.ts` -- getCourtAvailability fetches court_pricing (line 205), needs session_pricing

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions -- user-locked implementation choices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages, all existing tools
- Architecture: HIGH - all files inspected, clear modification points identified
- Pitfalls: HIGH - derived from direct code inspection of current bugs and data flow

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- internal integration, no external dependencies)
