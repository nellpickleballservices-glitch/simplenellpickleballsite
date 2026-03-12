---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-02-PLAN.md
last_updated: "2026-03-12T04:07:15.266Z"
last_activity: "2026-03-12 — Plan 04-02 complete (User management: search, paginated table, slide-out panel, disable/enable/reset)"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 18
  completed_plans: 18
  percent: 94
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Members can sign up, pay via Stripe, and immediately reserve pickleball courts
**Current focus:** Phase 4 — Admin and CMS

## Current Position

Phase: 4 of 5 (Admin and CMS)
Plan: 4 of 4 completed
Status: In Progress
Last activity: 2026-03-12 — Plan 04-02 complete (User management: search, paginated table, slide-out panel, disable/enable/reset)

Progress: [█████████░] 94%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 3 min
- Total execution time: 36 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/5 | 20 min | 5 min |
| 02-billing | 4/4 | 9 min | 2 min |
| 03-reservations | 5/5 | 10 min | 2 min |

**Recent Trend:**
- Last 5 plans: 10 min, 1 min, 3 min, 4 min, 1 min
- Trend: stable

*Updated after each plan completion*
| Phase 01-foundation P01 | 4 | 2 tasks | 14 files |
| Phase 01-foundation P03 | 7 | 3 tasks | 17 files |
| Phase 01-foundation P04 | 10 | 2 tasks | 16 files |
| Phase 02-billing P00 | 1 | 2 tasks | 5 files |
| Phase 02-billing P01 | 3 | 2 tasks | 9 files |
| Phase 02-billing P02 | 4 | 2 tasks | 3 files |
| Phase 02-billing P03 | 1 | 2 tasks | 7 files |
| Phase 03-reservations P01 | 3 | 2 tasks | 7 files |
| Phase 03-reservations P02 | 2 | 2 tasks | 6 files |
| Phase 03-reservations P03 | 2 | 2 tasks | 6 files |
| Phase 03-reservations P02 | 4 | 3 tasks | 10 files |
| Phase 03-reservations P05 | 3 | 2 tasks | 8 files |
| Phase 03-reservations P04 | 4 | 3 tasks | 10 files |
| Phase 04-admin-and-cms P01 | 3 | 2 tasks | 12 files |
| Phase 04-admin-and-cms P04 | 4 | 2 tasks | 9 files |
| Phase 04-admin-and-cms P02 | 6 | 2 tasks | 7 files |
| Phase 04-admin-and-cms P03 | 5 | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-phase]: Supabase Auth over NextAuth — native RLS integration
- [Pre-phase]: `proxy.ts` (not `middleware.ts`) — Next.js 16 rename, verify before Phase 1
- [Pre-phase]: Content blocks in DB over external CMS — no third-party CMS dependency
- [Pre-phase]: Snapshot names in reservations — prevents identity mismatch on profile update
- [Phase 01-foundation]: test.skip() used in Playwright e2e stubs (test.todo() not available in Playwright v1.58)
- [Phase 01-foundation]: testIgnore: ['**/unit/**'] added to playwright.config.ts to prevent Vitest/Playwright Symbol conflict
- [Phase 01-foundation]: package.json initialized with type: module (ESM) for Next.js 15+ App Router compatibility
- [Phase 01-foundation, 01-02]: SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix) — server-only enforcement via env var naming
- [Phase 01-foundation, 01-02]: app/auth/callback/route.ts placed outside [locale] — prevents locale prefix collision with Supabase OAuth redirect URL
- [Phase 01-foundation, 01-02]: auth.uid() wrapped in (SELECT auth.uid()) in all RLS policies — enables Postgres query planner caching
- [Phase 01-foundation, 01-02]: Unique policy names per table (e.g. "Service role full access on memberships") — avoids ambiguity in Supabase dashboard
- [Phase 01-foundation]: proxy.ts comments avoid literal 'getSession()' string — source-code grep test would false-positive on comments
- [Phase 01-foundation]: create-next-app unusable in non-empty directory — dependencies installed manually, identical outcome
- [Phase 01-foundation]: Server Action signature: (_prevState, formData) required for React 19 useActionState — forms using these actions must use useActionState hook
- [Phase 01-foundation]: normalizeName uses split/map instead of \b\w regex — regex treats accented char boundaries incorrectly (maría → MaríA vs María)
- [Phase 01-foundation]: WelcomeBanner triggered via ?welcome=1 redirect param from signUpAction — server reads param and profile, passes firstName to client banner component
- [Phase 01-foundation, 01-04]: noHardcodedStrings test checks for 'TODO: i18n' (not '// TODO: i18n') — JSX comment syntax {/* */} means the // prefix is absent in .tsx files
- [Phase 01-foundation, 01-04]: Server Components (page.tsx files) call useTranslations() directly without 'use client' — next-intl 4 supports both RSC and Client Component usage
- [Phase 01-foundation, 01-04]: Brand namespace extracted for 'NELL' and 'Pickleball Club' strings — reused across all auth pages avoiding duplication
- [Phase 02-billing]: test.skip() used consistently for billing stubs (test.todo() not available in Vitest)
- [Phase 02-billing]: Stripe API version 2026-02-25.clover (matches installed package types)
- [Phase 02-billing, 02-02]: current_period_end accessed via subscription.items.data[0] — moved from Subscription root to SubscriptionItem in Stripe clover API
- [Phase 02-billing, 02-02]: Invoice subscription ID via invoice.parent.subscription_details.subscription — restructured in Stripe clover API
- [Phase 02-billing, 02-02]: Webhook handlers throw on DB errors so route returns 500 and Stripe retries
- [Phase 02-billing, 02-03]: Court reservations open to ALL users (not just active members) — non-members pay per session via Stripe one-time payment or cash at location. Cash reservations marked "pending payment". proxy.ts membership gate does NOT apply to reservation routes.
- [Phase 03-reservations, 03-01]: onboarding@resend.dev used as FROM address during development (production will use nellpickleball.com domain)
- [Phase 03-reservations, 03-01]: Owner-only SELECT policy on reservations replaced with all-authenticated policy for availability display
- [Phase 03-reservations, 03-03]: Application-level pre-insert conflict check complements DB exclusion constraints for cross-mode blocking (full_court vs open_play)
- [Phase 03-reservations, 03-03]: Webhook route dispatches checkout.session.completed based on session.mode to separate subscription from one-time payment handling
- [Phase 03-reservations]: Server Action (getAvailabilityAction) for date tab re-fetch instead of searchParams or full page reload
- [Phase 03-reservations]: Abstract 2x2 quadrant layout for court diagram (over realistic doubles positions)
- [Phase 03-reservations, 03-05]: Current password verified via signInWithPassword before allowing password change
- [Phase 03-reservations, 03-05]: Edge Function uses 1-minute time window (10-11 min) matching cron frequency to avoid duplicate sends
- [Phase 03-reservations, 03-05]: Expired hold cleanup piggybacks on reminder function (no separate cron job)
- [Phase 03-reservations]: ReservationForm as composable component embedded in both CourtDiagram (open play) and TimeSlotGrid (full court) contexts
- [Phase 03-reservations]: Dashboard namespace created for i18n, keeping reservation management keys separate from Billing namespace
- [Phase 04-admin-and-cms]: Three-layer admin protection: proxy.ts (Layer 1), layout.tsx (Layer 2), requireAdmin() in Server Actions (Layer 3)
- [Phase 04-admin-and-cms]: Admin stats query profiles table for total users count (avoids auth.admin.listUsers pagination overhead)
- [Phase 04-admin-and-cms]: Tiptap useEditor with immediatelyRender: false for SSR compatibility
- [Phase 04-admin-and-cms]: Content blocks grouped by page prefix (home_, about_, learn_, faq_) on server side
- [Phase 04-admin-and-cms]: Stripe page uses direct external link (no embedded components, no Stripe Connect required)
- [Phase 04-admin-and-cms]: ISR revalidation via revalidatePath on CMS content save for Phase 5 public pages
- [Phase 04-admin-and-cms]: Two-pronged search: profiles table for name/phone + auth.admin.listUsers for email (Supabase lacks server-side email filter)
- [Phase 04-admin-and-cms]: enrichProfilesWithAuthAndMembership helper batches auth lookups to avoid N+1 queries per user
- [Phase 04-admin-and-cms, 04-03]: Guest reservations use admin's user_id with guest_name and created_by_admin=true (per research recommendation)
- [Phase 04-admin-and-cms, 04-03]: Maintenance cascade sends cancellation emails via Resend fire-and-forget (try/catch per user)
- [Phase 04-admin-and-cms, 04-03]: Location upsert on court creation reuses existing location by name or creates new one

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Verify `btree_gist` extension is available on the Supabase project tier before Phase 3 commits to `tstzrange` exclusion constraint; fallback is unique constraint on `(court_id, session_start_time)` with fixed session lengths
- [Research]: Confirm current Stripe API version in Dashboard before Phase 2 (`2025-01-27.acacia` recommended but should be verified)
- [Research]: Check `@supabase/ssr` package changelog for any breaking changes after Aug 2025 before starting Phase 1
- [User Action Required]: Run supabase/migrations/0001_initial_schema.sql in Supabase Dashboard SQL Editor before plan 01-03
- [User Action Required]: Run supabase/migrations/0002_webhook_events.sql in Supabase Dashboard SQL Editor before plans 02-01 through 02-03
- [User Action Required]: Run supabase/migrations/0003_reservations.sql in Supabase Dashboard SQL Editor before plans 03-02 through 03-05
- [User Action Required]: Set RESEND_API_KEY environment variable (obtain from resend.com dashboard)

## Session Continuity

Last session: 2026-03-12T04:05:38Z
Stopped at: Completed 04-03-PLAN.md
Resume file: None
