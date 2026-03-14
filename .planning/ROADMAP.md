# Roadmap: NELL Pickleball Club

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-14)

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

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-03-08 |
| 2. Billing | v1.0 | 4/4 | Complete | 2026-03-08 |
| 3. Reservations | v1.0 | 5/5 | Complete | 2026-03-08 |
| 4. Admin and CMS | v1.0 | 4/4 | Complete | 2026-03-12 |
| 5. Public Website and AI Chatbot | v1.0 | 5/5 | Complete | 2026-03-13 |

### Phase 1: Fix critical performance issues

**Goal:** Resolve performance bottlenecks: middleware DB queries on every request, N+1 admin queries, serverless-incompatible rate limiting, reservation over-fetching, and split the 902-line admin.ts monolith
**Requirements**: TBD
**Depends on:** Phase 0
**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Database migration (view, RPC, rate limit table, index) + cookie signing utility
- [ ] 01-02-PLAN.md — Middleware route-scoped auth and membership cookie caching
- [ ] 01-03-PLAN.md — Admin file split and query rewrite to use Postgres view
- [ ] 01-04-PLAN.md — Chat rate limiter DB migration and reservation query scoping
