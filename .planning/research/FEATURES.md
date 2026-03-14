# Feature Landscape: Local vs Tourist Differential Pricing

**Domain:** Sports/recreation court booking with resident/non-resident pricing
**Researched:** 2026-03-14
**Confidence:** HIGH (existing codebase fully inspected, domain patterns well-established)

---

## Context: What Already Exists

Before defining new features, here is what the codebase already provides that this milestone builds on:

| Existing Component | Relevant Detail |
|--------------------|-----------------|
| `court_pricing` table | Keys on `(court_id, mode)` with `price_cents`. No day-of-week dimension. |
| `app_config` table | Key-value store with `session_price_default = 10`. Pattern for adding new config keys. |
| `reservations.price_cents` | Price is already snapshotted at booking time. Good -- no retroactive price mutation risk. |
| `createReservationAction` | Looks up `court_pricing` by `(court_id, mode)` for non-members. Members get `price_cents = 0`. |
| `createSessionPaymentAction` | Reads `price_cents` from the reservation row and passes it as `unit_amount` in Stripe `price_data`. Already supports dynamic pricing -- no Stripe Price objects. |
| `adminCreateReservationAction` | Walk-in reservations hardcode `price_cents: 0`. This is a bug that must be fixed. |
| `PaymentPanel.tsx` | Displays `priceCents` prop. Already generic -- no changes needed for new pricing. |
| `profiles` table | Has `id, first_name, last_name, phone, avatar_url, locale_pref`. No country field. |
| `signUpAction` | Collects first name, last name, email, phone, password. No country collection. |

---

## Table Stakes

Features users expect. Missing = pricing feels broken, unfair, or untrustworthy.

| Feature | Why Expected | Complexity | Dependencies on Existing | Notes |
|---------|--------------|------------|--------------------------|-------|
| **Country field on signup** | Users must be classified to receive correct price. Every resident/non-resident recreation system requires this at registration. Standard pattern in parks & recreation software. | Low | `profiles` table (add `country` column), `signUpAction` in `app/actions/auth.ts`, `SignupForm.tsx` | Dropdown with "DO" (Dominican Republic) pre-selected. Store ISO 3166-1 alpha-2 country code. Derive `is_local` as: `country = 'DO'`. |
| **Tourist surcharge as percentage on base price** | Industry standard: base price + surcharge %, not two separate price lists. Simpler admin UX, fewer rows to maintain. One setting change updates all tourist prices simultaneously. | Low | `app_config` table (add `tourist_surcharge_pct` key), pricing calculation in `createReservationAction` | Store as integer (e.g., 50 = 50%). Tourist pays `base_price_cents * (1 + surcharge_pct / 100)`. Round to nearest cent. |
| **Dynamic price display before payment** | Users must see the correct price BEFORE committing. Non-members currently see price in `PaymentPanel.tsx` which reads `price_cents` from the reservation. Price must reflect local/tourist status and day-of-week. | Med | `ReservationForm.tsx`, pricing calculation function, `court_pricing` + `app_config` queries | Price must be calculated at display time AND validated at insert time. Never trust client-sent price -- calculate server-side on both display and commit. |
| **Admin UI to set base prices per day of week** | Enables "$5 Mondays" and similar specials. Current `court_pricing` has no day dimension. Day-of-week pricing is the standard granularity for sports facilities -- finer (hourly) is over-engineering for v1.1. | Med | Extend `court_pricing` table to add `day_of_week` column (0-6, or NULL for default). Admin courts panel needs pricing section. | Current UNIQUE constraint is `(court_id, mode)`. Must migrate to `(court_id, mode, day_of_week)`. NULL `day_of_week` = fallback for days without specific pricing. |
| **Admin UI to set tourist surcharge percentage** | Single global setting. Admin must be able to change this without code deploys. | Low | `app_config` table, admin settings panel | Already have `app_config` pattern. One new key-value pair. Admin needs simple input field with validation (0-200% reasonable range). |
| **Walk-in local/tourist designation** | Admin creates walk-in reservations via `adminCreateReservationAction`. Must designate local or tourist to apply correct price. Currently walk-ins get `price_cents: 0` which is wrong -- this is a pricing bug. | Low | `adminCreateReservationAction`, admin reservation form | Add local/tourist toggle to admin walk-in form. Price auto-calculates. Fix the hardcoded `price_cents: 0`. |
| **Correct price stored on reservation at booking time** | Price snapshot prevents retroactive changes from affecting past bookings. Column exists (`price_cents`) but is not correctly populated for walk-ins or with day/tourist logic. | Low | `reservations.price_cents` (exists), shared pricing calculation | Just need correct calculation at insert time. Both user and admin flows must use same pricing function. |

---

## Differentiators

Features that set product apart. Not expected but high-value.

| Feature | Value Proposition | Complexity | Dependencies on Existing | Notes |
|---------|-------------------|------------|--------------------------|-------|
| **Price preview on time-slot grid** | Before selecting a slot, user sees "Local: $5 / Tourist: $10" per slot. Zero surprises, reduces abandoned bookings. | Med | `ReservationForm.tsx` time-slot grid, shared pricing function, client-accessible pricing data | Requires fetching day-of-week pricing and surcharge config to client. Worth building but not launch-blocking. |
| **Price in confirmation email** | Confirmation email currently shows court + time but not price. Showing price builds trust and serves as receipt. | Low | `sendConfirmationEmail` in `lib/resend/emails.ts` | Simple template change. High value for low effort. Should be built alongside core features. |
| **Bilingual country selector** | Country dropdown labels in both Spanish and English via next-intl. 240+ countries is a lot of translation. | Low | i18n message files, `SignupForm.tsx` | Use standard country name dataset. Pre-select "Republica Dominicana" / "Dominican Republic" based on locale. |
| **Admin pricing history / audit log** | Admin sees when prices changed and by whom. Useful for dispute resolution. | Med | New audit mechanism (trigger or application-level logging) | Nice for operational maturity. Not needed for v1.1 launch. Defer. |
| **Visual pricing calendar for admin** | Grid showing base prices for each day of the week per court, with color coding for specials (lower-than-normal prices highlighted). | Med | Admin pricing UI, day-of-week data | Better admin UX than a flat table. Can be a fast-follow after basic CRUD. |
| **Tourist price breakdown on checkout** | Show "Base: $5.00 + Tourist surcharge (50%): $2.50 = Total: $7.50" instead of just "$7.50". Transparency builds trust. | Low | `PaymentPanel.tsx`, pricing calculation returns breakdown not just total | Straightforward UI change. Worth doing for trust. |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Separate price tables for locals vs tourists** | Creates N x 2 pricing rows. Admin must update two prices for every change. Error-prone, hard to audit. | Single base price + surcharge percentage. Tourist price is always derived: `base * (1 + surcharge_pct/100)`. One change propagates everywhere. |
| **User self-classification as local/tourist** | Users will game the system to get lower prices. "Are you a local?" checkbox is trivially bypassed. | Use country from signup profile. Country field is set at registration and harder to fake. Admin can override for walk-ins. |
| **Per-court surcharge percentages** | Over-engineering. One club, one surcharge policy. Per-court surcharges create admin confusion and UI complexity. | Single global `tourist_surcharge_pct` in `app_config`. If per-location surcharges are needed later (national expansion), move to per-location config. |
| **IP-based geolocation for local/tourist detection** | Unreliable (VPNs, shared IPs, hotel WiFi), privacy concerns, adds external API dependency, false positives frustrate users. | Country field on profile is explicit, user-provided, and auditable. |
| **Hourly peak/off-peak pricing within a day** | Massive complexity: time-range-based pricing lookups, more admin UI, edge cases at range boundaries. | Day-of-week pricing covers "$5 Mondays" use case. Hourly pricing is v2+ if demand analysis shows peak-hour pricing opportunity. |
| **Stripe Price objects for each price variation** | Would require creating/managing Stripe Price objects for every (day x mode x court) combination. Stripe supports inline `price_data` which is simpler. | Use `price_data` with `unit_amount` calculated at checkout time. Already the pattern in `sessionPayment.ts`. No Stripe catalog management needed. |
| **Real-time currency conversion for tourists** | `PROJECT.md` explicitly lists "Multi-currency payments" as out of scope. USD only. | All prices in USD cents. No conversion. |
| **Promotional pricing with date ranges** | Time-limited specials (e.g., "Holiday week 50% off") require a `promotions` table with date ranges, priority resolution logic over base pricing, expiration handling, and admin UI. | Defer to future milestone. Day-of-week specials cover the immediate need. Admin can manually adjust base prices for special weeks. |

---

## Feature Dependencies

```
Country on signup  ──>  is_local derivation  ──>  Pricing calculation
                                              │
Day-of-week pricing table  ──────────────────>│
                                              │
Tourist surcharge in app_config  ────────────>│
                                              │
                                              v
                                   calculateSessionPrice()
                                      │              │
                                      v              v
                              Price display    Price at reservation insert
                              (ReservationForm)     │
                                                    v
                                             price_cents on reservation
                                                    │
                                                    v
                                             Stripe checkout (unit_amount)
                                             Confirmation email (price display)

Admin pricing CRUD  ──>  Day-of-week pricing table (write)
Admin settings UI  ──>  Tourist surcharge config (write)
Admin walk-in form ──>  local/tourist toggle ──>  calculateSessionPrice()
```

**Critical ordering:**
1. **Schema changes first** -- country on profiles, day_of_week on court_pricing, surcharge in app_config
2. **Shared pricing function** -- pure logic, testable, used by all downstream consumers
3. **Reservation flow updates** -- both user and admin actions use pricing function
4. **UI updates** -- signup form, reservation price display, admin pricing panels

---

## MVP Recommendation

**Must ship together** (these features form one coherent unit -- shipping any subset creates inconsistency):

1. **Country field on profiles + signup form** -- Foundation for all classification. Add `country TEXT` to profiles, dropdown on signup defaulting to "DO". Existing users get `country = NULL` treated as local (safe default for a Dominican club).

2. **Day-of-week pricing schema migration** -- Add `day_of_week SMALLINT` (0=Sunday through 6=Saturday) to `court_pricing`. Change UNIQUE constraint from `(court_id, mode)` to `(court_id, mode, day_of_week)`. Existing rows get `day_of_week = NULL` meaning "default for all days". Day-specific rows override the default.

3. **Tourist surcharge percentage in app_config** -- `INSERT INTO app_config (key, value) VALUES ('tourist_surcharge_pct', '50')`. 50% default surcharge. Admin-editable.

4. **Shared pricing calculation function** -- `calculateSessionPrice(courtId, bookingMode, date, isLocal): { basePriceCents: number, surchargePercent: number, totalPriceCents: number }`. Queries `court_pricing` with day-of-week fallback + surcharge config. Pure server-side function. Used by display AND insert paths.

5. **Reservation action updates** -- `createReservationAction` uses pricing function instead of raw `court_pricing` lookup. `adminCreateReservationAction` adds local/tourist toggle and calculates price (fixes `price_cents: 0` bug).

6. **Signup form update** -- Country dropdown with i18n labels.

7. **Price display in reservation flow** -- Show calculated price in `ReservationForm.tsx` before user commits.

8. **Admin pricing management UI** -- CRUD for day-of-week prices per court/mode. Input for tourist surcharge percentage.

**Defer to fast-follow:**
- Price preview tooltip on grid slots (nice UX, not blocking)
- Price in confirmation email (low effort, can ship alongside or right after)
- Tourist price breakdown on checkout page
- Pricing audit log

---

## Complexity Assessment

| Feature Area | Complexity | Rationale |
|--------------|-----------|-----------|
| Schema migrations (country, pricing, config) | Low | 3 small additive migrations. No data loss. Backwards-compatible with NULL defaults. |
| Shared pricing function | Low-Med | Pure function with 2-3 queries. Main complexity: fallback logic when no day-specific price exists (fall back to NULL day_of_week row, then to `session_price_default` config). |
| Signup form country field | Low | One dropdown, one column. Existing i18n + form patterns. |
| Reservation flow price integration | Med | Must update both user-facing (`createReservationAction`) and admin (`adminCreateReservationAction`) flows. Must handle: member (free), non-member local, non-member tourist, walk-in local, walk-in tourist. |
| Walk-in tourist designation | Low | One toggle on admin form, passed to pricing function. |
| Admin pricing CRUD | Med | New admin panel section. Day-of-week grid per court per mode. Validation: no negative prices, reasonable surcharge range (0-200%). |
| Stripe checkout accuracy | Low | Already uses inline `price_data` with `unit_amount`. Just pass correctly calculated `price_cents`. Zero Stripe-side changes. |
| Price display in reservation UI | Med | Must show correct price before user commits. Requires either server component data loading or API endpoint for pricing. |

**Total estimated effort:** Medium. No architectural changes needed. All features layer onto existing patterns (app_config key-value, court_pricing table, server actions, admin panel CRUD).

---

## Existing Code Integration Points

| Existing File | What Changes | Why |
|---------------|-------------|-----|
| `supabase/migrations/` (new 0008) | Add `country` to profiles, add `day_of_week` to court_pricing, add `tourist_surcharge_pct` to app_config, update UNIQUE constraint | Schema foundation for all pricing features |
| `app/actions/auth.ts` | `signUpAction` accepts `country` from form, stores in profiles | User classification at registration |
| `app/[locale]/(auth)/signup/SignupForm.tsx` | Country dropdown field (pre-selected "DO") | UI for country selection |
| `app/actions/reservations.ts` | `createReservationAction` uses shared pricing function; looks up user country from profiles to determine local/tourist | Correct price calculation for self-service bookings |
| `app/actions/sessionPayment.ts` | **No change needed** -- already reads `price_cents` from reservation row | Price is already snapshotted; Stripe gets correct amount automatically |
| `app/actions/admin/reservations.ts` | `adminCreateReservationAction` adds `isLocal` param, uses pricing function, fixes `price_cents: 0` bug | Walk-in pricing + bug fix |
| `app/[locale]/(member)/reservations/PaymentPanel.tsx` | **No change needed** -- already displays `priceCents` prop generically | Already handles dynamic prices |
| `app/[locale]/(member)/reservations/ReservationForm.tsx` | Display calculated price before booking confirmation | Pre-booking price transparency |
| `lib/types/reservations.ts` | Update `CourtPricing` type to include `day_of_week: number | null`, add `PriceCalculation` type | Type safety for new pricing logic |
| `app/actions/admin/courts.ts` | `addCourtAction` seeds 7 day-of-week pricing rows (or just NULL default) instead of mode-only rows | Correct defaults for new courts |
| `lib/queries/reservations.ts` | Pricing query function (or new `lib/queries/pricing.ts`) | Shared pricing calculation |
| Admin panel (new page) | New admin pricing management section | Day-of-week CRUD + surcharge config UI |
| i18n message files | Country names, pricing labels, tourist/local labels | Bilingual support for new UI elements |

---

## Sources

- [Stripe: How Products and Prices Work](https://docs.stripe.com/products-prices/how-products-and-prices-work) -- Confirms inline `price_data` approach for dynamic unit amounts (HIGH confidence)
- [Stripe: Manage Prices](https://docs.stripe.com/products-prices/manage-prices) -- Multiple prices per product, inline pricing patterns (HIGH confidence)
- [CourtReserve: How to Price Pickleball Court Time](https://courtreserve.com/how-to-price-your-pickleball-court-time-for-maximum-profit/) -- Day-of-week pricing strategies (MEDIUM confidence)
- [Pitchbooking: Pricing Sports Facilities](https://pitchbooking.com/blog/pricing-sports-facilities-how-much-charge-invoicing-online-payment) -- Start with small % changes, measure over 3 months (MEDIUM confidence)
- [SportsKey: Parks & Recreation Software](https://sportskey.com/post/parks-recreation-software-sports-field-reservations/) -- Resident vs non-resident pricing as standard feature in recreation software (MEDIUM confidence)
- [Sportsman Cloud: Parks and Recreation Software](https://sportsmancloud.com/parks-recreation-management-software) -- Resident/non-resident pricing tiers pattern (MEDIUM confidence)
- Existing codebase: `app/actions/reservations.ts`, `app/actions/sessionPayment.ts`, `app/actions/admin/reservations.ts`, `supabase/migrations/0003_reservations.sql`, `lib/types/reservations.ts`, `app/actions/auth.ts` (HIGH confidence)

---

*Feature research for: v1.1 Local vs Tourist Differential Pricing milestone*
*Researched: 2026-03-14*
