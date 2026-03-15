# Roadmap: NELL Pickleball Club

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-14)
- 🚧 **v1.1 Local vs Tourist Pricing** — Phases 2-5 (in progress)

**Note:** Phase 1 was the performance fix phase (completed). v1.1 phases start at 2.

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-03-08
- [x] Phase 2: Billing (4/4 plans) — completed 2026-03-08
- [x] Phase 3: Reservations (5/5 plans) — completed 2026-03-08
- [x] Phase 4: Admin and CMS (4/4 plans) — completed 2026-03-12
- [x] Phase 5: Public Website and AI Chatbot (5/5 plans) — completed 2026-03-13

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ Post-v1.0 Performance Fixes (Phase 1) — COMPLETED 2026-03-14</summary>

- [x] Phase 1: Fix critical performance issues (4/4 plans) — completed 2026-03-14

</details>

### v1.1 Local vs Tourist Pricing

- [x] **Phase 2: Schema and Pricing Engine** - Database schema for pricing tables and shared price calculation function (completed 2026-03-14)
- [x] **Phase 3: Signup Country Collection** - Country field on signup to classify users as local or tourist (completed 2026-03-14)
- [ ] **Phase 4: Admin Pricing Panel** - Admin UI for day-of-week base prices and tourist surcharge percentage
- [x] **Phase 5: Reservation Flow Integration** - Wire pricing into user booking and admin walk-in flows (completed 2026-03-15)

## Phase Details

### Phase 2: Schema and Pricing Engine
**Goal**: A working pricing calculation function backed by the correct database schema, so all downstream flows have a single source of truth for session prices
**Depends on**: Phase 1 (performance fixes)
**Requirements**: PRIC-02, PRIC-04, PRIC-05
**Success Criteria** (what must be TRUE):
  1. A `session_pricing` table exists with rows for day-of-week base prices per court
  2. A `tourist_surcharge_pct` config value exists in `app_config`
  3. `profiles` table has a `country` column (ISO alpha-2) and `reservations` has an `is_tourist_price` boolean
  4. `calculateSessionPrice()` returns the correct price in cents given a court, date, and user classification -- using Dominican timezone for day-of-week extraction
  5. Days without specific pricing fall back to a default base price
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Signup Country Collection
**Goal**: Users provide their country during signup so the platform can classify them as local (Dominican) or tourist for pricing purposes
**Depends on**: Phase 2 (country column must exist)
**Requirements**: UCLS-01, UCLS-02, UCLS-03
**Success Criteria** (what must be TRUE):
  1. User sees a bilingual country dropdown during signup and can select their country
  2. Selected country is stored as an ISO 3166-1 alpha-2 code on the user's profile
  3. Users with country "DO" are treated as local; all others are treated as tourist
  4. Users cannot modify their own country field after signup (RLS or trigger enforcement)
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Database migration, country data file, and CountrySelect component
- [x] 03-02-PLAN.md — Wire country into signup, OAuth, and admin flows

### Phase 4: Admin Pricing Panel
**Goal**: Admins can configure all pricing parameters -- base session prices per day of week and the global tourist surcharge percentage -- through the admin panel
**Depends on**: Phase 2 (pricing schema must exist)
**Requirements**: PRIC-01, PRIC-03, ADMN-01, ADMN-02
**Success Criteria** (what must be TRUE):
  1. Admin can view and edit base session prices for each day of the week per court
  2. Admin can set and update the global tourist surcharge percentage
  3. Price changes take effect for new reservations immediately (no deploy needed)
  4. Admin pricing page is accessible from the admin sidebar navigation
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Database migration (session_pricing table, tourist surcharge seed) and pricing server actions
- [ ] 04-02-PLAN.md — Admin pricing UI page (day-of-week grid, surcharge editor) and sidebar link

### Phase 5: Reservation Flow Integration
**Goal**: Both user-facing reservations and admin walk-in reservations use the pricing engine to calculate and display correct prices based on local/tourist classification
**Depends on**: Phase 2 (pricing engine), Phase 3 (country data), Phase 4 (pricing config exists)
**Requirements**: RESV-01, RESV-02, RESV-03, RESV-04, ADMN-03
**Success Criteria** (what must be TRUE):
  1. User sees the correct calculated price (with tourist surcharge if applicable) before confirming a reservation
  2. Reservation stores the calculated price at booking time as an immutable snapshot
  3. Admin walk-in form includes a local/tourist toggle that affects the displayed and stored price
  4. Walk-in reservations use the calculated price instead of hardcoded $0 (bug fix)
  5. Tourist reservations are flagged with `is_tourist_price = true` for audit purposes
**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md — Pure pricing functions (calculateSessionPrice, isTourist) with TDD + default price migration
- [ ] 05-02-PLAN.md — Wire pricing engine into createReservationAction, adminCreateReservationAction, and queries
- [ ] 05-03-PLAN.md — CourtCard dynamic pricing display with day-of-week updates
- [ ] 05-04-PLAN.md — Admin walk-in local/tourist toggle, price preview, reservation list badges and filter

## Progress

**Execution Order:** Phase 2 -> Phase 3 (can parallel with Phase 4) -> Phase 4 -> Phase 5

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Performance Fixes | post-v1.0 | 4/4 | Complete | 2026-03-14 |
| 2. Schema and Pricing Engine | v1.1 | Complete    | 2026-03-14 | - |
| 3. Signup Country Collection | v1.1 | 2/2 | Complete | 2026-03-14 |
| 4. Admin Pricing Panel | v1.1 | 1/2 | In progress | - |
| 5. Reservation Flow Integration | 4/4 | Complete   | 2026-03-15 | - |
