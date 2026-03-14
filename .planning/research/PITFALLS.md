# Domain Pitfalls: v1.1 Local vs Tourist Differential Pricing

**Domain:** Adding dynamic per-session pricing with tourist surcharge to existing Supabase + Stripe booking platform
**Researched:** 2026-03-14
**Confidence:** HIGH (based on direct codebase analysis of existing reservation/payment flow + Stripe API patterns + Postgres concurrency patterns)

---

## Critical Pitfalls

Mistakes that cause incorrect charges, security vulnerabilities, or data corruption requiring rollback.

### Pitfall 1: Price Calculation on the Client — Tourist Surcharge Bypass

**What goes wrong:**
The price displayed to the user is computed in the browser (base price + surcharge percentage) and sent to the server action, which passes it directly to Stripe Checkout's `price_data.unit_amount`. An attacker modifies the form data to send `price_cents: 0` or the local price, bypassing the tourist surcharge entirely. The existing `createReservationAction` in `app/actions/reservations.ts` already accepts the price from `court_pricing` lookup on the server (line 135-142), but the new surcharge logic introduces a temptation to compute on the client for display purposes and then trust that value.

**Why it happens:**
The UI needs to display the final price (base + surcharge) before the user submits. Developers compute the price client-side for display, then reuse that computed value in the form submission rather than recomputing it server-side.

**Consequences:**
- Tourist users pay local prices by manipulating form data
- Revenue loss proportional to tourist surcharge percentage
- Stripe records show correct (manipulated) amounts, making auditing difficult

**Prevention:**
- The server action MUST independently compute the final price: fetch base price from `court_pricing`, fetch surcharge percentage from `app_config`, determine user classification from `profiles.country`, then calculate. Never accept `price_cents` from form data for non-member sessions.
- The existing pattern at `reservations.ts:134-142` is correct — it fetches `court_pricing` server-side. Extend this pattern: after fetching the base price, apply the surcharge server-side based on the user's stored country.
- For display purposes, expose a read-only server action or API route that returns the computed price for a given court/mode/user combination. The UI calls this for display but the booking action recomputes independently.

**Detection:**
- Audit: compare `price_cents` on reservations against what the pricing rules would produce for that user's classification + day of week. Any mismatch indicates bypass.
- Log the pricing components (base, surcharge percentage, final) in the reservation record for audit trail.

**Phase to address:** Price calculation logic (must be server-side from the start).

---

### Pitfall 2: Race Condition Between Admin Price Update and In-Flight Checkout

**What goes wrong:**
Admin changes the Monday special from $5 to $10. A user who loaded the reservation page before the change sees "$5" and clicks "Reserve." The server action computes $5 (old price). Meanwhile, the admin save completes. The reservation is created at $5 despite the admin intending $10. Worse: if using Stripe Checkout with `price_data`, the user is charged $5, but the admin dashboard shows the new $10 price, creating confusion.

The inverse is also problematic: admin lowers prices, but in-flight reservations charge the old higher price.

**Why it happens:**
The `court_pricing` and `app_config` tables have no versioning or locking. The server action reads the price at reservation time, not at page-load time. If the admin updates between page load and form submission, the price is stale relative to what the user saw but current relative to the database — it could go either way depending on exact timing.

**Consequences:**
- Users charged prices different from what they saw on screen
- Admin confusion about which price applied
- Potential chargebacks if users dispute unexpected charges

**Prevention:**
- **Accept the "price at booking time" model explicitly.** The price the server computes at the moment of reservation creation is the price charged. Document this as the business rule.
- Display a price confirmation step before creating the reservation: "Your session price: $X.XX. Proceed?" This ensures the user sees the actual price that will be charged, even if it changed since they loaded the page.
- Store the pricing breakdown on the reservation record: `base_price_cents`, `surcharge_percent`, `final_price_cents`. This creates an audit trail showing exactly how the price was computed at booking time.
- For admin price changes, consider an `effective_date` field so price changes take effect at a future date/time rather than immediately. This eliminates the race window entirely for planned price changes.

**Detection:**
- Reservation records with `final_price_cents` that don't match current pricing rules (expected — they matched at booking time, not now).
- Admin sets price, then reviews recent reservations and sees old price — this is correct behavior but must be understood.

**Phase to address:** Database schema design (add pricing audit columns) and admin pricing UI (add effective date option).

---

### Pitfall 3: Country Field as Mutable User Classification — Tourist-to-Local Exploit

**What goes wrong:**
The `profiles` table gets a `country` column. Users can update their own profile (existing RLS policy: `"Users can update own profile" ON profiles FOR UPDATE`). A tourist sets their country to "DO" (Dominican Republic) to get local pricing, books courts at the local rate, then changes it back. Since the existing RLS allows users to update their own profile, there's no restriction on which fields they can modify.

**Why it happens:**
The existing `profiles` UPDATE policy is a blanket `USING ((SELECT auth.uid()) = id)` — it allows the user to update ANY column on their own profile row. When `country` is added and used for pricing decisions, it becomes a financially significant field that should not be user-editable after initial signup (or at all).

**Consequences:**
- Any user can self-classify as local to avoid surcharge
- Revenue loss on every tourist booking
- Impossible to enforce pricing tiers

**Prevention:**
- **Do not allow users to update the `country` field via the standard profile update flow.** Options:
  1. Use a separate table (`user_classifications`) with a service-role-only write policy. Admin or signup flow sets this; users cannot change it.
  2. Use a column-level trigger that prevents updates to `country` after initial insert (Postgres `BEFORE UPDATE` trigger that raises an exception if `OLD.country != NEW.country`).
  3. Add a `WITH CHECK` clause to the profile update policy that excludes the country column: this is not directly possible in Postgres RLS (RLS is row-level, not column-level), so use option 1 or 2.
- **Recommended approach:** Store classification in a separate `user_classifications` table:
  ```sql
  CREATE TABLE user_classifications (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    country TEXT NOT NULL,
    is_local BOOLEAN GENERATED ALWAYS AS (country = 'DO') STORED,
    classified_at TIMESTAMPTZ DEFAULT NOW(),
    classified_by TEXT DEFAULT 'signup' -- 'signup', 'admin_override'
  );
  -- RLS: users can SELECT own row, only service_role can INSERT/UPDATE
  ```
- The `is_local` computed column prevents logic bugs where different parts of the codebase disagree on what constitutes "local."
- Admin override flow for edge cases (Dominican living abroad, foreign resident of DR).

**Detection:**
- Audit log: if `country` changes on a profile, flag for review.
- Compare `country` at reservation time vs current `country` — frequent changes indicate gaming.

**Phase to address:** Database schema design (before adding country to profiles).

---

### Pitfall 4: Walk-In Tourist/Local Designation Without Price Recalculation

**What goes wrong:**
The existing `adminCreateReservationAction` (in `app/actions/admin/reservations.ts`) hardcodes `price_cents: 0` for all admin-created reservations (line 146). When walk-in pricing is added, the admin must designate local vs tourist, but the action doesn't recalculate price based on this designation. Walk-in tourists are created with `price_cents: 0` regardless of classification.

Additionally, the current walk-in flow uses the admin's `user_id` as `reservationUserId` (line 130). If pricing depends on the user's classification, the system would check the admin's country (likely "DO") instead of the walk-in guest's designation.

**Why it happens:**
The existing admin reservation flow was designed for free walk-in bookings. Adding pricing to it requires rethinking the entire flow — it's not just adding a field.

**Consequences:**
- Walk-in tourists never charged the surcharge
- Revenue leakage on every walk-in tourist booking
- Cash payment tracking inaccurate (cash_pending with wrong amount)

**Prevention:**
- Add `is_local` boolean field to the admin reservation form for walk-in guests.
- The `adminCreateReservationAction` must compute price identically to the user-facing flow: fetch base price from day-of-week pricing table, apply surcharge if `is_local === false`.
- Store the classification on the reservation record itself (not derived from a user profile, since walk-ins don't have profiles): add `is_local_rate BOOLEAN` to the reservations table.
- The `price_cents` on the reservation must reflect the actual computed price, even for cash payments — it represents what should be collected, not what was collected.

**Detection:**
- Query: `SELECT * FROM reservations WHERE created_by_admin = true AND price_cents = 0 AND payment_status = 'cash_pending'` — these should have prices after the pricing feature ships.

**Phase to address:** Admin walk-in flow update (must be updated simultaneously with pricing schema).

---

### Pitfall 5: Day-of-Week Pricing Without Timezone Awareness

**What goes wrong:**
The pricing table has day-of-week specials (e.g., "$5 Mondays"). The server action computes the day of week using `new Date(startTime).getDay()`. But `startTime` is stored as `TIMESTAMPTZ` (UTC in Postgres). A reservation for Monday at 11 PM Dominican time (AST, UTC-4) is actually Tuesday in UTC. The system charges Tuesday's price instead of Monday's special.

The existing codebase stores `starts_at` as `TIMESTAMPTZ` (migration 0001, line 84). The server action receives `startTime` as an ISO string from the form (reservations.ts line 29-30) and creates a `new Date(startTime)`.

**Why it happens:**
JavaScript `Date.getDay()` returns the day in the server's timezone (Vercel runs in UTC by default). The Dominican Republic is UTC-4 (AST, no daylight saving). A reservation at 9 PM Monday AST = 1 AM Tuesday UTC. The day-of-week lookup uses UTC Tuesday, missing Monday's special.

**Consequences:**
- Incorrect pricing for evening reservations (8 PM - midnight local time)
- "$5 Monday" specials not applied for the last 4 hours of Monday (Dominican time)
- Customer complaints about being charged the wrong price

**Prevention:**
- **Always compute day-of-week in Dominican time (America/Santo_Domingo).** Use a timezone-aware date library or Postgres function:
  ```sql
  -- In Postgres: extract day of week in local timezone
  EXTRACT(DOW FROM starts_at AT TIME ZONE 'America/Santo_Domingo')
  ```
  Or in TypeScript:
  ```typescript
  const dominicanDay = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'America/Santo_Domingo'
  }).format(new Date(startTime))
  ```
- Store the timezone as a constant (`America/Santo_Domingo`) in `app_config`, not hardcoded in multiple places.
- The day-of-week pricing table should use integer day (0=Sunday, 6=Saturday) matching `EXTRACT(DOW ...)` or named days matching `to_char(... , 'Day')`. Choose one and be consistent.
- **Test edge case:** Reservation at 11:30 PM Monday AST should get Monday pricing.

**Detection:**
- Check reservations created between 8 PM - midnight AST: do they have the correct day-of-week pricing applied?

**Phase to address:** Price calculation logic (must use timezone-aware day computation from the start).

---

## Moderate Pitfalls

Mistakes that cause bugs, data inconsistency, or poor UX but don't cause financial loss or security issues.

### Pitfall 6: Existing `court_pricing` Table Schema Conflict

**What goes wrong:**
The existing `court_pricing` table (migration 0003) stores per-court, per-mode pricing: `(court_id, mode, price_cents)` with a unique constraint on `(court_id, mode)`. The new day-of-week pricing needs per-court, per-mode, per-day pricing. Developers add a `day_of_week` column to the existing table, breaking the unique constraint, or create a new table that conflicts with the existing one, leaving two sources of truth for base prices.

**Why it happens:**
The v1.0 `court_pricing` table was designed for static per-court pricing. Day-of-week specials require a different schema. Migrating the existing table is more complex than creating a new one, but creating a new one means the existing code that reads `court_pricing` doesn't know about day-of-week overrides.

**Prevention:**
- **Evolve the existing table rather than creating a parallel one.** Add `day_of_week SMALLINT` (0-6) to `court_pricing` with a default of `NULL` meaning "applies to all days."
- Update the unique constraint to `(court_id, mode, day_of_week)` with a partial unique index for the NULL case.
- OR: Create a new `session_pricing` table with `(court_id, mode, day_of_week, price_cents)` and deprecate `court_pricing`. Update ALL existing reads (in `reservations.ts:135-142`) to use the new table.
- **Do not have two tables that both claim to define the base price.** Pick one source of truth.
- Price resolution order: day-specific price > default price > app_config `session_price_default`. Document this hierarchy.

**Phase to address:** Database schema migration (must be designed before any pricing logic).

---

### Pitfall 7: Surcharge Percentage Stored as Integer vs Decimal Confusion

**What goes wrong:**
The tourist surcharge percentage is stored in `app_config` as a JSONB value. Is `25` stored as `25` (meaning 25%) or `0.25`? Different parts of the codebase interpret it differently. The admin enters "25" in the UI (meaning 25%). The calculation code does `base_price * surcharge_value`. If stored as `25`, the tourist pays `$10 * 25 = $250` instead of `$10 * 0.25 = $2.50` surcharge.

The existing `app_config` stores raw numbers as JSONB (e.g., `'72'::jsonb` for hours — migration 0003, line 44-49). Following this pattern, `25` would be stored as `'25'::jsonb`.

**Why it happens:**
No documentation on whether surcharge is stored as a whole number (25 = 25%) or a decimal (0.25 = 25%). The admin UI and the calculation code are written by different developers (or at different times) with different assumptions.

**Consequences:**
- Tourist price is either 25x the base price (catastrophic overcharge) or 0.25x the base price (undercharge) depending on which interpretation wins.
- Stripe Checkout will happily charge $250 for a $10 court session.

**Prevention:**
- **Store as whole number (25 = 25%) to match admin mental model.** Convert in code: `surchargeMultiplier = surchargePercent / 100`.
- Name the config key explicitly: `tourist_surcharge_percent` (not `tourist_surcharge` which is ambiguous).
- Add a CHECK constraint or validation: surcharge percent must be between 0 and 100 (or whatever the business max is).
- Add a TypeScript type:
  ```typescript
  // In lib/types/reservations.ts
  type SurchargeConfig = {
    key: 'tourist_surcharge_percent'
    value: number // 0-100, whole number percentage
  }
  ```
- **Compute in cents throughout.** `finalPriceCents = basePriceCents + Math.round(basePriceCents * surchargePercent / 100)`. Use `Math.round` to avoid floating-point issues with cents.

**Detection:**
- Any reservation where `price_cents` is more than 2x the base price or less than the base price (for a tourist) indicates a calculation error.

**Phase to address:** Config schema design and price calculation logic.

---

### Pitfall 8: Member Sessions Still Free — Surcharge Logic Skipped Entirely

**What goes wrong:**
The existing reservation flow (reservations.ts:124-131) checks `if (isMember)` and sets `paymentStatus = 'free'`, `priceCents = 0`, skipping the entire pricing block. If the business wants members to play free (current behavior), this is correct. But if the business later wants tourist members to pay a surcharge, or if the surcharge should apply to non-member sessions only, the conditional must be explicitly documented as a business rule — not an implementation shortcut.

Additionally, the `price_cents = 0` for member reservations means reporting on "total revenue per day" will undercount if it sums `price_cents` across all reservations.

**Prevention:**
- **Confirm the business rule explicitly:** "Members of any tier play free regardless of local/tourist status." Document this in code comments and the admin UI.
- Even for free member sessions, consider storing the `would_have_been_price_cents` for reporting purposes (what they would have paid as a non-member).
- If members should eventually pay surcharges, design the pricing function to always compute a price, and then apply the "member discount" (100% off) as a separate step. This makes it easy to change later.

**Phase to address:** Business rule confirmation before implementation.

---

### Pitfall 9: Stripe Checkout Amount Doesn't Match Reservation Record

**What goes wrong:**
The reservation is created with `price_cents: 1250` (base $10 + 25% tourist surcharge). The user clicks "Pay" which triggers `createSessionPaymentAction` (in `app/actions/sessionPayment.ts`). This action reads `reservation.price_cents` (line 29) and passes it to Stripe as `unit_amount` (line 68). So far, correct. But if the admin changes the surcharge percentage between reservation creation and payment, the reservation still has the old `price_cents`. This is actually the correct behavior (price locked at booking time), but if someone "fixes" this by re-fetching the current price at payment time, it creates a mismatch.

**Why it happens:**
A well-intentioned developer sees that the payment uses a "stale" price from the reservation record and "improves" it by re-computing the price at payment time from the current pricing tables. Now the Stripe charge doesn't match what the user agreed to.

**Consequences:**
- User sees "$12.50" at booking, but is charged "$15.00" at payment because the surcharge changed
- Chargebacks and trust issues

**Prevention:**
- **The `price_cents` on the reservation record IS the price. Period.** The `createSessionPaymentAction` must use `reservation.price_cents` exactly as stored. Never re-compute at payment time.
- Add a code comment in `sessionPayment.ts` explaining this is intentional:
  ```typescript
  // IMPORTANT: Use the price locked at reservation time, NOT the current pricing.
  // Price was computed and stored when the reservation was created.
  // Re-computing here would charge a different amount than what the user agreed to.
  ```
- The existing `sessionPayment.ts` already does this correctly (reads from reservation). Protect this pattern during the pricing refactor.

**Detection:**
- If `sessionPayment.ts` ever imports from `court_pricing` or `app_config`, something is wrong.

**Phase to address:** Code review checkpoint during payment flow updates.

---

### Pitfall 10: RLS Policy Leak on Pricing Tables

**What goes wrong:**
The new pricing tables (day-of-week prices, surcharge config) need to be readable by all authenticated users (so the UI can display prices) but writable only by admins. The existing `court_pricing` RLS (migration 0003, line 62-63) already follows this pattern: SELECT for `authenticated`, full access for `service_role`. However, if a developer adds an UPDATE policy for `authenticated` to allow the admin UI to work (because admin actions use the user's auth context, not service role), any user can update prices.

The existing admin actions use `supabaseAdmin` (service role client) — see `app/actions/admin/reservations.ts:4`. New admin pricing actions must also use `supabaseAdmin`.

**Prevention:**
- **All admin pricing mutations must use `supabaseAdmin` (service role client).** Follow the existing pattern in `app/actions/admin/`.
- Never add UPDATE/INSERT/DELETE RLS policies for `authenticated` on pricing tables.
- New pricing tables should copy the exact RLS pattern from `court_pricing`:
  ```sql
  CREATE POLICY "All authenticated can read [table]" ON [table] FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Service role full access on [table]" ON [table] FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```
- Also make pricing readable by `anon` if non-authenticated users need to see prices before signing up.

**Phase to address:** Database migration for new pricing tables.

---

## Minor Pitfalls

### Pitfall 11: Country Dropdown Missing or Using Non-Standard Codes

**What goes wrong:**
The signup form adds a "Country" dropdown. Developers use a random list of country names in Spanish, or use 3-letter codes, or mix Spanish and English country names. Later, the `is_local` check compares against "Dominican Republic" but the stored value is "Republica Dominicana" or "DR" or "DOM".

**Prevention:**
- Use ISO 3166-1 alpha-2 country codes (2-letter: "DO" for Dominican Republic). These are standard, unambiguous, and language-independent.
- Use a well-maintained country list library (e.g., `i18n-iso-countries` for display names in Spanish/English).
- The `is_local` check should be: `country === 'DO'`. Simple, consistent, no string matching issues.
- Store the code, display the localized name.

**Phase to address:** Signup form update.

---

### Pitfall 12: Existing Users Have No Country — NULL Classification

**What goes wrong:**
The `profiles` table gains a `country` column, but existing users have `NULL`. When the pricing logic checks `is_local = (country === 'DO')`, NULL evaluates to `false` — all existing users are classified as tourists and charged the surcharge.

**Prevention:**
- Migration should set a sensible default for existing users. Since the club is in the Dominican Republic and existing users are likely local, consider:
  - Default `country = 'DO'` for all existing users (if business confirms most are local).
  - OR: Default `country = NULL` and treat NULL as "unclassified" with a separate pricing rule (charge local rate until classified).
  - OR: Prompt existing users to set their country on next login (profile completion flow).
- **Never treat NULL country as tourist.** Explicitly handle the NULL case in pricing logic.
- Add a NOT NULL constraint with a migration that backfills first.

**Phase to address:** Database migration (must include data backfill strategy).

---

### Pitfall 13: i18n Missing for New Pricing UI Strings

**What goes wrong:**
New pricing-related strings are added in English only, or hardcoded in the component. The existing app is fully bilingual with `next-intl` and externalized strings. New strings like "Tourist surcharge: 25%", "Local rate", "Your price includes a visitor fee" are hardcoded in English.

**Prevention:**
- Add all new pricing strings to both `messages/es.json` and `messages/en.json` before building UI components. Follow the existing namespace pattern.
- Key strings needed:
  - Price display: "Base price", "Tourist surcharge", "Total"
  - Classification: "Local resident", "Visitor/Tourist"
  - Admin: "Set surcharge percentage", "Day-of-week pricing", "Effective date"
- The existing codebase is fully bilingual — maintain this standard.

**Phase to address:** Every UI phase (add strings before components).

---

### Pitfall 14: Admin Pricing UI Without Optimistic Locking

**What goes wrong:**
Two admin users open the pricing management page. Admin A changes Monday's price from $5 to $7. Admin B (who loaded the page before A's change) changes Tuesday's price. Admin B's save overwrites Admin A's Monday change because B's form still had the old Monday price and submitted all days together.

**Prevention:**
- Use per-row updates, not bulk "save all pricing" operations. Each day-of-week/court/mode combination is an independent row update.
- Add an `updated_at` timestamp to the pricing table. On update, check `WHERE updated_at = [value from when page loaded]`. If 0 rows affected, another admin changed it — return a conflict error.
- Since this is a small club with likely 1 admin, this is LOW priority but worth designing correctly.

**Phase to address:** Admin pricing UI.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database migration | Existing users get NULL country, treated as tourist | Backfill existing users as local (DO) or prompt for classification |
| Database migration | Two pricing tables (old `court_pricing` + new day-of-week) | Evolve existing table or fully deprecate it; single source of truth |
| Profile/signup update | Country field user-editable, bypasses surcharge | Separate `user_classifications` table with service-role-only writes |
| Price calculation | Computed client-side, accepted in form data | Server-side recomputation; never trust client-sent price |
| Price calculation | Day-of-week computed in UTC, not AST | Always use `America/Santo_Domingo` timezone for day extraction |
| Price calculation | Surcharge stored as 25 vs 0.25 confusion | Name it `_percent`, document convention, validate range |
| Stripe Checkout | Re-computing price at payment time vs using locked reservation price | Use `reservation.price_cents` exactly; add protective comment |
| Admin walk-in flow | Walk-in guests created with `price_cents: 0` | Compute walk-in price from designation + day-of-week pricing |
| Admin pricing management | Price change race with in-flight bookings | Accept "price at booking time" model; store audit trail |
| Admin pricing management | Bulk save overwrites concurrent admin changes | Per-row updates with `updated_at` optimistic locking |
| RLS policies | Pricing tables writable by authenticated users | Copy existing `court_pricing` RLS pattern; admin uses `supabaseAdmin` |

---

## Integration Gotchas Specific to This Feature

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Checkout + Dynamic Pricing | Using Stripe Price objects (pre-created prices) for dynamic per-session amounts | Use `price_data` with inline `unit_amount` as the existing code already does — this is correct for dynamic pricing |
| Supabase RLS + Pricing | Adding `authenticated` UPDATE policy on pricing tables for admin UI | Admin actions use `supabaseAdmin` (service role); keep pricing tables read-only for `authenticated` |
| `app_config` + Surcharge | Storing surcharge as JSONB without documenting if it's 25 or 0.25 | Use explicit key name (`tourist_surcharge_percent`) and validate range 0-100 |
| Walk-in + Pricing | Using admin's profile country for walk-in price calculation | Walk-in local/tourist is a form field on the admin reservation form, not derived from any user profile |
| Reservation record + Price audit | Storing only `price_cents` without breakdown | Store `base_price_cents`, `surcharge_percent_applied`, `final_price_cents` for auditability |
| Day-of-week + Timezone | `new Date().getDay()` on Vercel (UTC) | Use `Intl.DateTimeFormat` with `timeZone: 'America/Santo_Domingo'` or Postgres `AT TIME ZONE` |

---

## "Looks Done But Isn't" Checklist (v1.1 Specific)

- [ ] **Country field immutability:** Country is on the signup form and profile shows it — verify users CANNOT change it via profile update (check RLS policies or trigger).
- [ ] **Server-side price computation:** Price displays correctly in the UI — verify the form submission does NOT send `price_cents` and the server recomputes it independently.
- [ ] **Timezone-correct day-of-week:** Monday special prices work — verify a reservation at 11 PM Monday AST gets Monday pricing (not Tuesday).
- [ ] **Walk-in pricing:** Admin can create walk-in reservations — verify `price_cents` is non-zero for non-member walk-ins and reflects local/tourist designation.
- [ ] **Existing user backfill:** New pricing works for new signups — verify existing users without a country value are not charged tourist rates.
- [ ] **Surcharge percentage interpretation:** Admin sets 25% surcharge — verify a $10 base session costs $12.50 for tourists (not $260 or $2.50).
- [ ] **Payment amount matches reservation:** Tourist pays via Stripe — verify the Stripe charge amount exactly matches `reservation.price_cents`.
- [ ] **Pricing audit trail:** Reservation exists with a price — verify `base_price_cents` and `surcharge_percent_applied` are stored and reconstruct the correct `final_price_cents`.
- [ ] **Single pricing source:** Day-of-week pricing works — verify the old `court_pricing` table is either evolved or fully deprecated (no two tables defining base prices).
- [ ] **Admin pricing RLS:** Admin can update prices — verify a non-admin authenticated user CANNOT update pricing tables (test with Supabase client, not Studio).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tourist surcharge bypass (client-side price accepted) | HIGH | Audit all tourist reservations for underpayment; fix server action; no way to recover lost revenue from completed transactions |
| Country field exploited (users self-reclassify) | MEDIUM | Migrate to separate classification table; backfill from signup data; add admin review queue for country changes |
| Wrong day-of-week pricing (UTC vs AST) | MEDIUM | Fix timezone logic; audit affected reservations (8 PM - midnight AST window); refund overcharges or honor undercharges as goodwill |
| Surcharge percentage 25x overcharge | HIGH | Immediate hotfix; audit Stripe charges; issue refunds for all affected tourists; customer communication required |
| Existing users charged tourist rates (NULL country) | MEDIUM | Run backfill migration; refund affected reservations; communicate the fix to users |
| Walk-in tourists not charged surcharge | LOW | Fix admin action; going forward prices are correct; past undercharges are sunk cost |

---

## Sources

- Direct codebase analysis: `app/actions/reservations.ts`, `app/actions/sessionPayment.ts`, `app/actions/admin/reservations.ts`, `lib/stripe/webhookHandlers.ts`, `supabase/migrations/0003_reservations.sql`, `supabase/migrations/0001_initial_schema.sql`
- [Stripe Checkout Session API — `price_data` for dynamic pricing](https://docs.stripe.com/api/checkout/sessions/create)
- [PostgreSQL advisory locks for race conditions](https://firehydrant.com/blog/using-advisory-locks-to-avoid-race-conditions-in-rails/)
- [PostgreSQL explicit locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Supabase RLS performance best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [EU pricing discrimination regulations](https://europa.eu/youreurope/citizens/consumers/shopping/pricing-payments/index_en.htm) — context on legal framework for dual pricing (not directly applicable in DR but relevant for tourist-facing platforms)
- Dominican Republic timezone: America/Santo_Domingo (AST, UTC-4, no daylight saving)

---
*Pitfalls research for: NELL Pickleball Club v1.1 — Local vs Tourist Differential Pricing*
*Researched: 2026-03-14*
