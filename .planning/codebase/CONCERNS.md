# Codebase Concerns

**Analysis Date:** 2026-03-14

## Tech Debt

**Admin action file is a monolith (902 lines):**
- Issue: `app/actions/admin.ts` bundles events, CMS, courts, reservations, and user management into a single 902-line file with 20+ exported functions.
- Files: `app/actions/admin.ts`
- Impact: Hard to navigate, test, and review. Any change risks merge conflicts across unrelated features.
- Fix approach: Split into domain-specific action files: `app/actions/admin/events.ts`, `app/actions/admin/courts.ts`, `app/actions/admin/users.ts`, `app/actions/admin/reservations.ts`, `app/actions/admin/cms.ts`. Extract shared `requireAdmin()` into `app/actions/admin/auth.ts`.

**Sequential N+1 queries in `reorderContentBlocksAction`:**
- Issue: Updates each content block one at a time in a loop instead of a batch operation.
- Files: `app/actions/admin.ts` (lines 249-255)
- Impact: For N blocks, makes N sequential Supabase round-trips. Slow and fragile if one update fails mid-loop (partial reorder with no rollback).
- Fix approach: Use a Postgres function or a single RPC call that accepts an array of `{id, sort_order}` pairs and updates atomically.

**Sequential N+1 queries in `searchUsersForReservationAction`:**
- Issue: After finding profiles, fetches each user's email individually via `getUserById` in a loop.
- Files: `app/actions/admin.ts` (lines 626-638)
- Impact: Linear latency growth with result count (up to 10 sequential auth API calls).
- Fix approach: Use `listUsers` with a batch approach or join with a view that exposes email.

**Stale git worktree:**
- Issue: A `.worktrees/admin-court-enhancements` directory exists with duplicated source files (1073-line admin.ts variant, modified reservation queries, new CourtEditPanel.tsx).
- Files: `.worktrees/admin-court-enhancements/`
- Impact: Confusing for developers; duplicated code may be mistaken for authoritative source. Inflates file counts in searches and wc analysis.
- Fix approach: If the branch is merged, remove with `git worktree remove admin-court-enhancements`. If active, document its purpose.

**Hardcoded timezone offset:**
- Issue: Admin stats use hardcoded `-04:00` offset for America/Santo_Domingo timezone instead of dynamically computing the offset.
- Files: `app/actions/admin.ts` (lines 46, 50)
- Impact: Dominican Republic does not observe daylight saving time, so `-04:00` is always correct. Low risk, but the pattern is brittle if copied to locales that do observe DST.
- Fix approach: Use a timezone library or compute offset dynamically if this pattern is reused elsewhere.

## Security Considerations

**SQL injection risk in Supabase `.ilike` and `.or` filters:**
- Risk: User-supplied search strings are interpolated directly into `.ilike` and `.or` filter strings without escaping special Postgres pattern characters (`%`, `_`, `\`).
- Files: `app/actions/admin.ts` (lines 621, 681)
- Current mitigation: These are admin-only functions (behind `requireAdmin()`), limiting exposure to trusted users. Supabase parameterizes the value, so full SQL injection is not possible -- but wildcard characters in user input could cause unexpected match behavior.
- Recommendations: Escape `%` and `_` in user input before building ilike patterns.

**All auth users fetched for email search (data exposure risk):**
- Risk: `searchUsersAction` calls `listUsers({ perPage: 1000 })` to get ALL auth users, then filters client-side. This loads all user emails and metadata into server memory.
- Files: `app/actions/admin.ts` (lines 685, 752)
- Current mitigation: Admin-only function behind `requireAdmin()`.
- Recommendations: When user count exceeds 1000, this silently misses users. Implement server-side email filtering or paginate through all pages.

**Non-null assertions on `process.env` values:**
- Risk: 12 instances of `process.env.VARIABLE!` (non-null assertion). If any env var is missing, the app crashes with an unhelpful runtime error instead of a clear startup message.
- Files: `lib/stripe/index.ts`, `lib/resend/index.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/client.ts`, `middleware.ts`, `app/api/stripe/webhook/route.ts`, `app/actions/billing.ts`
- Current mitigation: None.
- Recommendations: Add a startup validation script that checks all required env vars and fails fast with descriptive error messages. Or use a typed env schema (e.g., `zod` parsing of `process.env`).

**Non-null assertion on `user.email!`:**
- Risk: Two places assume `user.email` is always present, but Supabase users can exist without email (e.g., phone auth, SSO).
- Files: `app/actions/reservations.ts` (line 218), `app/actions/profile.ts` (line 74)
- Current mitigation: The app only supports email-based signup, so this is currently safe.
- Recommendations: Add a guard clause or use optional chaining with a fallback.

**Emails sent from Resend sandbox address:**
- Risk: All emails use `onboarding@resend.dev` (Resend's test/sandbox sender). In production, emails may be rejected or flagged as spam.
- Files: `lib/resend/emails.ts` (line 3), `app/actions/admin.ts` (lines 409, 891), `supabase/functions/session-reminder/index.ts` (line 92)
- Current mitigation: None -- this is a development placeholder.
- Recommendations: Register a custom domain with Resend and update the FROM_ADDRESS to a verified domain sender (e.g., `notifications@nellpickleball.com`).

## Performance Bottlenecks

**Full auth user list fetched on every admin search and page load:**
- Problem: `enrichProfilesWithAuthAndMembership` calls `listUsers({ perPage: 1000 })` on every invocation, including when paging through the user table with no search query.
- Files: `app/actions/admin.ts` (line 752)
- Cause: Supabase Admin API has no batch `getUsersByIds` endpoint, so the code fetches all users and filters in memory.
- Improvement path: Cache the auth user list briefly (e.g., 30s in-memory), or create a Postgres view/function that joins `auth.users` with `profiles` server-side, avoiding the Admin API entirely.

**Chat API rate limiter uses in-memory Map:**
- Problem: Rate limiting state lives in a `Map<string, SessionEntry>` in the API route handler. In a multi-instance or serverless deployment, each instance has its own map, making rate limiting ineffective.
- Files: `app/api/chat/route.ts` (lines 8-36)
- Cause: Serverless functions are stateless across invocations; the Map resets on cold starts.
- Improvement path: Move rate limiting to Redis, Supabase, or use Vercel's Edge Config/KV store. Alternatively, use Stripe-style idempotency via the `webhook_events` pattern already in use.

**Reservation availability query fetches all reservations for a date:**
- Problem: `getCourtAvailability` fetches ALL reservations for a date across ALL courts, then filters in JavaScript.
- Files: `lib/queries/reservations.ts` (lines 186-205)
- Cause: A single broad query is used even when `courtId` is specified.
- Improvement path: When `courtId` is provided, filter reservations by `court_id` in the query itself.

## Fragile Areas

**Stripe webhook handler swallows errors silently:**
- Files: `app/api/stripe/webhook/route.ts` (line 92)
- Why fragile: The outer `catch` block on line 92 returns 500 with no error details logged. If a handler fails, there is no trace of what went wrong.
- Safe modification: Add `console.error` logging inside the catch block before returning the 500 response.
- Test coverage: `tests/unit/webhookHandler.test.ts` exists but only tests the handlers in `lib/stripe/webhookHandlers.ts`, not the route dispatch logic.

**Reservation conflict check has a TOCTOU race:**
- Files: `app/actions/reservations.ts` (lines 147-172)
- Why fragile: The application-level conflict check (step 10) and the INSERT (step 11) are not atomic. Two concurrent requests could both pass the check and then one fails at the DB exclusion constraint. The code handles this gracefully (catches `23P01`), so it is correct but the pre-check is redundant complexity.
- Safe modification: Remove the application-level check and rely solely on the `no_double_booking` exclusion constraint in the database. This simplifies the code and eliminates the race window.
- Test coverage: No test covers concurrent booking scenarios.

**Middleware performs a database query on every request:**
- Files: `middleware.ts` (lines 64-78)
- Why fragile: For authenticated users accessing `/member/` routes, the middleware queries the `memberships` table. This adds latency to every request in these routes and creates a dependency on database availability for page loads.
- Safe modification: Consider caching membership status in a short-lived cookie or JWT claim to reduce per-request queries.
- Test coverage: `tests/unit/proxyMembership.test.ts` and `tests/unit/proxyUsesGetUser.test.ts` exist but are file-content tests, not integration tests.

**Confirmation email sends wrong time format:**
- Files: `app/actions/reservations.ts` (lines 213-214)
- Why fragile: `formattedDate` is set to the raw `date` form field, and `formattedTime` is built from raw `startTime` and `endTime` form values (which are ISO timestamps like `2026-03-14T07:00:00`). The email shows ISO strings rather than human-readable times.
- Safe modification: Format the date and time using `Intl.DateTimeFormat` with the user's locale before passing to the email function.
- Test coverage: No test covers email content formatting.

## Scaling Limits

**`listUsers({ perPage: 1000 })` hard cap:**
- Current capacity: 1000 users maximum visible in admin search and user enrichment.
- Limit: When user count exceeds 1000, email-based search silently misses users and `enrichProfilesWithAuthAndMembership` silently omits email/ban status for users not in the first 1000.
- Scaling path: Paginate through all auth users or (better) create a database view that joins `auth.users.email` into `profiles`, eliminating the Admin API dependency entirely.

**Chat rate limiter Map grows unbounded:**
- Current capacity: Entries are cleaned on each request, but between cleanups the Map can grow to match the number of unique session IDs.
- Limit: High-traffic or bot scenarios could create millions of entries before cleanup runs.
- Scaling path: Switch to a bounded LRU cache or external store.

## Dependencies at Risk

**Resend SDK at sandbox stage:**
- Risk: All emails use Resend's sandbox domain (`onboarding@resend.dev`). This limits to 100 emails/day and recipient restrictions.
- Impact: Production email delivery will fail or be severely limited.
- Migration plan: Verify a custom domain in Resend, update `FROM_ADDRESS` in `lib/resend/emails.ts` and inline email sends in `app/actions/admin.ts`.

**OpenAI dependency for chatbot without fallback:**
- Risk: If OpenAI API is down or rate-limited, the chatbot returns a generic error with no useful fallback.
- Impact: User-facing feature becomes entirely unavailable.
- Migration plan: Add a static FAQ fallback that serves pre-written answers when the AI is unavailable. The CMS content blocks already exist and could serve this purpose.

## Missing Critical Features

**No Stripe refund handling:**
- Problem: When an admin cancels a paid reservation (`adminCancelReservationAction`), the status is set to `cancelled` but no Stripe refund is issued.
- Files: `app/actions/admin.ts` (lines 512-524)
- Blocks: Proper financial reconciliation for cancelled paid bookings.

**No admin audit trail:**
- Problem: Admin actions (cancel reservation, disable user, maintenance mode) have no audit log. There is no record of which admin performed which action or when.
- Files: All admin actions in `app/actions/admin.ts`
- Blocks: Accountability and debugging of admin operations.

**No location assignment for Basic plan subscriptions:**
- Problem: When a user subscribes to the Basic plan via Stripe checkout, the `handleCheckoutCompleted` webhook handler does not set `location_id` on the membership. The `location_id` column exists but is never populated through the subscription flow.
- Files: `lib/stripe/webhookHandlers.ts` (lines 48-83), `supabase/migrations/0001_initial_schema.sql` (line 66)
- Blocks: Basic plan location restriction (`app/actions/reservations.ts` lines 99-109) can never trigger because `memberLocationId` is always null.

## Test Coverage Gaps

**No tests for server actions:**
- What's not tested: All 20+ functions in `app/actions/admin.ts`, `app/actions/reservations.ts`, and `app/actions/billing.ts` have zero test coverage.
- Files: `app/actions/admin.ts`, `app/actions/reservations.ts`, `app/actions/billing.ts`
- Risk: Business logic for reservations, payments, membership management, and admin operations can break silently.
- Priority: High

**No tests for webhook handler route dispatch:**
- What's not tested: The `POST` handler in `app/api/stripe/webhook/route.ts` (signature verification, idempotency guard, event dispatch) is untested. Only the individual handler functions in `lib/stripe/webhookHandlers.ts` have unit tests.
- Files: `app/api/stripe/webhook/route.ts`
- Risk: Webhook routing bugs (wrong handler called, incorrect HTTP status codes) would not be caught.
- Priority: Medium

**No integration or E2E tests for reservation flow:**
- What's not tested: The full reservation flow (select court, pick slot, submit, pay, confirm) has no E2E test. Playwright tests exist only for auth flows and i18n routing.
- Files: `tests/auth/*.spec.ts`, `tests/i18n/*.spec.ts`
- Risk: Reservation booking, the core business feature, can regress without detection.
- Priority: High

**No tests for chat API:**
- What's not tested: The chat endpoint rate limiting, CMS knowledge injection, OpenAI streaming, and error handling are entirely untested.
- Files: `app/api/chat/route.ts`
- Risk: Rate limiter bypass, prompt injection via CMS content, or streaming errors could go undetected.
- Priority: Medium

**No tests for edge function:**
- What's not tested: The Supabase Edge Function `session-reminder` (reminder emails, hold expiration) has no tests.
- Files: `supabase/functions/session-reminder/index.ts`
- Risk: Reminder emails could stop sending or hold cleanup could fail without notice.
- Priority: Medium

---

*Concerns audit: 2026-03-14*
