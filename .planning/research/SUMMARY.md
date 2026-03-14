# Project Research Summary

**Project:** NELL Pickleball Club — v1.1 Local vs Tourist Differential Pricing
**Domain:** Sports/recreation court booking with resident/non-resident dynamic pricing
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

The v1.1 milestone adds differential per-session pricing to an existing Supabase + Next.js + Stripe pickleball court booking platform. The core requirement is straightforward: classify users as local (Dominican) or tourist based on a country field at signup, apply a configurable surcharge percentage on top of day-of-week base prices, and give admins a UI to manage it all. The critical insight from research is that **zero new dependencies are needed** -- the existing stack (Next.js server actions, Supabase RLS, Stripe inline `price_data`) already supports every feature through schema changes and new server-side logic.

The recommended approach is to build a single `calculateSessionPrice()` function that encapsulates all pricing logic (day-of-week lookup with fallback chain, tourist surcharge application) and use it in three places: user reservation creation, admin walk-in creation, and price preview display. This avoids logic duplication and ensures price consistency. The existing payment flow (`createSessionPaymentAction`) requires no changes because it already reads `reservation.price_cents` -- the price-at-booking-time snapshot pattern is already correct.

The primary risks are security-related, not complexity-related. The top three: (1) client-side price manipulation bypassing the tourist surcharge -- mitigated by server-side-only price computation, (2) users changing their own country field to dodge the surcharge -- mitigated by making country immutable after signup or using a separate classification table with service-role-only writes, and (3) timezone-incorrect day-of-week calculation causing wrong pricing for evening reservations -- mitigated by always computing day-of-week in `America/Santo_Domingo` timezone, not UTC. A known bug in the existing codebase -- `adminCreateReservationAction` hardcoding `price_cents: 0` for all walk-ins -- must be fixed as part of this milestone.

## Key Findings

### Recommended Stack

No new npm packages. Every feature is implementable with the existing installed stack: Next.js 16.1.6 (server actions), TypeScript 5.9.3 (pricing types), Supabase 2.98.0 (schema + RLS), Stripe 20.4.1 (inline `price_data`), next-intl 4.8.3 (bilingual labels). The only additions are schema migrations and new TypeScript modules.

**Core technologies (all existing, unchanged):**
- **Supabase (Postgres):** New `session_pricing` table, `country` column on `profiles`, `tourist_surcharge_pct` in `app_config`
- **Next.js Server Actions:** `calculateSessionPrice()` as pure server-side function, admin pricing CRUD actions
- **Stripe inline `price_data`:** Already uses `unit_amount` from `reservation.price_cents` -- no Stripe-side changes needed

### Expected Features

**Must have (table stakes -- ship together as one coherent unit):**
- Country field on signup with ISO 3166-1 alpha-2 codes (local = `DO`)
- Day-of-week base pricing table (`session_pricing`) replacing flat per-court pricing
- Tourist surcharge percentage in `app_config` (applied as multiplier on base price)
- Shared `calculateSessionPrice()` function used by all reservation flows
- Admin pricing management page (day-of-week grid + surcharge input)
- Walk-in local/tourist toggle on admin reservation form (fixes `price_cents: 0` bug)
- Correct price display before user commits to booking

**Should have (differentiators -- high value, low effort):**
- Tourist price breakdown on checkout ("Base: $5.00 + Surcharge: $2.50 = Total: $7.50")
- Price in confirmation email
- Bilingual country selector with locale-aware pre-selection

**Defer (v2+):**
- Price preview tooltips on time-slot grid
- Pricing audit log / history
- Visual pricing calendar for admin
- Hourly peak/off-peak pricing
- Promotional pricing with date ranges

### Architecture Approach

The architecture adds a pricing calculation layer between the reservation action and the database insert. A new `session_pricing` table stores day-of-week base prices (14 rows: 7 days x 2 modes). The existing `court_pricing` table becomes a fallback. Price resolution follows a three-tier priority: day-of-week special > court/mode pricing > global default. The tourist surcharge is a single scalar in `app_config`, applied as a percentage multiplier. Price is computed once at reservation creation and stored on the reservation row -- the Stripe payment flow reads this stored value unchanged.

**Major components:**
1. **`session_pricing` table** -- day-of-week base prices with bilingual promotional labels
2. **`calculateSessionPrice()` function** -- pure pricing logic with 3-tier fallback, surcharge application, timezone-aware day extraction
3. **`profiles.country` column** -- user classification source data (store country, derive local/tourist in code)
4. **Admin pricing page** -- CRUD for day-of-week prices + surcharge percentage, single page for all pricing config
5. **`reservations.is_tourist_price` column** -- audit trail flag snapshotted at booking time

### Critical Pitfalls

1. **Client-side price manipulation** -- Never accept `price_cents` from form data. Server action must independently compute price from `profiles.country`, `session_pricing`, and `app_config`. The existing server-side lookup pattern is correct; extend it, do not bypass it.

2. **Country field mutability exploit** -- Users can update their own profile (existing RLS). If `country` is on `profiles` with the current UPDATE policy, users change to `DO` for local pricing. Use a separate `user_classifications` table with service-role-only writes, or add a Postgres trigger preventing country updates after initial insert.

3. **Timezone-incorrect day-of-week** -- Vercel runs in UTC. A Monday 11 PM reservation in Dominican time (UTC-4) is Tuesday in UTC. Always use `Intl.DateTimeFormat` with `timeZone: 'America/Santo_Domingo'` or Postgres `AT TIME ZONE` for day extraction.

4. **Walk-in `price_cents: 0` bug** -- The existing `adminCreateReservationAction` hardcodes free pricing. Must be updated to compute price using `calculateSessionPrice()` with a local/tourist toggle.

5. **Surcharge percentage interpretation** -- Store as whole number (25 = 25%), name the key `tourist_surcharge_percent` explicitly, compute as `Math.round(baseCents * pct / 100)`. Document the convention to prevent 25x overcharge bugs.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema Foundation + Pricing Types

**Rationale:** All downstream features depend on the database schema. Migration must be fully additive (no destructive changes) and include data backfill strategy for existing users.
**Delivers:** `session_pricing` table, `country` column on `profiles`, `is_tourist_price` on `reservations`, `tourist_surcharge_pct` in `app_config`, TypeScript types for pricing domain.
**Addresses:** Schema migrations (FEATURES), data model (ARCHITECTURE)
**Avoids:** NULL country treating existing users as tourists (Pitfall 12), two pricing tables without clear source of truth (Pitfall 6), surcharge naming ambiguity (Pitfall 7)

### Phase 2: Pricing Calculation Engine

**Rationale:** The shared pricing function is the critical path -- both user and admin flows depend on it. Building it early and testing it in isolation ensures correctness before UI integration.
**Delivers:** `calculateSessionPrice()` in `lib/pricing/`, `getSessionPricePreviewAction()` for UI, unit tests with mocked Supabase client.
**Addresses:** Shared pricing function (FEATURES), pricing as pure calculation layer (ARCHITECTURE Pattern 1)
**Avoids:** Client-side price manipulation (Pitfall 1), timezone-incorrect day-of-week (Pitfall 5), surcharge percentage confusion (Pitfall 7)

### Phase 3: Signup + Profile Country Collection

**Rationale:** Can run in parallel with Phase 2. Country data collection is independent of pricing calculation. Modifies existing signup forms and OAuth completion flow.
**Delivers:** Country dropdown on `SignupForm.tsx` and `CompleteProfileForm.tsx`, `signUpAction` and `completeOAuthProfileAction` store country, existing user backfill or profile completion prompt.
**Addresses:** Country field on signup (FEATURES), country as user profile data (ARCHITECTURE Pattern 4)
**Avoids:** Country field mutability exploit (Pitfall 3), non-standard country codes (Pitfall 11), existing user NULL classification (Pitfall 12)

### Phase 4: Reservation Flow Integration

**Rationale:** Depends on Phases 1-3. This is where pricing calculation meets the booking flow. Both user-facing and admin walk-in flows must use the shared pricing function.
**Delivers:** Updated `createReservationAction` using `calculateSessionPrice()`, updated `adminCreateReservationAction` with local/tourist toggle (fixes `price_cents: 0` bug), price display in `CourtCard.tsx` before booking, Stripe metadata enrichment.
**Addresses:** Reservation action updates, walk-in designation, price display (FEATURES), reservation action integration (ARCHITECTURE)
**Avoids:** Walk-in `price_cents: 0` bug (Pitfall 4), Stripe amount mismatch (Pitfall 9), re-computing price at payment time (Anti-pattern 1)

### Phase 5: Admin Pricing Management

**Rationale:** Can begin in parallel with Phase 4. Independent admin page with server actions using `supabaseAdmin`. No dependency on reservation flow changes.
**Delivers:** Admin pricing page at `admin/pricing/`, day-of-week price grid editor, surcharge percentage editor, admin sidebar navigation link.
**Addresses:** Admin pricing CRUD, admin surcharge UI (FEATURES), admin controls pattern (ARCHITECTURE Pattern 3)
**Avoids:** RLS policy leak on pricing tables (Pitfall 10), optimistic locking issues (Pitfall 14), race condition with in-flight checkouts (Pitfall 2)

### Phase 6: Integration Testing + Polish

**Rationale:** End-to-end verification after all components are wired together. Covers edge cases identified in pitfalls research.
**Delivers:** E2E test coverage (local books Monday special at $5, tourist pays $6.25, walk-in tourist priced correctly, 11 PM timezone edge case, NULL country handling, surcharge percentage validation), i18n for all new strings, tourist price breakdown on checkout.
**Addresses:** Differentiator features (price breakdown, confirmation email price), "looks done but isn't" checklist (PITFALLS)
**Avoids:** All pitfalls verified through explicit test scenarios

### Phase Ordering Rationale

- **Schema first** because every other phase reads from or writes to the new tables/columns
- **Pricing engine before UI** because the calculation must be correct and tested before any flow uses it
- **Signup country collection parallel with pricing engine** because they are independent -- country is just data collection, pricing is just calculation
- **Reservation integration after pricing engine + country** because it needs both to function
- **Admin panel parallel with reservation integration** because admin writes to pricing tables while reservation flow reads from them -- no shared code path
- **Testing last** because it validates the complete system, including edge cases that only surface when all components interact

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Country Collection):** Needs decision on country field mutability strategy -- separate `user_classifications` table vs Postgres trigger vs application-level restriction. Each has tradeoffs.
- **Phase 4 (Reservation Integration):** Complex interaction between member-free logic, tourist surcharge, and walk-in flows. Needs careful code review of existing `createReservationAction` branching.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema):** Standard Postgres migration, well-documented Supabase patterns
- **Phase 2 (Pricing Engine):** Pure function with database reads, straightforward to test
- **Phase 5 (Admin UI):** Follows existing admin panel CRUD patterns in the codebase

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All technologies already installed and validated in v1.0. Primary source is the existing codebase itself. |
| Features | HIGH | Domain patterns well-established (resident/non-resident pricing is standard in recreation software). Existing codebase fully inspected for integration points. |
| Architecture | HIGH | Integrates into existing patterns (app_config, server actions, RLS, Stripe inline pricing). No architectural changes -- only additive components. |
| Pitfalls | HIGH | Based on direct codebase analysis of actual code paths. Stripe API behavior verified against documentation. Timezone issue is concrete and testable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Country field mutability strategy:** Research identified three options (separate table, Postgres trigger, application restriction) but did not make a final recommendation. Decision needed during Phase 3 planning. The separate `user_classifications` table is the most robust but adds a join to every pricing query.
- **Existing user backfill policy:** Business must decide: default all existing users to `country = 'DO'` (local), or prompt them to set country on next login. Research recommends defaulting to `DO` since existing users of a Dominican club are overwhelmingly local, but this is a business decision.
- **Member tourist surcharge policy:** Current behavior is members play free regardless. Research flags this as a business rule to confirm explicitly -- does the club want tourist members to pay a surcharge? If yes, the pricing function design changes.
- **`court_pricing` deprecation vs evolution:** STACK.md recommends a new `session_pricing` table while FEATURES.md suggests evolving `court_pricing`. Architecture resolved this with a fallback chain (session_pricing > court_pricing > default). The old table should be kept for rollback safety but code should prefer `session_pricing`.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `app/actions/reservations.ts`, `app/actions/sessionPayment.ts`, `app/actions/admin/reservations.ts`, `app/actions/auth.ts`, `supabase/migrations/0001-0007`, `lib/stripe/webhookHandlers.ts`
- Stripe Checkout Session API -- `price_data` for dynamic pricing (docs.stripe.com)
- ISO 3166-1 alpha-2 country codes standard

### Secondary (MEDIUM confidence)
- CourtReserve, Pitchbooking, SportsKey, Sportsman Cloud -- recreation software pricing patterns
- PostgreSQL advisory locks and explicit locking documentation
- Supabase RLS performance best practices

### Tertiary (LOW confidence)
- EU pricing discrimination regulations -- contextual only, not directly applicable in Dominican Republic

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
