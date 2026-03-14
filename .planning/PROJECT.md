# NELL Pickleball Club Platform

## What This Is

A production-ready bilingual web platform for NELL Pickleball Club — a sports club introducing pickleball in the Dominican Republic, starting in Bávaro with plans for national expansion. The platform enables members to join via Stripe subscriptions, reserve courts with double-booking prevention, learn about pickleball, and connect with the community. Admins control all content, court management, events, and user oversight through a full-featured admin panel. An AI chatbot ("Nelly") provides bilingual support.

## Core Value

Members can sign up, pay their monthly subscription via Stripe, and immediately reserve pickleball courts — everything else supports this primary flow.

## Requirements

### Validated

- ✓ User signup with name validation, email, phone, password, plan selection — v1.0
- ✓ Email/password login with SSR session persistence — v1.0
- ✓ Password reset via email link — v1.0
- ✓ Admin role in app_metadata, cannot be self-assigned — v1.0
- ✓ Two membership tiers: VIP ($50/mo) and Basic ($35/mo) via Stripe subscriptions — v1.0
- ✓ Stripe webhook sync for all subscription lifecycle events with idempotency — v1.0
- ✓ Membership upgrade/downgrade with Stripe proration — v1.0
- ✓ Court reservation with time-slot grid and double-booking prevention (btree_gist) — v1.0
- ✓ Non-members can reserve via per-session Stripe payment or cash — v1.0
- ✓ Reservation cancellation within configurable window — v1.0
- ✓ Interactive court map with Leaflet markers (green/red/gray) — v1.0
- ✓ Confirmation email via Resend on reservation — v1.0
- ✓ Session reminder 10 min before end via Edge Function + pg_cron — v1.0
- ✓ Member dashboard: membership status, reservations, profile edit, password change — v1.0
- ✓ Admin panel: user/court/reservation/event management with three-layer protection — v1.0
- ✓ CMS: bilingual content blocks with Tiptap rich text editor, ISR revalidation — v1.0
- ✓ 5 public pages (Home, About, Learn, Events, Contact) — all CMS-driven — v1.0
- ✓ AI chatbot "Nelly": bilingual, prompt-stuffed with site content — v1.0
- ✓ Full i18n: Spanish/English via next-intl, all strings externalized — v1.0
- ✓ RLS on all tables, middleware auth protection, webhook signature verification — v1.0

### Active

(None — planning next milestone)

### Out of Scope

- SMS notifications (Twilio) — optional, deferred to reduce complexity
- Native mobile app — web-first, mobile later
- Real-time chat between members — not core to club value
- Video content hosting — defer to future milestone
- Multi-currency payments — USD only for v1
- pgvector RAG for chatbot — prompt-stuffing sufficient at current content volume

## Context

- **Location**: Bávaro, Dominican Republic (national expansion planned)
- **Founder**: María Nelly Mercedes Carrasco (CEO)
- **Contact**: (829)-655-4777 / nellpickleballclub@gmail.com
- **Audience**: Sports enthusiasts in the Dominican Republic, particularly those new to pickleball
- **Language**: Bilingual platform (Spanish primary, English supported)
- **Deployment**: Vercel (frontend), Supabase (backend), Stripe (payments)
- **Shipped**: v1.0 MVP on 2026-03-14 — 21,548 LOC TypeScript, 225 files, 126 commits
- **Tech stack**: Next.js 16 App Router, TypeScript, TailwindCSS v4, motion (Framer Motion v12), Supabase, Stripe, Resend, OpenAI, Leaflet, Tiptap, next-intl 4

## Constraints

- **Tech Stack**: Next.js App Router + TypeScript + TailwindCSS + motion — mandatory
- **Backend**: Supabase only (Postgres, Auth, Edge Functions, Storage, RLS)
- **Payments**: Stripe only — no alternative payment processors
- **Deployment**: Vercel — no other hosting
- **Email**: Resend for transactional messages
- **Maps**: Leaflet for court location display
- **AI**: OpenAI gpt-4o-mini for chatbot
- **Scalability**: Architecture supports multiple locations and courts across DR

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth over NextAuth | Native integration with Supabase RLS and database | ✓ Good — SSR cookies work seamlessly, RLS policies use auth.uid() |
| Stripe Subscriptions over one-time | Recurring membership model matches business needs | ✓ Good — webhook lifecycle covers all edge cases |
| App Router over Pages Router | Modern Next.js pattern, better for streaming/RSC | ✓ Good — Server Components + Server Actions reduce client JS |
| Content blocks in DB (not CMS) | Admin CMS via Supabase content_blocks table, no external CMS needed | ✓ Good — simple, no third-party dependency |
| Snapshot names in reservations | Prevents identity mismatch if users update profile | ✓ Good — clean audit trail |
| proxy.ts → middleware.ts | Next.js 16 renamed proxy.ts to middleware.ts | ✓ Good — aligned with framework conventions |
| btree_gist exclusion constraints | Database-level double-booking prevention | ✓ Good — impossible to bypass at application level |
| Per-session payments for non-members | Opens courts to walk-ins without membership requirement | ✓ Good — increases court utilization |
| Three-layer admin protection | Middleware + layout + handler verification | ✓ Good — defense in depth, no single point of failure |
| Prompt-stuffing over RAG | Content volume small enough for context window | ✓ Good — simpler architecture, sufficient for v1 content |
| motion v12 (not framer-motion) | Package renamed in v12 | ✓ Good — future-proof import paths |

## Tech Debt (from v1.0 audit)

- Duplicate `cancelledMessage` i18n key in Billing namespace
- Orphaned `sendReminderEmail` helper (Edge Function sends directly)
- `assignAdminRole()` exported but no UI caller (manual via dashboard)
- 22 test stubs (test.skip/test.todo) across unit tests
- ISR revalidatePath('/') only invalidates home page explicitly

---
*Last updated: 2026-03-14 after v1.0 milestone*
