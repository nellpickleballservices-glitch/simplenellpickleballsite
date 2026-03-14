# Codebase Concerns

**Analysis Date:** 2026-03-13

## Tech Debt

**admin.ts is a 902-line monolith:**
- Issue: All admin server actions (events, CMS, courts, reservations, user management) live in a single file
- Files: `app/actions/admin.ts`
- Impact: Difficult to navigate, review, and test. High merge-conflict risk if multiple features touch admin logic simultaneously
- Fix approach: Split into domain-specific files: `app/actions/admin/events.ts`, `app/actions/admin/courts.ts`, `app/actions/admin/users.ts`, `app/actions/admin/reservations.ts`, `app/actions/admin/cms.ts`. Keep `requireAdmin()` in a shared `app/actions/admin/guard.ts`

**listUsers with hardcoded perPage: 1000:**
- Issue: `supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })` is called in two places to find user emails. This fetches ALL auth users into memory on every admin search/page load
- Files: `app/actions/admin.ts` (lines 685, 752)
- Impact: Breaks when user count exceeds 1000. Wastes memory and bandwidth. Called on every `enrichProfilesWithAuthAndMembership` invocation and every search query
- Fix approach: Store email on the `profiles` table (denormalized) and query it directly instead of round-tripping through auth admin API. Alternatively, paginate through auth users or use a Supabase database function

**Resend sandbox sender address hardcoded:**
- Issue: All emails use `onboarding@resend.dev` (Resend's sandbox address) across 4 locations. This address only delivers to verified emails in development
- Files: `lib/resend/emails.ts` (line 3), `app/actions/admin.ts` (lines 409, 891), `supabase/functions/session-reminder/index.ts` (line 92)
- Impact: Emails will not deliver to real users in production. Must configure a custom domain in Resend and update the FROM_ADDRESS
- Fix approach: Move sender address to an environment variable (e.g., `EMAIL_FROM_ADDRESS`) and configure it per environment

**Sequential database updates in reorderContentBlocksAction:**
- Issue: Updates each content block sort_order one at a time in a loop with no transaction wrapper
- Files: `app/actions/admin.ts` (lines 249-255)
- Impact: If one update fails mid-loop, sort_order becomes inconsistent. N database round-trips for N blocks
- Fix approach: Use a single Supabase RPC function or batch update via a Postgres function

**In-memory rate limiting for chat API:**
- Issue: Rate limiter uses a `Map` stored in process memory. State is lost on server restart and not shared across instances
- Files: `app/api/chat/route.ts` (lines 8-36)
- Impact: Rate limiting is ineffective in multi-instance deployments (e.g., Vercel serverless). A user can bypass limits by hitting different instances
- Fix approach: Use Redis, Upstash, or Supabase-backed rate limiting for persistent, shared state

**Hardcoded timezone `America/Santo_Domingo` and UTC offset `-04:00`:**
- Issue: Admin stats use a hardcoded timezone string and hardcoded `-04:00` offset
- Files: `app/actions/admin.ts` (lines 39-50)
- Impact: The Dominican Republic does not observe DST so this is technically correct, but hardcoding the offset is fragile and undocumented. If the club expands to other timezones, this breaks
- Fix approach: Extract timezone to `app_config` or an environment variable

## Known Bugs

**Confirmation email receives raw ISO strings instead of formatted date/time:**
- Symptoms: The `sendConfirmationEmail` call in `createReservationAction` passes `date` (from formData, format unknown) and `formattedTime` built from raw `startTime`/`endTime` form values which are ISO timestamps, not human-readable times
- Files: `app/actions/reservations.ts` (lines 213-215)
- Trigger: Any reservation booking by a member
- Workaround: Emails still send, but time format in the email body may be unreadable (full ISO string)

**Session reminder queries status `paid` but schema only has `confirmed`:**
- Symptoms: The edge function filters `.in('status', ['confirmed', 'paid'])` but the reservation status CHECK constraint only allows `confirmed`, `pending_payment`, `cancelled`, `expired`. There is no `paid` status
- Files: `supabase/functions/session-reminder/index.ts` (line 49), `supabase/migrations/0003_reservations.sql` (line 87)
- Trigger: This means the filter effectively only matches `confirmed` reservations. The `paid` clause is dead code
- Workaround: None needed functionally since `confirmed` is the correct post-payment status, but the dead filter branch is misleading

## Security Considerations

**SQL injection via ilike user search:**
- Risk: The admin user search constructs ilike patterns by interpolating the search query directly into the Supabase `.or()` filter string: `first_name.ilike.%${query}%`
- Files: `app/actions/admin.ts` (lines 621, 681)
- Current mitigation: `requireAdmin()` gate means only admin users can trigger this. Supabase client library parameterizes internally, so raw SQL injection is unlikely. However, special PostgREST characters (e.g., `.`, `(`, `)`) in the search term could cause unexpected filter behavior
- Recommendations: Sanitize the search query to strip PostgREST-special characters, or use a dedicated Postgres text search function via RPC

**Non-null assertions on environment variables:**
- Risk: Multiple `process.env.VAR!` non-null assertions will throw at runtime if env vars are missing, with unhelpful error messages
- Files: `lib/stripe/index.ts` (line 3), `lib/supabase/admin.ts` (lines 7-8), `middleware.ts` (lines 12-13), `app/api/stripe/webhook/route.ts` (line 30), `app/actions/billing.ts` (lines 17-18)
- Current mitigation: The chat API route (line 43) does check `OPENAI_API_KEY` before use -- this pattern should be applied everywhere
- Recommendations: Add startup validation (e.g., in `next.config.ts` or a shared `lib/env.ts`) that validates all required env vars exist and fails early with clear error messages

**Non-null assertion on user.email:**
- Risk: `user.email!` is used without null check in two places. Supabase auth users created via phone or SSO may not have an email
- Files: `app/actions/profile.ts` (line 74), `app/actions/reservations.ts` (line 218)
- Current mitigation: Current signup flow requires email, so this is safe for now
- Recommendations: Add explicit null check before using `user.email` and handle the no-email case gracefully

**All reservations are readable by all authenticated users:**
- Risk: RLS policy `All authenticated can read court reservations` (SELECT on reservations) exposes all reservation data (user names, booking times, guest names) to any logged-in user
- Files: `supabase/migrations/0003_reservations.sql` (lines 117-122)
- Current mitigation: Necessary for availability display. The app layer filters what is shown. Name snapshots are already on the reservation row
- Recommendations: Consider a Postgres VIEW that exposes only court_id/time/booking_mode/status for availability checks, keeping personal details restricted

**Webhook handler swallows errors silently:**
- Risk: The Stripe webhook route catches handler errors and returns 500, but logs nothing about which handler failed or why
- Files: `app/api/stripe/webhook/route.ts` (lines 92-94)
- Current mitigation: Stripe will retry on 500
- Recommendations: Add `console.error` with the error and event type before returning 500

## Performance Bottlenecks

**N+1 queries in searchUsersForReservationAction:**
- Problem: For each profile match, makes an individual `getUserById` call to fetch email
- Files: `app/actions/admin.ts` (lines 628-635)
- Cause: Up to 10 sequential auth admin API calls (one per matched profile)
- Improvement path: Store email on profiles table, or batch-fetch via `listUsers` and filter client-side

**enrichProfilesWithAuthAndMembership fetches all 1000 auth users:**
- Problem: Even when enriching just 20 profiles, fetches all auth users (`perPage: 1000`) to build a lookup map
- Files: `app/actions/admin.ts` (lines 752-755)
- Cause: Supabase auth admin API lacks a batch-get-by-ids endpoint
- Improvement path: Denormalize email onto profiles table. Query only needed user IDs via `getUserById` in parallel, or cache the auth user list with a short TTL

**Middleware runs membership DB query on every protected page load:**
- Problem: For authenticated users accessing `/member/` routes, middleware queries the `memberships` table on every request
- Files: `middleware.ts` (lines 64-78)
- Cause: Membership status is not cached in the JWT or session
- Improvement path: Store membership status in JWT custom claims (via Supabase auth hook) and check claims in middleware instead of querying DB. This eliminates a DB round-trip per page load

## Fragile Areas

**Reservation conflict detection (TOCTOU race):**
- Files: `app/actions/reservations.ts` (lines 146-172)
- Why fragile: Application-level conflict check runs before the INSERT. Between the SELECT (check) and INSERT (write), another request could book the same slot. The DB-level EXCLUDE constraint (`no_double_booking`) is the true safety net
- Safe modification: The EXCLUDE constraint in `0003_reservations.sql` (lines 101-111) protects against actual double-bookings. The app-level check is a UX optimization to show friendly errors. Always rely on the DB constraint as the source of truth; never remove it
- Test coverage: `tests/unit/rls-policies.test.ts` exists but does not test the exclusion constraint race condition

**Stripe webhook handler chain:**
- Files: `app/api/stripe/webhook/route.ts`, `lib/stripe/webhookHandlers.ts`
- Why fragile: Six event types are handled. If Stripe changes its API shape (e.g., the `parent.subscription_details` path for invoices, which was already adapted for API version `2026-02-25.clover`), handlers silently break
- Safe modification: Always test webhook handlers with Stripe CLI (`stripe trigger`) after any Stripe SDK upgrade. The `getSubscriptionIdFromInvoice` helper (lines 38-42) is particularly version-sensitive
- Test coverage: `tests/unit/webhookHandler.test.ts` exists -- verify it covers all 6 event types

**Locale detection via referer header sniffing:**
- Files: `app/actions/billing.ts` (lines 24-26, 68-70), `app/actions/sessionPayment.ts` (lines 57-59)
- Why fragile: Locale is determined by checking if `referer` header contains `/en/`. If the referer is missing (direct API call, redirect chain), locale defaults to `es`. Stripe redirect URLs will use wrong locale prefix
- Safe modification: Pass locale explicitly from the client via form data or query parameter instead of sniffing headers

## Scaling Limits

**Auth admin API pagination at 1000 users:**
- Current capacity: Works for up to 1000 registered users
- Limit: When user count exceeds 1000, `listUsers({ perPage: 1000 })` misses users beyond the first page. Admin user search and enrichment will return incomplete results
- Scaling path: Denormalize email onto `profiles` table. Add a Postgres trigger on auth.users inserts/updates to sync email to profiles

**In-memory chat rate limiter:**
- Current capacity: Works on a single server instance
- Limit: Serverless environments (Vercel) create new instances per request; each has its own empty Map. Rate limiting is effectively disabled
- Scaling path: Use Upstash Redis or a database-backed counter

## Dependencies at Risk

**Resend sandbox mode:**
- Risk: All production emails will fail to deliver to unverified addresses while using `onboarding@resend.dev`
- Impact: Confirmation emails, session reminders, password resets, and maintenance notifications will not reach users
- Migration plan: Register a custom domain in Resend, verify DNS, and update `FROM_ADDRESS` in `lib/resend/emails.ts` and all hardcoded occurrences

**OpenAI dependency for chatbot:**
- Risk: The chatbot hardcodes `gpt-4o-mini` model. OpenAI may deprecate this model
- Impact: Chat feature becomes unavailable
- Migration plan: Extract model name to environment variable or `app_config`. Consider adding a fallback model

## Missing Critical Features

**No Stripe refund flow:**
- Problem: When a paid reservation is cancelled (admin or user), the Stripe charge is not refunded
- Blocks: Fair cancellation policy for paying non-member users. Currently `adminCancelReservationAction` sets status to `cancelled` but does not issue a Stripe refund

**No email validation on signup:**
- Problem: Supabase `signUp` is called but there is no check for email confirmation before the user is redirected to `/?welcome=1`
- Blocks: Nothing prevents users from signing up with invalid emails. The profile is created immediately via admin client regardless of email confirmation status

**No admin audit logging:**
- Problem: Admin actions (ban user, cancel reservation, mark cash paid, create reservation) have no audit trail
- Blocks: No accountability for admin actions. Cannot investigate disputes about cancelled reservations or banned users

## Test Coverage Gaps

**No integration tests for server actions:**
- What's not tested: All files in `app/actions/` (auth, admin, billing, reservations, sessionPayment, profile) have zero test coverage for their actual Supabase interactions
- Files: `app/actions/auth.ts`, `app/actions/admin.ts`, `app/actions/reservations.ts`, `app/actions/billing.ts`, `app/actions/sessionPayment.ts`, `app/actions/profile.ts`
- Risk: Reservation booking logic (conflict detection, membership checks, advance booking windows) is complex and entirely untested
- Priority: High

**No tests for Stripe webhook idempotency:**
- What's not tested: The idempotency guard in `app/api/stripe/webhook/route.ts` (duplicate event detection via `webhook_events` table) is not tested
- Files: `app/api/stripe/webhook/route.ts`
- Risk: Duplicate webhook deliveries could create duplicate memberships or double-confirm reservations
- Priority: High

**No tests for middleware auth/membership gating:**
- What's not tested: The middleware logic that redirects unauthenticated users, non-admin users, and non-members is tested only via static analysis (`tests/unit/proxyUsesGetUser.test.ts`, `tests/unit/proxyMembership.test.ts`) not via actual request simulation
- Files: `middleware.ts`
- Risk: Middleware regressions could expose admin routes to non-admin users or member routes to non-members
- Priority: Medium

**No tests for chat API rate limiting or streaming:**
- What's not tested: Chat API rate limiter logic, SSE streaming output format, and CMS knowledge injection
- Files: `app/api/chat/route.ts`
- Risk: Rate limiter bugs could allow abuse or block legitimate users. Streaming format changes could break the chat UI
- Priority: Low

**E2E tests exist but no CI runner configured:**
- What's not tested: Playwright specs exist in `tests/auth/` and `tests/i18n/` but there is no CI pipeline (no `.github/workflows/`, no Vercel CI config)
- Files: `tests/auth/*.spec.ts`, `tests/i18n/*.spec.ts`
- Risk: Tests may be passing locally but are not enforced on every commit. Regressions can ship
- Priority: Medium

---

*Concerns audit: 2026-03-13*
