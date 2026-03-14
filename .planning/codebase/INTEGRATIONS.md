# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**Payments (Stripe):**
- Stripe SDK v20.4.1, API version `2026-02-25.clover`
- SDK/Client: `stripe` package, initialized in `lib/stripe/index.ts`
- Auth env var: `STRIPE_SECRET_KEY`
- Used for:
  - Subscription checkout (VIP $50/mo, Basic $35/mo) via `app/actions/billing.ts`
  - One-time per-session payments via `app/actions/sessionPayment.ts`
  - Customer billing portal via `app/actions/billing.ts` (`createPortalSessionAction`)
  - Webhook event processing via `app/api/stripe/webhook/route.ts`
- Stripe Price IDs: `STRIPE_PRICE_ID_VIP`, `STRIPE_PRICE_ID_BASIC`
- Webhook secret: `STRIPE_WEBHOOK_SECRET`

**AI Chatbot (OpenAI):**
- OpenAI SDK v6.27.0
- Model: `gpt-4o-mini` (streaming, max 500 tokens, temperature 0.7)
- SDK/Client: `openai` package, instantiated per-request in `app/api/chat/route.ts`
- Auth env var: `OPENAI_API_KEY`
- Purpose: "Nelly" chatbot — answers questions about the club using CMS content blocks and upcoming events as context
- Rate limiting: 20 messages per session per hour (in-memory Map)
- Response format: Server-Sent Events (SSE) stream

**Email (Resend):**
- Resend SDK v6.9.3
- SDK/Client: `resend` package, initialized in `lib/resend/index.ts`
- Auth env var: `RESEND_API_KEY`
- From address: `NELL Pickleball Club <onboarding@resend.dev>`
- Email types:
  - Booking confirmation (bilingual en/es) — `lib/resend/emails.ts` (`sendConfirmationEmail`)
  - Session-ending reminder (bilingual en/es) — `lib/resend/emails.ts` (`sendReminderEmail`)
  - Session reminder via Edge Function — `supabase/functions/session-reminder/index.ts` (uses Resend REST API directly, not SDK)

## Data Storage

**Database (Supabase / PostgreSQL):**
- Provider: Supabase (hosted PostgreSQL)
- Connection env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Admin env var: `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

**Client patterns (3 variants):**
- Browser client: `lib/supabase/client.ts` — uses `createBrowserClient` from `@supabase/ssr`
- Server client: `lib/supabase/server.ts` — uses `createServerClient` with cookie-based auth
- Admin client: `lib/supabase/admin.ts` — uses `createClient` with service role key (bypasses RLS)

**Database tables (from migrations):**
- `profiles` — User profiles linked to `auth.users` (RLS: own row only)
- `locations` — Club locations with GPS coordinates
- `courts` — Courts per location with status (open/closed/maintenance)
- `memberships` — User memberships with Stripe subscription tracking
- `reservations` — Court bookings with double-booking prevention (GiST exclusion constraint)
- `events` — Club events with bilingual content (en/es)
- `content_blocks` — CMS content with bilingual text (en/es), keyed by `block_key`
- `court_config` — Per-court schedule configuration (weekday/weekend)
- `court_pricing` — Per-court pricing by booking mode (full_court/open_play)
- `app_config` — Key-value application configuration
- `webhook_events` — Stripe webhook idempotency tracking

**Migrations:** 6 sequential files in `supabase/migrations/`
- `0001_initial_schema.sql` — Core tables (profiles, locations, courts, memberships, reservations, events, content_blocks)
- `0002_webhook_events.sql` — Webhook deduplication table
- `0003_reservations.sql` — Enhanced reservation system (booking modes, pricing, exclusion constraints)
- `0004_pg_cron_reminder.sql` — pg_cron setup for session reminders
- `0005_admin_events_cms.sql` — Admin events and CMS enhancements
- `0006_footer_social_links.sql` — Social links content

**Row Level Security (RLS):**
- Enabled on all tables
- Pattern: authenticated users read own data, service_role has full access
- Exceptions: `events` and `content_blocks` are public-readable (anon + authenticated)
- Reservations are readable by all authenticated users (for availability display)

**File Storage:**
- Not currently used (avatar_url column exists in profiles but no upload implementation)

**Caching:**
- None (no Redis, no Next.js cache configuration beyond defaults)

## Authentication & Identity

**Auth Provider: Supabase Auth**
- Email/password authentication
- PKCE flow with auth callback: `app/auth/callback/route.ts`
- Cookie-based session management via `@supabase/ssr`
- JWT validation: Always uses `getUser()` (never `getSession()`) per security best practice
- Password reset flow: Email link -> callback -> update password form

**Auth actions:** `app/actions/auth.ts`
- `signUpAction` — Creates user + profile row (uses admin client for profile insert)
- `loginAction` — Email/password sign-in
- `logoutAction` — Sign out and redirect
- `resetPasswordAction` — Send reset email
- `updatePasswordAction` — Set new password

**Authorization layers (in `middleware.ts`):**
1. Unauthenticated users blocked from `/dashboard` and `/admin` routes (redirect to `/login`)
2. Non-admin users blocked from `/admin/*` routes (checks `app_metadata.role === 'admin'`)
3. Non-member users blocked from `/member/*` routes (queries `memberships` table, redirect to `/pricing`)
4. Exception: `/reservations` and `/checkout-session` routes are open to all authenticated users

**Admin role assignment:**
- `lib/supabase/admin.ts` (`assignAdminRole`) — Sets `app_metadata.role: 'admin'` via service role client

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar)

**Logs:**
- `console.error` / `console.warn` throughout server actions and API routes
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured; Next.js App Router project (Vercel-compatible)

**CI Pipeline:**
- No CI configuration files detected (no `.github/workflows/`, no `vercel.json`)
- Playwright config has CI-aware settings (`forbidOnly`, `retries`, `workers`)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin key (server-only)
- `STRIPE_SECRET_KEY` — Stripe API key (server-only)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (server-only)
- `STRIPE_PRICE_ID_VIP` — Stripe Price ID for VIP membership (server-only)
- `STRIPE_PRICE_ID_BASIC` — Stripe Price ID for Basic membership (server-only)
- `OPENAI_API_KEY` — OpenAI API key (server-only)
- `RESEND_API_KEY` — Resend email API key (server-only)
- `NEXT_PUBLIC_SITE_URL` — Production site URL for redirects (optional, falls back to localhost)

**Supabase Edge Function env vars (separate from Next.js):**
- `SUPABASE_URL` — Set automatically by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Set automatically by Supabase
- `RESEND_API_KEY` — Must be configured in Supabase Edge Function secrets

**Secrets location:**
- `.env.local` (local development, gitignored)
- Supabase dashboard (Edge Function secrets)
- Hosting provider dashboard (production env vars)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` — Stripe webhook endpoint (`app/api/stripe/webhook/route.ts`)
  - Signature verification via `stripe.webhooks.constructEvent()`
  - Idempotency via `webhook_events` table (unique constraint on `stripe_event_id`)
  - Handled events:
    - `checkout.session.completed` — Upserts membership (subscription) or updates reservation (one-time payment)
    - `customer.subscription.updated` — Updates membership plan/status
    - `customer.subscription.deleted` — Cancels membership
    - `invoice.payment_succeeded` — Updates period end, sets active
    - `invoice.payment_failed` — Sets membership to past_due
  - Handler logic: `lib/stripe/webhookHandlers.ts`

**Outgoing:**
- None (no outgoing webhook dispatching)

**Scheduled Tasks:**
- Supabase Edge Function `session-reminder` (`supabase/functions/session-reminder/index.ts`)
  - Triggered every minute by pg_cron via pg_net
  - Sends 10-minute session-ending email reminders via Resend REST API
  - Expires stale `pending_payment` reservations past the hold window

**Auth Callbacks:**
- `GET /auth/callback` — Supabase PKCE auth code exchange (`app/auth/callback/route.ts`)

---

*Integration audit: 2026-03-14*
