# Phase 5: Reservation Flow Integration - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the pricing engine into user-facing reservations and admin walk-in reservations so correct prices (with tourist surcharge for non-members) are calculated, displayed, and stored. Covers: price display on CourtCard, createReservationAction pricing, admin walk-in local/tourist toggle, price snapshot on insert, and admin reservation list enhancements. Does NOT include Stripe payment links for walk-ins, price breakdown display, or pricing audit log.

</domain>

<decisions>
## Implementation Decisions

### Pricing model
- Members (any country, local or tourist) always pay $0 per session — membership covers it
- Non-member locals pay the admin-set base price for that court + day-of-week
- Non-member tourists pay base price + tourist surcharge percentage
- VIP guest slots inherit the member's $0 pricing (guest is free)
- Null country = treated as tourist (conservative)

### Price display for users
- Price shown on CourtCard alongside operating hours (upfront, before slot selection)
- Price updates dynamically when user changes date in the date picker (day-of-week pricing)
- Tourist users see total price only — no breakdown of base + surcharge
- Members always see "Free" regardless of local/tourist classification
- No "local price" label for locals — just the price, no explanation
- Stripe checkout uses the calculated price (tourist surcharge included in Stripe amount)
- Stripe description stays generic: "Court Session - CourtName"

### calculateSessionPrice() design
- Pure function: `calculateSessionPrice({ basePriceCents, surchargePercent, isTourist })` — no DB queries
- Lives in `lib/utils/pricing.ts` alongside existing `pricingValidation.ts`
- Accepts `isTourist` as boolean directly (callers resolve from country or admin toggle)
- Returns result object: `{ basePriceCents, surchargePercent, surchargeAmountCents, totalCents, isTourist }`
- Caller passes resolved base price (caller looks up session_pricing, falls back to app_config default)
- Rounding: Math.round() to nearest cent on final total
- Companion helper: `isTourist(country: string | null): boolean` — returns true if country !== 'DO' or null

### Configurable default price
- Add `default_session_price_cents` key to app_config
- Used as fallback when no session_pricing row exists for a court + day-of-week
- Replaces hardcoded 1000 (was $10 default)

### Admin walk-in local/tourist toggle
- Registered users: auto-detect from profile country — read-only indicator ("Local" or "Tourist")
- Guest walk-ins: simple Local/Tourist radio toggle next to guest name field, defaults to "Local"
- Live price preview as admin fills in court + date + local/tourist
- All walk-ins are cash for now (payment_status: 'cash_pending') — Stripe payment link deferred
- Walk-in `price_cents: 0` bug fixed — uses calculateSessionPrice() result

### Price snapshot & immutability
- Price calculated server-side at confirmation time (moment of reservation insert)
- Only `price_cents` (total) stored — no separate base/surcharge columns
- `is_tourist_price` flag set based on user's country at booking time (snapshot, not derived from current profile)
- `is_tourist_price` set on ALL reservations including members ($0) for demographic tracking
- Cancelled reservations retain their price snapshot and is_tourist_price flag

### Admin reservation list
- Local/Tourist badge on every reservation row (green "Local" / amber "Tourist")
- Badge appears on all reservations including members
- New Local/Tourist/All filter dropdown alongside existing date, court, status filters

### i18n for pricing
- Price format: always two decimals — "$10.00/session", "$12.50/session"
- Spanish: "$10.00/sesion" and "Gratis"
- Admin badges and toggle labels are bilingual: "Local"/"Tourist" (en), "Local"/"Turista" (es)
- USD symbol ($) in both languages per PROJECT.md constraints

### Claude's Discretion
- Legacy court_pricing table cleanup vs session_pricing migration
- Loading skeleton for price updates on date change
- Exact placement of live price preview in admin walk-in form
- Error state handling when pricing lookup fails
- Exact filter UI for local/tourist in admin reservations

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/utils/pricingValidation.ts`: Pure validation helpers — pattern for new pricing utils
- `lib/types/pricing.ts`: SessionPricing, CourtPricingGrid, DAY_NAMES_EN/ES types
- `app/actions/admin/pricing.ts`: getSessionPricingAction(), getTouristSurchargeAction() — data fetching for pricing
- `app/[locale]/(admin)/admin/reservations/AdminReservationForm.tsx`: Walk-in form — needs local/tourist toggle + price preview
- `app/[locale]/(member)/reservations/CourtCard.tsx`: Shows price from `pricing[0]?.price_cents` — needs dynamic pricing
- `app/actions/reservations.ts`: createReservationAction() — needs pricing engine integration
- `app/actions/sessionPayment.ts`: Stripe checkout — needs calculated price

### Established Patterns
- Pure validation/utility functions extracted to `lib/utils/` (no Supabase imports)
- Server Actions with `_prevState + FormData` signature
- Action return shape: `{ success: true }` or `{ error: 'code' }`
- Name snapshot pattern on reservations (reservation_user_first_name/last_name)
- app_config table for configurable values (key/value pairs)
- i18n via `useTranslations()` with namespace keys

### Integration Points
- `createReservationAction()`: Replace legacy court_pricing lookup with session_pricing + calculateSessionPrice()
- `adminCreateReservationAction()`: Replace hardcoded `price_cents: 0` with calculated price + add is_tourist_price
- `CourtCard.tsx`: Replace static `pricing[0]?.price_cents` with dynamic day-of-week price
- `PaymentPanel.tsx` + `createSessionPaymentAction()`: Use calculated price for Stripe checkout
- `getAllReservationsAction()`: Add is_tourist_price to query/response for badge and filter
- `app_config` table: Add `default_session_price_cents` key
- Admin sidebar filter system: Add local/tourist filter

</code_context>

<specifics>
## Specific Ideas

- Pricing is invisible to members — they always see "Free" / "Gratis", no mention of tourist pricing
- Tourist pricing is presented neutrally — just a price, no "tourist surcharge" wording visible to users
- Admin sees full picture: Local/Tourist badge, live price preview, filterable by classification
- The pricing function returns a breakdown object even though only total is displayed now — future-proofs for DIFF-01 (price breakdown on checkout)

</specifics>

<deferred>
## Deferred Ideas

- **Stripe payment link for tourist walk-ins** — Admin generates a link/QR, tourist pays on phone. New capability, not part of pricing integration
- **DIFF-01: Price breakdown showing base + surcharge on checkout** — Future enhancement, data structure supports it via result object
- **DIFF-02: Price preview tooltips on time-slot grid** — Future enhancement
- **DIFF-03: Price included in confirmation email** — Future enhancement

</deferred>

---

*Phase: 05-reservation-flow-integration*
*Context gathered: 2026-03-14*
