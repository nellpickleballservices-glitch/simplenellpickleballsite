# Codebase Concerns

**Analysis Date:** 2026-03-14

## Tech Debt

**Reservation conflict check is a TOCTOU race condition:**
- Issue: `createReservationAction` in `app/actions/reservations.ts` performs an application-level conflict check (lines 147-172) before inserting. Between the check and the insert, another request can claim the same slot. The DB exclusion constraint (`no_double_booking`) catches this, but the error path relies on matching Postgres error code `23P01`. The app-level check is redundant complexity.
- Files: `app/actions/reservations.ts`
- Impact: The dual-check approach works but adds ~50 lines of logic that duplicate what the DB constraint already enforces. If constraint behavior changes or a new booking mode is added, both layers must be updated.
- Fix approach: Remove the application-level conflict check (steps 10). Rely solely on the DB exclusion constraint and handle `23P01` on insert. Simplifies code and eliminates the race window.

**Hardcoded prices as fallbacks:**
- Issue: `app/actions/reservations.ts` line 142 uses `?? 1000` as a default price when `court_pricing` lookup fails. This silently charges $10 instead of failing explicitly.
- Files: `app/actions/reservations.ts`
- Impact: If a court has no pricing configured, non-members get charged a default price without any admin visibility that pricing is missing.
- Fix approach: Return an error like `'pricing_not_configured'` instead of falling back to a hardcoded value.

**FormData casting without null checks:**
- Issue: All server actions cast `formData.get()` with `as string` without verifying the value is non-null. If a field is missing from the form, this results in `null` being treated as a string.
- Files: `app/actions/auth.ts`, `app/actions/reservations.ts`, `app/actions/profile.ts`, `app/actions/admin/courts.ts`, `app/actions/admin/events.ts`, `app/actions/admin/reservations.ts`
- Impact: Could cause subtle bugs if form structure changes. Validation catches some cases (e.g., `validateName`) but not all fields are validated before use.
- Fix approach: Add explicit null checks or use a form validation library (e.g., Zod) to parse and validate all FormData fields at the top of each action.

**Chat session ID is client-generated and unauthenticated:**
- Issue: The chatbot rate limiter in `lib/chat/rate-limit.ts` uses a `sessionId` generated client-side via `crypto.randomUUID()` in `components/chatbot/ChatPanel.tsx`. A user can bypass rate limiting by generating new session IDs (refreshing the page or manipulating the request).
- Files: `lib/chat/rate-limit.ts`, `components/chatbot/ChatPanel.tsx`, `app/api/chat/route.ts`
- Impact: Rate limiting is trivially bypassable, allowing OpenAI API abuse and cost escalation.
- Fix approach: Use IP-based rate limiting (via request headers or middleware) or require authentication for the chat endpoint. At minimum, combine session ID with IP fingerprint.

**Email sender uses Resend sandbox address:**
- Issue: All emails are sent from `onboarding@resend.dev` (a Resend sandbox/test domain) in both `lib/resend/emails.ts` line 3 and `app/actions/admin/users.ts` line 188. This will cause deliverability issues in production.
- Files: `lib/resend/emails.ts`, `app/actions/admin/users.ts`, `supabase/functions/session-reminder/index.ts`
- Impact: Emails may land in spam or fail delivery entirely once the app moves beyond Resend's free tier test limits.
- Fix approach: Configure a custom domain in Resend and update the `FROM_ADDRESS` constant. Consider moving the from address to an environment variable.

**Membership cookie secret crash on missing env var:**
- Issue: `lib/middleware/cookie-signing.ts` line 4 uses `process.env.MEMBERSHIP_COOKIE_SECRET!` at module scope. If this env var is missing, the middleware crashes on every request that reaches the membership check path.
- Files: `lib/middleware/cookie-signing.ts`
- Impact: Entire member section becomes inaccessible. No graceful fallback.
- Fix approach: Add a startup check or fallback to skip cookie caching if the secret is not configured.

**Maintenance cancellation emails are English-only:**
- Issue: `app/actions/admin/courts.ts` lines 151-156 send a hardcoded English-only cancellation email when a court enters maintenance. The rest of the app supports bilingual (es/en) communication.
- Files: `app/actions/admin/courts.ts`
- Impact: Spanish-speaking users receive English-only notifications for maintenance cancellations.
- Fix approach: Look up user's `locale_pref` from `profiles` table and use bilingual email templates consistent with `lib/resend/emails.ts`.

## Known Bugs

**Confirmation email receives raw ISO timestamps:**
- Symptoms: The confirmation email in `createReservationAction` passes raw `startTime` and `endTime` (ISO 8601 strings from FormData) to `sendConfirmationEmail`, but labels the parameter `time` and formats it as `${startTime} - ${endTime}`. The user receives something like `2026-03-15T10:00:00 - 2026-03-15T11:00:00` instead of `10:00 AM - 11:00 AM`.
- Files: `app/actions/reservations.ts` lines 214-215
- Trigger: Any successful reservation booking.
- Workaround: None currently.

**Session-reminder filters on non-existent status 'paid':**
- Symptoms: The edge function at `supabase/functions/session-reminder/index.ts` line 49 filters `.in('status', ['confirmed', 'paid'])` but the valid reservation statuses defined in the DB constraint are only `confirmed`, `pending_payment`, `cancelled`, `expired`. There is no `paid` status.
- Files: `supabase/functions/session-reminder/index.ts`
- Trigger: Paid reservations that have `status: 'confirmed'` (set by webhook handler) will still be found by the `confirmed` filter, so the bug is masked. But the intent is wrong.
- Workaround: The `confirmed` status covers the intended case, so reminders still work.

## Security Considerations

**CMS content rendered via dangerouslySetInnerHTML without sanitization:**
- Risk: Admin-authored CMS content from `content_blocks` is rendered with `dangerouslySetInnerHTML` on public pages. If an admin account is compromised, or if the CMS editor allows script injection, XSS attacks could affect all visitors.
- Files: `app/[locale]/page.tsx` lines 137, 159; `app/[locale]/(marketing)/about/page.tsx` lines 158, 175; `app/[locale]/(marketing)/learn-pickleball/page.tsx` line 113; `app/[locale]/(admin)/admin/cms/ContentPreview.tsx` line 17
- Current mitigation: Only admins can edit content blocks, and the TipTap editor may limit what HTML is generated. However, no server-side sanitization exists.
- Recommendations: Add DOMPurify or a similar HTML sanitizer before rendering CMS content. Sanitize on write (in `updateContentBlockAction`) or on read (in `getContentBlocks`).

**Non-constant-time signature comparison in cookie verification:**
- Risk: `lib/middleware/cookie-signing.ts` line 33 compares HMAC signatures with `===` (string equality). This is vulnerable to timing attacks that could allow forging membership cache cookies.
- Files: `lib/middleware/cookie-signing.ts`
- Current mitigation: The 5-minute TTL limits the attack window, and the cookie only caches membership status (not session tokens).
- Recommendations: Use `crypto.subtle.verify()` or a constant-time comparison function instead of `===`.

**Chat API endpoint has no authentication:**
- Risk: The `/api/chat` route at `app/api/chat/route.ts` is publicly accessible without authentication. Combined with the bypassable client-side rate limiting, this exposes the OpenAI API key to abuse.
- Files: `app/api/chat/route.ts`
- Current mitigation: DB-backed rate limiting per session ID (20 messages/hour).
- Recommendations: Add IP-based rate limiting. Consider requiring a CSRF token or adding authentication for higher limits.

**Admin route protection relies on app_metadata only:**
- Risk: Admin access is gated by `user.app_metadata?.role !== 'admin'` in middleware (`middleware.ts` line 79). The `app_metadata` is set via `supabaseAdmin.auth.admin.updateUserById` and is not modifiable by regular users, which is correct. However, individual admin actions also call `requireAdmin()` which provides defense-in-depth.
- Files: `middleware.ts`, `app/actions/admin/auth.ts`
- Current mitigation: Dual-layer check (middleware + action-level `requireAdmin()`).
- Recommendations: Current approach is sound. Ensure all admin actions consistently use `requireAdmin()`.

## Performance Bottlenecks

**getCourtAvailability fetches all pricing rows:**
- Problem: `lib/queries/reservations.ts` line 205 fetches ALL `court_pricing` rows regardless of which court is being queried. With many courts, this fetches unnecessary data.
- Files: `lib/queries/reservations.ts`
- Cause: The pricing query has no `court_id` filter when a specific court is requested.
- Improvement path: Add `.eq('court_id', courtId)` to the pricing query when `courtId` is provided, consistent with how courts and reservations queries are filtered.

**Reservation creation makes 5+ sequential DB queries:**
- Problem: `createReservationAction` in `app/actions/reservations.ts` makes sequential queries: getUser, profile, pending check, membership, app_config, court location (conditional), pricing (conditional), conflict check, insert, court name for email. This is 6-10 round trips.
- Files: `app/actions/reservations.ts`
- Cause: Each check is a separate query with no parallelization.
- Improvement path: Batch independent queries with `Promise.all()` (e.g., profile + pending check + membership + app_config can run in parallel). Consider a Postgres function for the entire reservation flow.

**Admin user search fetches memberships in a second query:**
- Problem: `searchUsersAction` in `app/actions/admin/users.ts` first queries users, then does a second query for memberships. This is an N+1 variant (batch, but still two round trips).
- Files: `app/actions/admin/users.ts`
- Cause: Memberships are in a separate table not joinable via the admin_users_view.
- Improvement path: Extend the `admin_users_view` Postgres view to include membership data via a LEFT JOIN, reducing to a single query.

## Fragile Areas

**Middleware authentication and routing logic:**
- Files: `middleware.ts`, `lib/middleware/route-helpers.ts`, `lib/middleware/cookie-signing.ts`
- Why fragile: The middleware handles 5 concerns (i18n, auth, admin access, membership gating, reservation bypass) in a single function with complex branching. Adding a new route category or auth rule requires understanding the full flow.
- Safe modification: Add new route prefixes to `lib/middleware/route-helpers.ts` constants. Do not modify the middleware control flow without testing all auth states (anon, authenticated, member, admin).
- Test coverage: `tests/unit/middlewareRouting.test.ts` and `tests/unit/cookieSigning.test.ts` exist but only test helper functions, not the middleware integration.

**Stripe webhook handler chain:**
- Files: `app/api/stripe/webhook/route.ts`, `lib/stripe/webhookHandlers.ts`
- Why fragile: The webhook handler catches all errors with a bare `catch` (line 92) and returns 500, which triggers Stripe retries. If a handler has a persistent bug, Stripe will retry indefinitely until the event ages out. The idempotency guard prevents re-processing but the error logging swallows the error details.
- Safe modification: Add specific error types and log the actual error in the catch block. Add monitoring/alerting for repeated webhook failures.
- Test coverage: `tests/unit/webhookHandler.test.ts` exists.

**Reservation email formatting:**
- Files: `app/actions/reservations.ts` lines 204-228
- Why fragile: The email sends `formattedTime` as raw `${startTime} - ${endTime}` which are ISO timestamps from FormData. Any change to how the frontend sends time data will silently break email formatting.
- Safe modification: Parse and format the timestamps into human-readable format before passing to the email function.
- Test coverage: No tests for email formatting or content.

## Scaling Limits

**Chat rate limit table growth:**
- Current capacity: One row per unique session ID in `chat_rate_limits`.
- Limit: No cleanup mechanism for expired sessions. Table grows indefinitely.
- Scaling path: Add a pg_cron job to delete rows where `window_start` is older than 24 hours. Or switch to Redis-based rate limiting.

**Webhook events table growth:**
- Current capacity: One row per Stripe webhook event in `webhook_events`.
- Limit: No cleanup mechanism. Table grows with every Stripe event (including unhandled types).
- Scaling path: Add a pg_cron job to delete events older than 30 days. Add an index on `stripe_event_id` (likely exists via unique constraint).

## Dependencies at Risk

**Resend on sandbox domain:**
- Risk: All transactional emails use `onboarding@resend.dev`. Resend limits sandbox usage. Production deployment requires a verified custom domain.
- Impact: Email delivery will fail or be severely rate-limited in production.
- Migration plan: Register a custom domain with Resend, verify DNS records, update `FROM_ADDRESS` in `lib/resend/emails.ts` and all other hardcoded sender addresses.

**OpenAI model pinned to gpt-4o-mini:**
- Risk: `app/api/chat/route.ts` line 124 hardcodes `gpt-4o-mini`. OpenAI may deprecate this model.
- Impact: Chat feature breaks when model is retired.
- Migration plan: Move model name to an environment variable or app_config. Monitor OpenAI deprecation notices.

## Missing Critical Features

**No Stripe refund handling:**
- Problem: When a paid reservation is cancelled (via `cancelReservationAction`), there is no Stripe refund logic. The status is updated to `cancelled` but the payment remains.
- Blocks: Fair cancellation policy for non-member per-session payments.

**No email verification enforcement:**
- Problem: `signUpAction` in `app/actions/auth.ts` creates a profile and redirects to `/?welcome=1` immediately after `signUp`. Supabase may require email confirmation depending on project settings, but the app flow does not enforce or communicate this.
- Blocks: Unverified email addresses receiving transactional emails (booking confirmations, reminders).

**No admin audit logging:**
- Problem: Admin actions (disable user, set maintenance, cancel reservations) have no audit trail. If an admin makes a mistake, there is no record of who did what.
- Blocks: Accountability and debugging admin-initiated issues.

## Test Coverage Gaps

**No integration tests for server actions:**
- What's not tested: All server actions in `app/actions/` (reservations, billing, auth, profile, admin/*) have zero test coverage. The existing unit tests only cover utility functions and static analysis.
- Files: `app/actions/reservations.ts`, `app/actions/billing.ts`, `app/actions/auth.ts`, `app/actions/profile.ts`, `app/actions/sessionPayment.ts`, `app/actions/admin/*.ts`
- Risk: Business logic regressions (double-booking, incorrect pricing, membership gating) go undetected.
- Priority: High

**No tests for email content or delivery:**
- What's not tested: Email templates, formatting, and delivery logic in `lib/resend/emails.ts`.
- Files: `lib/resend/emails.ts`
- Risk: Broken email formatting (confirmed by the ISO timestamp bug) and silent delivery failures.
- Priority: Medium

**No tests for middleware integration:**
- What's not tested: The full middleware flow in `middleware.ts` — only the helper functions are tested (`tests/unit/middlewareRouting.test.ts`). Auth redirects, membership gating, admin access, and cookie caching are untested as integrated behavior.
- Files: `middleware.ts`
- Risk: Auth bypass or incorrect redirects after middleware changes.
- Priority: High

**No E2E tests implemented:**
- What's not tested: Playwright is configured (`playwright.config.ts`) but the `tests/auth/` and `tests/i18n/` directories contain no test files.
- Files: `tests/auth/`, `tests/i18n/`
- Risk: Full user flows (signup, login, book, pay, cancel) are never tested end-to-end.
- Priority: Medium

---

*Concerns audit: 2026-03-14*
