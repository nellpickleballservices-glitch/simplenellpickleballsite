# Project Research Summary

**Project:** NELL Pickleball Club
**Domain:** Sports club membership + court reservation platform (pickleball)
**Researched:** 2026-03-07
**Confidence:** HIGH (stack verified against live Next.js 16 docs; architecture and pitfalls cross-validated across multiple official sources)

## Executive Summary

NELL Pickleball Club requires a full-stack SaaS platform combining membership billing, real-time court reservation, and public marketing — a well-understood domain with established patterns, but one with several integration points where mistakes compound quickly. The recommended approach is a Next.js 16 App Router monolith deployed on Vercel, backed by Supabase (Postgres + Auth + Edge Functions + Storage) and Stripe for subscription billing. This stack eliminates the need for a separate backend server while providing enterprise-grade auth, database-level security via Row Level Security, and a built-in cron/notification layer via Supabase Edge Functions. All three services have official first-party integration guides for this exact combination.

The core product loop is: sign up → pay via Stripe → book a court. Everything else (map, chatbot, events, CMS) is layered on top of this loop. The interactive court map with color-coded availability is the signature UX differentiator worth building in v1, as it defines the brand. The AI chatbot and session wrap-up reminder are high-value but should ship after the core reservation loop is stable. The feature research strongly recommends deferring SMS/WhatsApp API integration, native mobile apps, guest passes, and loyalty programs to v2+ — they introduce disproportionate complexity relative to launch value.

The top risks are well-understood and preventable at the schema design stage: double-booking race conditions (requires a Postgres unique or exclusion constraint, not application-level checks), Stripe webhook gaps (incomplete event handling leaves cancelled subscriptions appearing active), and Supabase auth cookie mismanagement (using the wrong client type or `getSession()` instead of `getUser()` silently breaks session persistence). All three risks must be addressed in the first two phases before any member-facing features are built.

---

## Key Findings

### Recommended Stack

Next.js 16 is the current stable release (16.1.6, docs updated 2026-02-27) with several breaking changes from v15 that must be respected: `middleware.ts` is now `proxy.ts`, `cookies()` and `headers()` are fully async and must be awaited, and Turbopack is the default bundler. TypeScript 5.1+ and React 19.2 are bundled requirements. Supabase is the only backend required — its native RLS, Auth v2 with PKCE, and Edge Functions replace what would otherwise need a separate API server. Stripe SDK 17.x handles billing with webhook-driven state sync to Supabase.

For supporting libraries: `@supabase/ssr` (not the deprecated `@supabase/auth-helpers-nextjs`) is mandatory for cookie-based auth in SSR. TailwindCSS v4 uses a CSS-first config with no `tailwind.config.js` needed. Leaflet + react-leaflet must be loaded via `next/dynamic` with `ssr: false`. Resend handles transactional email; the bilingual AI chatbot uses OpenAI `gpt-4o-mini` or Anthropic Claude via a streaming Route Handler. Zod validates all Server Action inputs.

**Core technologies:**
- **Next.js 16 (App Router):** Full-stack framework — RSC, Server Actions, Route Handlers cover auth, reservations, and admin flows without a separate backend
- **Supabase:** Auth + Postgres + Edge Functions + Storage — single backend service with RLS, PKCE auth, and scheduled Edge Functions for notifications
- **Stripe SDK 17.x:** Subscription billing — webhook-driven sync to Supabase keeps membership state accurate in real time
- **TailwindCSS v4:** Styling — CSS-first config, 3-5x faster builds than v3, default for new Next.js 16 projects
- **`@supabase/ssr` 0.5.x:** Auth cookie handling — mandatory replacement for the deprecated auth-helpers package
- **Leaflet + react-leaflet:** Interactive court map — must be client-side only via `next/dynamic`
- **Resend 4.x:** Transactional email — confirmation + reminder emails; Supabase Edge Function handles cron-triggered reminders
- **OpenAI / Anthropic SDK:** Bilingual AI chatbot — streaming Route Handler; `gpt-4o-mini` recommended for cost; Claude for better bilingual output
- **Zod 3.x:** Input validation — required for all Server Actions

### Expected Features

The feature landscape for a pickleball club platform is well-documented via platforms like CourtReserve, Skedda, and ClubSpark. NELL's differentiators over generic booking tools are the interactive court map, the bilingual AI chatbot, and the educational content hub — none of which competitors currently offer. The time-slot grid (not a calendar month view) is the correct UX pattern for court availability.

**Must have (table stakes) — v1 launch:**
- User authentication: signup, login, password reset (Supabase Auth)
- Stripe subscription checkout with VIP ($50/mo) and Basic ($35/mo) tiers
- Stripe webhook sync to Supabase (real-time membership gating)
- Court time-slot availability grid with date picker
- Self-service reservation booking + cancellation with enforced window
- Double-booking prevention via Postgres constraint (not application code)
- Reservation confirmation email (immediate, < 30 seconds)
- Member dashboard: upcoming reservations + membership status
- Interactive court map with color-coded availability markers (signature differentiator)
- Admin panel: user management, court management, reservation management
- Admin CMS: content blocks for all marketing page copy
- Public website: Home, About, Learn Pickleball, Events, Contact (5 pages)
- Bilingual support: Spanish primary, English secondary (next-intl infrastructure from day one)
- Row Level Security on all Supabase tables (non-negotiable)
- Mobile-responsive UI (375px minimum — most DR members book from phones)

**Should have (v1.x — add after core is validated):**
- Session wrap-up reminder: 10-minute-before-end email via Supabase pg_cron
- Events RSVP (v1 shows events; v1.x adds RSVP state)
- AI chatbot (bilingual; ship after Learn + Events content is populated for context)
- Admin Stripe payment dashboard view
- Profile self-editing (name, phone)

**Defer (v2+):**
- SMS / WhatsApp Business API notifications (Twilio overhead + API approval delays)
- Native mobile app (React Native overhead before user base exists; PWA covers v1)
- Guest pass / day-pass purchase flow (doubles auth complexity)
- DUPR rating integration (requires partnership agreement)
- Loyalty / rewards program (needs large member base to be meaningful)
- Multi-location map UI (architecture supports it via `location_id`, but single-location first)
- Waitlist management (complex state machine; courts won't hit capacity at launch)

### Architecture Approach

The system uses a single Next.js 16 App Router monolith with four route groups: `(marketing)` for public pages, `(auth)` for signup/login flows, `(member)` for authenticated member dashboard and reservations, and `(admin)` for club management. `proxy.ts` (renamed from `middleware.ts` in Next.js 16) handles auth session refresh and route protection on every request. Server Components fetch data directly from Supabase via the server client; Client Components handle interactive elements (map, forms, chatbot). Server Actions handle all mutations (booking, cancellation, profile updates). Stripe events flow through a dedicated webhook Route Handler that writes to Supabase using the service role key. Supabase Edge Functions handle time-based notifications via pg_cron.

**Major components:**
1. `(marketing)` route group — public pages served as RSC with ISR; content fetched from `content_blocks` table; no auth required
2. `(auth)` route group — signup, login, password reset, Stripe checkout redirect; Server Actions for mutations; Supabase PKCE flow
3. `(member)` route group — authenticated dashboard, court map (`next/dynamic` + `ssr: false`), reservation booking (Server Action with Postgres constraint check)
4. `(admin)` route group — user/court/reservation/CMS management; server-side admin role verification on every handler; service role client for writes
5. `proxy.ts` — runs on Edge runtime; calls `getUser()` (not `getSession()`) to refresh Supabase JWT and enforce route protection
6. `/api/stripe/webhook` Route Handler — receives all Stripe subscription lifecycle events; verifies signature with `request.text()` (not `request.json()`); upserts membership state to Supabase
7. Supabase Edge Function (`session-reminder`) — pg_cron every 1 minute; finds reservations ending in 9-11 minutes; sends Resend email; marks `reminder_sent = true`
8. `content_blocks` table — typed CMS with `block_type`, `content_es`, `content_en`, `sort_order` columns; served via ISR; edited in admin panel

**Key data flow: Signup → Active Member:**
User fills signup form → Server Action creates Supabase auth user + profile → Server Action creates Stripe Checkout Session with `client_reference_id = supabase_user_id` → browser redirects to Stripe → user pays → `checkout.session.completed` webhook fires → webhook handler upserts `memberships` row with `status: 'active'` → success page polls Supabase Realtime until membership is confirmed (never trust redirect query params)

**Database tables:** `auth.users` (Supabase-managed), `profiles`, `memberships`, `reservations` (with `reminder_sent`, `first_name_snapshot`, `user_email` snapshot columns), `courts` (with `latitude`, `longitude` for Leaflet), `events`, `content_blocks`

### Critical Pitfalls

1. **Supabase auth cookie handling with wrong client** — Using `createClient` from `@supabase/supabase-js` in Server Components instead of `createServerClient` from `@supabase/ssr` causes silent session loss. Users appear logged out on every SSR render. Prevention: create `lib/supabase/server.ts` and `lib/supabase/client.ts` with the correct clients before writing any auth-dependent code. Address in Phase 1.

2. **`getSession()` instead of `getUser()` for auth decisions** — `getSession()` reads the JWT from the cookie without re-validating against Supabase servers; it can be spoofed. All middleware and Route Handler authorization checks must use `getUser()`. This is documented explicitly in Supabase's official warning. Address in Phase 1.

3. **Court reservation double-booking race condition** — Two concurrent reservation requests both pass the application-level availability check and both insert. The fix is a Postgres unique constraint (fixed session lengths) or exclusion constraint using `tstzrange` (variable lengths). The unique constraint must be in the schema from day one — retrofitting requires deduplication of existing conflicts. Address in Phase 3.

4. **Stripe webhook event coverage gaps** — Handling only `checkout.session.completed` leaves cancelled or past-due subscriptions appearing active in Supabase. All subscription lifecycle events must be handled: `customer.subscription.created`, `updated`, `deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`. Stripe does not guarantee event order; always re-fetch authoritative state from Stripe inside the handler rather than trusting the event payload. Store `stripe_event_id` in a `webhook_events` table for idempotency. Address in Phase 2.

5. **Bilingual i18n infrastructure added late** — Extracting hardcoded strings from JSX after components are written touches every file and is expensive. The `next-intl` folder structure (`app/[locale]/page.tsx`) must be set up in Phase 1 scaffolding, before any UI components are written. Spanish must be the default locale — not browser-detected, because many DR users have English-language browsers. Address in Phase 1.

---

## Implications for Roadmap

Based on the combined research, the feature dependency graph, the architecture's suggested build order, and the pitfall-to-phase mapping, a 5-phase structure is recommended:

### Phase 1: Foundation — Auth, i18n, Database Schema, Security

**Rationale:** Every subsequent phase depends on a correct auth layer, working session management, and secure database schema with RLS. i18n infrastructure must exist before any UI text is written — it cannot be retrofitted cheaply. The pitfalls with the highest recovery cost (data exposure from wrong RLS, admin privilege escalation from `user_metadata` role storage, auth state loss from wrong Supabase client) all live here.

**Delivers:** Working signup + login + password reset flows; Supabase client setup (server + browser split); `proxy.ts` with `getUser()` auth guard; full database schema with RLS policies for all tables; `next-intl` with `[locale]` folder structure and `messages/es.json` + `messages/en.json`; admin role stored in `app_metadata` (not `user_metadata`)

**Addresses (from FEATURES.md):** User authentication (signup, login, password reset), mobile-responsive layout scaffolding, bilingual infrastructure

**Avoids (from PITFALLS.md):** Wrong Supabase client type (Pitfall 1), `getSession()` for auth decisions (Pitfall 2), admin role in `user_metadata` (Pitfall 7), RLS gaps on all operations (Pitfall 6), i18n added after UI is written (Pitfall 10)

**Research flag:** Standard patterns — skip phase research. Next.js 16 + Supabase auth is well-documented with official guides.

---

### Phase 2: Membership Billing — Stripe Integration + Webhook Sync

**Rationale:** No member can book a court without an active subscription. Stripe must be fully wired — including all webhook lifecycle events and idempotency — before the reservation system is built on top of it. The FEATURES.md dependency graph shows Stripe Subscription as a prerequisite for court reservation gating, member dashboard membership status, and VIP vs Basic tier enforcement.

**Delivers:** Stripe Checkout Session creation (Server Action); VIP and Basic price IDs; `/api/stripe/webhook` Route Handler with signature verification (`request.text()`, not `request.json()`); all 5+ subscription lifecycle events handled; `webhook_events` idempotency table; Supabase `memberships` table synced in real-time; post-checkout success page with Supabase Realtime polling (not redirect param trust); member membership status visible in dashboard stub

**Addresses (from FEATURES.md):** Stripe subscription checkout, Stripe webhook sync to Supabase, member dashboard membership status, VIP vs Basic tier enforcement

**Avoids (from PITFALLS.md):** Missing webhook event types (Pitfall 3), missing webhook signature verification (Pitfall 4), trusting redirect query params for membership status (Architecture anti-pattern 4), storing `stripe_customer_id` only in Stripe metadata (Technical debt table)

**Research flag:** Standard patterns — skip phase research. Stripe webhook patterns are well-documented; the key is completeness of event handling.

---

### Phase 3: Court Reservation System + Interactive Map + Notifications

**Rationale:** The core member value proposition. Depends on auth (Phase 1) and active membership gating (Phase 2). The interactive court map is the signature UX differentiator — it belongs in this phase, not deferred. The double-booking constraint must be in the schema from the start of this phase. Session reminder infrastructure (pg_cron + Edge Function) logically belongs here alongside the reservation system it depends on.

**Delivers:** Court time-slot availability grid (date picker → grid view per court); interactive Leaflet map with color-coded availability markers (`next/dynamic` + `ssr: false`); self-service reservation booking via Server Action with Postgres unique/exclusion constraint; reservation confirmation email via Resend (< 30 seconds); self-service cancellation with configurable window; member dashboard reservation list; Supabase Edge Function session-reminder with `reminder_sent` flag and 1-minute cron; `cron_runs` audit table

**Addresses (from FEATURES.md):** Court time-slot grid, self-service booking + cancellation, double-booking prevention, reservation confirmation email, pre-session reminder, member dashboard reservations, interactive court map, session wrap-up reminder

**Avoids (from PITFALLS.md):** Double-booking race condition (Pitfall 5), Leaflet SSR crash (Pitfall 8), session reminder timing unreliability (Pitfall 9)

**Research flag:** This phase warrants a focused research spike on the Postgres exclusion constraint pattern for overlapping time ranges (`btree_gist` extension). The PITFALLS.md documents this but implementation details around the `tstzrange` approach with Supabase may need validation.

---

### Phase 4: Admin Panel + CMS

**Rationale:** Club operators cannot manage the platform without admin tools. Depends on all tables from Phases 1-3. Admin role enforcement must be verified at three layers: `proxy.ts` redirect, Route Handler authorization check, and RLS policies. The CMS `content_blocks` schema must be designed correctly upfront (typed, bilingual, ordered) before the admin UI is built — retrofitting is expensive.

**Delivers:** Admin panel: user management (view, role promotion, membership override), court management (CRUD + GPS coordinates + maintenance blocking), reservation management (view all, cancel on behalf, bulk operations), events management (CRUD); CMS: `content_blocks` editor with `block_type`, `content_es`, `content_en`, `sort_order` columns; admin route protection verified at API layer (not just UI)

**Addresses (from FEATURES.md):** Admin panel (user/court/reservation management), admin CMS for content blocks, admin court blocking for maintenance, admin "create reservation for member" flow, soft-delete reservations (status = 'cancelled', not hard delete)

**Avoids (from PITFALLS.md):** Admin route protection only at middleware (Pitfall 7), content blocks schema becoming unmaintainable (Pitfall 11), content blocks XSS via unsanitized richtext (Security mistakes table)

**Research flag:** Standard patterns — skip phase research. Admin CRUD over existing data models is well-established. XSS sanitization pattern for richtext (DOMPurify or structured JSON) is documented.

---

### Phase 5: Public Website + AI Chatbot + Polish

**Rationale:** Public pages and the AI chatbot are the acquisition and brand layer. They depend on the `content_blocks` CMS from Phase 4 and the events + learn content being populated. The chatbot's usefulness is directly proportional to how much structured content exists — ship it after educational content is in the CMS, not before.

**Delivers:** Public website: Home, About, Learn Pickleball, Events, Contact (5 pages) using ISR + `content_blocks`; bilingual AI chatbot (streaming Route Handler via OpenAI gpt-4o-mini or Claude); chatbot system prompt fed by `content_blocks` content as RAG context; Framer Motion animations in Client Component wrappers; PWA configuration for mobile installability; WhatsApp contact link in footer

**Addresses (from FEATURES.md):** Public website (5 pages), educational pickleball content hub, events viewing, bilingual AI chatbot, admin CMS populated with all page content, mobile PWA behavior

**Avoids (from PITFALLS.md):** Framer Motion in Server Components (STACK.md anti-pattern), AI chatbot shipped before content exists (FEATURES.md dependency note), hardcoded contact info vs CMS-backed

**Research flag:** The AI chatbot streaming implementation is straightforward via OpenAI/Anthropic Route Handler — skip research. If RAG is implemented (feeding content blocks to the chatbot), this may warrant a spike on Supabase pgvector vs simple prompt injection of content blocks.

---

### Phase Ordering Rationale

- **Foundation before billing before reservation:** The FEATURES.md dependency graph makes this explicit — Stripe Subscription requires User Authentication; Court Reservation requires Active Subscription. Inverting this order means reworking gating logic.
- **Database schema and RLS in Phase 1 (not Phase 3+):** The pitfalls research shows that retrofitting RLS onto existing tables with data is the highest-cost mistake. All tables — including those not used until Phase 3/4 — should be defined and secured in Phase 1.
- **i18n in Phase 1:** `next-intl` requires the `app/[locale]/` folder structure. Creating this after pages are written means moving every page file. This is a 2-3 day regression for 100+ components.
- **Map in Phase 3 (not deferred):** FEATURES.md rates the interactive court map as P1 because it is the signature brand differentiator. Deferring it would ship a weaker product and make Phase 3 harder to design-review.
- **CMS schema in Phase 4 (not Phase 5):** Public pages in Phase 5 consume `content_blocks`. The schema must exist and be editable in Phase 4 so that when Phase 5 renders pages, real content exists.
- **Chatbot last:** FEATURES.md explicitly states: "Ship chatbot after educational content exists." The chatbot's usefulness scales with content — shipping it to an empty knowledge base creates a poor first impression.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Postgres exclusion constraint with `tstzrange` and `btree_gist` for overlapping reservation detection — PITFALLS.md documents the pattern but implementation details against Supabase's managed Postgres may vary. Validate extension availability before writing the migration.
- **Phase 5 (if RAG is chosen for chatbot):** Supabase pgvector setup for embedding `content_blocks` vs simpler prompt-stuffing approach. The decision affects Phase 4 schema design (adding embedding columns). Decide before Phase 4 finalizes.

Phases with standard patterns (skip research):
- **Phase 1:** Next.js 16 + Supabase SSR + `next-intl` are fully documented with official guides. The patterns are unambiguous.
- **Phase 2:** Stripe subscription + webhook with Next.js App Router is a first-party documented integration. Event handling completeness is a checklist item, not a research question.
- **Phase 4:** Admin CRUD panels follow established patterns. Content blocks CMS is internal Supabase, not an external service.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16, TailwindCSS v4, and proxy.ts rename verified directly from live docs fetched 2026-03-07. Supabase `@supabase/ssr` patterns cross-validated with Next.js official auth guide. Stripe SDK 17.x patterns from training data, not live docs. |
| Features | MEDIUM | NELL PROJECT.md is the primary source (HIGH confidence). Competitor feature lists (CourtReserve, Skedda, ClubSpark) from training data as of mid-2025 — not live-verified. Core reservation UX patterns are stable and well-established. |
| Architecture | HIGH | Next.js App Router project structure and route group patterns from verified official docs. Supabase RLS + Edge Function patterns from training data cross-validated with Next.js auth guide. Stripe webhook architecture is stable. |
| Pitfalls | HIGH | These are well-documented production failure modes with multiple independent sources. The `getSession()` vs `getUser()` warning is in Supabase's official reference docs. Double-booking race condition is a textbook concurrency problem with established Postgres solutions. |

**Overall confidence:** HIGH

### Gaps to Address

- **Supabase docs live access blocked during research:** Supabase documentation URLs were not directly fetchable during research. Patterns are drawn from training data (Aug 2025) and cross-validated with Next.js official guides. Any Supabase-specific breaking changes after Aug 2025 should be checked against the live Supabase changelog before starting Phase 1. Specifically: `@supabase/ssr` package API stability and Edge Function Deno runtime version.

- **Stripe API version pinning:** The research recommends `apiVersion: '2025-01-27.acacia'`. This should be verified against the Stripe Dashboard's current recommended API version before coding begins. Stripe releases new API versions periodically.

- **`btree_gist` extension on Supabase Postgres:** The exclusion constraint for overlapping time ranges requires `CREATE EXTENSION btree_gist`. Verify this extension is available and enabled on the Supabase project tier before committing to the `tstzrange` approach in Phase 3. If unavailable, fall back to the simpler unique constraint on `(court_id, session_start_time)` with fixed session durations.

- **AI chatbot approach (RAG vs prompt-stuffing):** FEATURES.md notes the chatbot is enhanced by site content but does not specify the implementation approach. Decide before Phase 4 finalizes schema: (a) simple approach — inject relevant `content_blocks` text into the system prompt at query time; (b) RAG approach — embed content blocks via Supabase pgvector and retrieve semantically similar chunks. Option (a) is sufficient for v1 given the small content volume.

- **Competitor live feature verification:** CourtReserve and Skedda feature comparisons are from training data. Their current feature sets may have evolved. This affects positioning decisions but not architecture decisions.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16 official docs: nextjs.org/blog/next-16, nextjs.org/docs/app/guides/upgrading/version-16 — fetched 2026-03-07 — breaking changes (proxy.ts, async cookies, Turbopack default)
- Next.js 16 Authentication guide: nextjs.org/docs/app/guides/authentication — fetched 2026-03-07 — Supabase SSR patterns, Zod validation
- Next.js 16 CSS/Tailwind guide: nextjs.org/docs/app/getting-started/css — fetched 2026-03-07 — TailwindCSS v4 setup
- Next.js 16 Lazy Loading guide: nextjs.org/docs/app/guides/lazy-loading — fetched 2026-03-07 — `next/dynamic` + `ssr: false` for Leaflet
- TailwindCSS v4.0 blog: tailwindcss.com/blog/tailwindcss-v4 — fetched 2026-03-07 — CSS-first config, PostCSS setup
- NELL Pickleball Club PROJECT.md — primary product requirements (HIGH confidence)
- Supabase official warning on `getSession()` vs `getUser()`: supabase.com/docs/reference/javascript/auth-getsession — explicitly states do not use `getSession()` for server-side auth

### Secondary (MEDIUM confidence)
- Supabase SSR package (`@supabase/ssr`) patterns — training data cross-validated with Next.js auth guide; Supabase docs URL was not directly fetchable during research
- Stripe webhook best practices (idempotency, signature verification, event ordering) — training data through Aug 2025
- Supabase Edge Functions + Deno + pg_cron scheduling — training data; Deno runtime constraint confirmed
- CourtReserve, Skedda, ClubSpark, Mindbody feature landscape — training data through mid-2025; not live-verified
- General court reservation UX patterns (time-slot grid, cancellation windows, notification timing) — training data from established booking platforms

### Tertiary (LOW confidence — needs validation during planning)
- `btree_gist` extension availability on Supabase Postgres managed tiers — assumed available based on Supabase's PostgreSQL version support; should be confirmed
- Stripe API version `2025-01-27.acacia` as current stable — should be verified against Stripe Dashboard before implementation

---

*Research completed: 2026-03-07*
*Ready for roadmap: yes*
