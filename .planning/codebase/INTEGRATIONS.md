# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**Payments (Stripe):**
- Stripe - Subscription billing (VIP/Basic plans) and one-time session payments
  - SDK/Client: `stripe` ^20.4.1, API version `2026-02-25.clover`
  - Client init: `lib/stripe/index.ts`
  - Auth: `STRIPE_SECRET_KEY`
  - Features used:
    - Checkout Sessions (subscription mode): `app/actions/billing.ts` - `createCheckoutSessionAction()`
    - Checkout Sessions (payment mode): `app/actions/sessionPayment.ts` - `createSessionPaymentAction()`
    - Billing Portal: `app/actions/billing.ts` - `createPortalSessionAction()`
    - Webhook signature verification: `app/api/stripe/webhook/route.ts`
    - Subscription retrieval: `lib/stripe/webhookHandlers.ts`
  - Price IDs configured via: `STRIPE_PRICE_ID_VIP`, `STRIPE_PRICE_ID_BASIC`

**AI/ML (OpenAI):**
- OpenAI - AI chatbot assistant "Nelly"
  - SDK/Client: `openai` ^6.27.0
  - Auth: `OPENAI_API_KEY`
  - Model: `gpt-4o-mini`
  - Usage: Streaming chat completions via SSE at `app/api/chat/route.ts`
  - Rate limit: 20 messages per session per hour (in-memory)
  - System prompt pulls CMS content_blocks and upcoming events from Supabase

**Email (Resend):**
- Resend - Transactional email delivery
  - SDK/Client: `resend` ^6.9.3
  - Client init: `lib/resend/index.ts`
  - Auth: `RESEND_API_KEY`
  - From address: `NELL Pickleball Club <onboarding@resend.dev>`
  - Email types:
    - Booking confirmation: `lib/resend/emails.ts` - `sendConfirmationEmail()`
    - Session end reminder: `lib/resend/emails.ts` - `sendReminderEmail()`
  - Also used directly via REST API in Edge Function: `supabase/functions/session-reminder/index.ts`
  - All emails support bilingual content (ES/EN)

## Data Storage

**Database:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + auth keys
  - Clients:
    - Browser client: `lib/supabase/client.ts` (uses `createBrowserClient` from `@supabase/ssr`)
    - Server client: `lib/supabase/server.ts` (uses `createServerClient` from `@supabase/ssr`, cookie-based)
    - Admin client: `lib/supabase/admin.ts` (uses `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS)
  - Tables (10 total):
    - `profiles` - User profiles (linked to `auth.users`)
    - `locations` - Club locations
    - `courts` - Courts per location (with maintenance windows)
    - `memberships` - User membership status (linked to Stripe subscriptions)
    - `reservations` - Court bookings (with exclusion constraints for double-booking prevention)
    - `events` - Club events (bilingual, with types: tournament/training/social)
    - `content_blocks` - CMS content (bilingual rich text/plain text)
    - `court_config` - Court schedule config per day type (weekday/weekend)
    - `app_config` - Key-value application configuration
    - `court_pricing` - Per-court pricing by booking mode
    - `webhook_events` - Stripe webhook idempotency tracking
  - Migrations: `supabase/migrations/0001_initial_schema.sql` through `0006_footer_social_links.sql`
  - RLS: Enabled on all tables with per-table policies
  - Extensions: `btree_gist` (exclusion constraints), `pg_cron` (scheduled jobs), `pg_net` (HTTP calls from DB)

**File Storage:**
- Supabase Storage (implied by `avatar_url` column in profiles, but not actively used in current code)

**Caching:**
- None (no explicit caching layer)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: Email/password authentication
  - Server actions: `app/actions/auth.ts` (signUp, login, logout, resetPassword, updatePassword)
  - Auth callback: `app/auth/callback/` route
  - Middleware: `middleware.ts` - validates JWT via `supabase.auth.getUser()` on every request
  - Role system: Admin role stored in `app_metadata.role` (set via `lib/supabase/admin.ts` - `assignAdminRole()`)
  - Route protection layers:
    - Layer 1 (middleware): Unauthenticated users redirected from `/dashboard` and `/admin` to `/login`
    - Layer 2 (middleware): Non-admin users redirected from `/admin/*` to `/`
    - Layer 3 (middleware): Unsubscribed users redirected from `/member/*` to `/pricing` (except reservation routes)
    - Layer 4 (RLS): Database-level row security on all tables

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- `console.error()` / `console.warn()` throughout server-side code
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured (Next.js app, likely Vercel)

**CI Pipeline:**
- Playwright config checks `process.env.CI` for retry/worker settings
- No CI config files detected (.github/workflows, etc.)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-only)
- `STRIPE_SECRET_KEY` - Stripe API key (server-only)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (server-only)
- `STRIPE_PRICE_ID_VIP` - Stripe price for VIP membership (server-only)
- `STRIPE_PRICE_ID_BASIC` - Stripe price for Basic membership (server-only)
- `OPENAI_API_KEY` - OpenAI API key (server-only)
- `RESEND_API_KEY` - Resend API key (server-only)
- `NEXT_PUBLIC_SITE_URL` - Application URL for redirects (optional, defaults to localhost)

**Supabase Edge Function secrets (separate from .env):**
- `RESEND_API_KEY` - Used by `session-reminder` Edge Function

**Supabase Vault secrets (stored in database):**
- `project_url` - Supabase project URL (for pg_cron -> Edge Function calls)
- `anon_key` - Supabase anon key (for pg_cron -> Edge Function auth)

**Secrets location:**
- `.env.local` for local development (gitignored)
- Supabase Vault for database-level secrets
- `supabase secrets set` for Edge Function secrets

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` - Stripe webhook endpoint (`app/api/stripe/webhook/route.ts`)
  - Signature verification via `STRIPE_WEBHOOK_SECRET`
  - Idempotency: Deduplicates via `webhook_events` table (unique constraint on `stripe_event_id`)
  - Handled events:
    - `checkout.session.completed` (subscription mode) -> upserts membership as active
    - `checkout.session.completed` (payment mode) -> updates reservation to paid/confirmed
    - `customer.subscription.updated` -> updates plan type and status
    - `customer.subscription.deleted` -> sets membership to cancelled
    - `invoice.payment_succeeded` -> updates period end, sets active
    - `invoice.payment_failed` -> sets membership to past_due
  - Handler logic: `lib/stripe/webhookHandlers.ts`

**Outgoing:**
- None (no outgoing webhooks)

## Scheduled Jobs

**pg_cron (Supabase):**
- `session-reminder` - Runs every minute (`* * * * *`)
  - Migration: `supabase/migrations/0004_pg_cron_reminder.sql`
  - Invokes: Supabase Edge Function `session-reminder` via `pg_net` HTTP POST
  - Edge Function: `supabase/functions/session-reminder/index.ts`
  - Responsibilities:
    1. Sends 10-minute session-end reminder emails via Resend REST API
    2. Expires `pending_payment` reservation holds past the configured window

## Auth Callback Flow

**Supabase Auth Callback:**
- `app/auth/callback/` - Handles OAuth/magic link callbacks
- Used for password reset flow: redirects to `/reset-password/update` after email verification

---

*Integration audit: 2026-03-13*
