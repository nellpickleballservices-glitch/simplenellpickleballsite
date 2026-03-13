# Roadmap: NELL Pickleball Club

## Overview

Five phases that build on each other in strict dependency order. Phase 1 lays the foundation every subsequent phase depends on — auth, i18n, database schema, and security must be correct before any member-facing feature is built. Phase 2 wires Stripe billing so membership gating is real before reservations are built on top of it. Phase 3 delivers the core member value loop: reserve a court, see it on a map, get notified. Phase 4 gives admins the tools to operate the club and populate content. Phase 5 publishes the public website that acquires new members and adds the bilingual AI chatbot as the support layer.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Auth, i18n, database schema, security — everything every other phase depends on (completed 2026-03-08)
- [x] **Phase 2: Billing** - Stripe subscriptions wired end-to-end with webhook sync before any reservation gating (completed 2026-03-08)
- [x] **Phase 3: Reservations** - Core member value loop: court booking, interactive map, notifications, dashboard (completed 2026-03-08)
- [x] **Phase 4: Admin and CMS** - Club operator tools and content management for all platform content (completed 2026-03-12)
- [ ] **Phase 5: Public Website and AI Chatbot** - Member acquisition layer and bilingual AI support

## Phase Details

### Phase 1: Foundation
**Goal**: Every developer-facing and security-critical concern is resolved before any member-facing feature is built — auth works correctly with SSR, i18n structure is in place, all database tables exist with RLS, and admin role assignment is secure.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, I18N-01, I18N-02, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. A new user can sign up with first name, last name, email, phone, and password — names are normalized (jose urizar becomes Jose Urizar), session persists after browser refresh without re-login
  2. A logged-in user can request a password reset, receive an email link, and set a new password
  3. An admin cannot be created by self-assigning a role — admin role lives in `app_metadata` and requires privileged assignment
  4. Every page renders correctly in both Spanish and English via locale URL segment (`/es/` and `/en/`) with no hardcoded UI strings
  5. All Supabase tables (`profiles`, `memberships`, `reservations`, `courts`, `locations`, `events`, `content_blocks`) exist with Row Level Security enabled and members can only read/write their own rows
**Plans**: 5 plans

Plans:
- [ ] 01-00-PLAN.md — Test framework install + all Wave 0 test stubs (Nyquist gate)
- [ ] 01-01-PLAN.md — Next.js 16 scaffold, TailwindCSS v4, route groups, proxy.ts with getUser()
- [ ] 01-02-PLAN.md — Supabase client split, full DB schema migration, RLS, admin role utility
- [ ] 01-03-PLAN.md — Auth flows: signup, login, logout, password reset, Google OAuth
- [ ] 01-04-PLAN.md — next-intl i18n routing, message files, string externalization, LanguageSwitcher

### Phase 2: Billing
**Goal**: A user who signs up can pay for a membership via Stripe, and that membership status is immediately reflected in Supabase — including all lifecycle events (cancellation, payment failure) — so court reservation gating is trustworthy.
**Depends on**: Phase 1
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, BILL-07, BILL-08, BILL-09
**Success Criteria** (what must be TRUE):
  1. A user who completes Stripe Checkout sees their membership status as active in Supabase within seconds, without trusting the redirect URL — the post-checkout page polls Supabase Realtime
  2. A cancelled or payment-failed subscription causes the membership status in Supabase to update to inactive, and that member can no longer access court reservation routes
  3. A member can upgrade from Basic to VIP or downgrade from VIP to Basic — Stripe handles proration and the Supabase `memberships` row reflects the new plan
  4. All Stripe webhook events are processed exactly once — duplicate events are rejected via `stripe_event_id` idempotency check
**Plans**: 4 plans

Plans:
- [ ] 02-00-PLAN.md — Wave 0 Nyquist gate: test stubs + migration 0002 (webhook_events table, UNIQUE(user_id) on memberships, supabase_realtime publication)
- [ ] 02-01-PLAN.md — Stripe singleton, billing Server Actions (checkout + portal), pricing page with context-aware CTAs, Billing i18n namespace, Navbar pricing link
- [ ] 02-02-PLAN.md — Webhook Route Handler at /api/stripe/webhook: raw body signature verification, idempotency guard, five event handler functions
- [ ] 02-03-PLAN.md — Post-checkout Realtime page (pending/active/timeout state machine), dashboard membership card, proxy.ts real membership gate, human verification checkpoint

### Phase 3: Reservations
**Goal**: Any logged-in user can view court availability on court cards with Google Maps thumbnails, reserve a time slot (members free, non-members pay per session) with double-booking impossible at the database level, receive an immediate confirmation email, and get a reminder before their session ends.
**Depends on**: Phase 2
**Requirements**: RESV-01, RESV-02, RESV-03, RESV-04, RESV-05, RESV-06, RESV-07, RESV-08, RESV-09, MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. A logged-in user opens the reservation page and sees 3 court cards with Google Maps thumbnails, time slot grids showing availability, and a court diagram modal with 4-quadrant spots color-coded green (available) or red (taken)
  2. A user reserves a time slot and receives a confirmation email within 30 seconds — two users attempting to book the same slot simultaneously results in one booking and one clear error, never a double-booking
  3. A user who cancels within the allowed window sees their reservation removed; a user who tries to cancel outside the window sees an informative error
  4. Ten minutes before a session ends, the user receives an email reminder: "Your pickleball session ends in 10 minutes. Please prepare to exit the court so the next group can begin." — the reminder fires exactly once per reservation
  5. A logged-in user can view their upcoming reservations, current membership status, update their name and phone, and change their password — all from the dashboard
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — Migration 0003 (btree_gist, court_config, app_config, court_pricing, reservation columns, exclusion constraints, seed data), TypeScript types, Resend integration, proxy.ts reservation exception
- [ ] 03-02-PLAN.md — Court cards page with Google Maps thumbnails, time slot grid with tab strip date selector, court diagram modal with 4-quadrant spot availability, availability query functions
- [ ] 03-03-PLAN.md — Reservation Server Actions (create with double-booking protection + cancel with window enforcement), Stripe per-session payment action, webhook handler for one-time payments, confirmation email
- [ ] 03-04-PLAN.md — Reservation form wiring to court diagram, payment panel for non-members, dashboard reservations table with cancellation dialog
- [ ] 03-05-PLAN.md — Dashboard settings page (profile edit + password change), session reminder Edge Function with pg_cron, bilingual reminder emails via Resend

### Phase 4: Admin and CMS
**Goal**: A club admin can manage every operational aspect of the club — users, courts, reservations, events — and edit all platform content through a CMS, with every admin action protected at middleware, layout, and API handler level.
**Depends on**: Phase 3
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10, ADMIN-11, CMS-01, CMS-02, CMS-03
**Success Criteria** (what must be TRUE):
  1. An admin can search for any user by name, email, or phone; view their membership status and reservation history; disable their account; and trigger a password reset — all from a single user management screen
  2. An admin can add a court location with GPS coordinates, block a court for maintenance, create a reservation on behalf of any active member, and cancel any reservation
  3. An admin can create, edit, and delete events (tournaments, training, social) that immediately appear on the Events page
  4. An admin can edit any content block (Home, About, Learn Pickleball, FAQ) in both Spanish and English via a rich text editor — public pages reflect changes on next render
  5. A non-admin user who attempts to access any `/admin/*` route or admin API endpoint is rejected at three layers: proxy middleware, layout check, and handler-level role verification
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Admin foundation: migration 0005 (events columns, maintenance columns, content_blocks seed data), three-layer route protection (proxy + layout + requireAdmin), admin layout with sidebar, dashboard stat cards, shared components
- [ ] 04-02-PLAN.md — User management: search by name/email/phone, paginated table, slide-out detail panel with membership and reservation history, disable/enable accounts, trigger password reset
- [ ] 04-03-PLAN.md — Court and reservation management: add court locations with GPS, maintenance blocking with cascade cancellation, filterable reservation table, admin cancel, create on behalf of user or guest, mark cash paid
- [ ] 04-04-PLAN.md — Events CRUD (tournaments/training/social with bilingual fields), CMS content editor with Tiptap rich text, bilingual tab switching, inline preview, block reordering, ISR revalidation, Stripe Dashboard link

### Phase 5: Public Website and AI Chatbot
**Goal**: Prospective members land on a bilingual public website that explains the club, shows events, and converts visitors to signups — and an AI chatbot answers questions in the visitor's language using site content as its knowledge base.
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. A visitor can navigate five public pages (Home, About, Learn Pickleball, Events, Contact) in both Spanish and English — all copy comes from the CMS with no hardcoded marketing text
  2. The Home page hero, About page values, and Learn Pickleball content all reflect whatever text the admin has set in the CMS — an admin edit appears on the next page render without a code deploy
  3. The Events page shows current tournaments, training sessions, and social events pulled from the database — no events are hardcoded
  4. A visitor types a question in Spanish and receives a Spanish response; a visitor types in English and receives an English response — the chatbot uses club content (pickleball rules, membership options, reservation process, locations) as its knowledge base
  5. The Contact page shows a working contact form, WhatsApp link, and social handles
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Shared infrastructure: install motion + openai, migration 0006 (footer_social_links), content helper, motion wrappers (MotionProvider, ScrollReveal, StaggerChildren, HeroEntrance), Footer, WhatsApp bubble, MobileNav hamburger, Navbar public page links
- [ ] 05-02-PLAN.md — Public pages: marketing layout, Home page CMS rewire, About (values timeline), Learn Pickleball (sticky TOC + SVG court diagram), Events (card grid with type badges), Contact (WhatsApp CTA), bilingual SEO metadata
- [ ] 05-03-PLAN.md — AI chatbot "Nelly": streaming Route Handler (OpenAI gpt-4o-mini, prompt-stuffing with content_blocks), floating chat widget (bubble + panel), quick-reply chips, typing indicator, session rate limiting, bilingual auto-detection

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete    | 2026-03-08 |
| 2. Billing | 4/4 | Complete   | 2026-03-08 |
| 3. Reservations | 5/5 | Complete   | 2026-03-08 |
| 4. Admin and CMS | 4/4 | Complete   | 2026-03-12 |
| 5. Public Website and AI Chatbot | 0/3 | Not started | - |
