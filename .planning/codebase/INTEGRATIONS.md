# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**Payments - Stripe:**
- Purpose: Membership subscriptions (VIP/Basic plans) and per-session one-time payments
- SDK: `stripe` ^20.4.1 (API version `2026-02-25.clover`)
- Client singleton: `lib/stripe/index.ts`
- Auth: `STRIPE_SECRET_KEY` env var
- Webhook secret: `STRIPE_WEBHOOK_SECRET` env var
- Price IDs: `STRIPE_PRICE_ID_VIP`, `STRIPE_PRICE_ID_BASIC` env vars
- Features used:
  - Checkout Sessions (subscription mode for memberships, payment mode for per-session)
  - Billing Portal (member self-service subscription management)
  - Webhooks (event-driven membership sync)
  - Subscription retrieval

**Email - Resend:**
- Purpose: Transactional emails (booking confirmations, session-end reminders)
- SDK: `resend` ^6.9.3
- Client singleton: `lib/resend/index.ts`
- Auth: `RESEND_API_KEY` env var
- From address: `NELL Pickleball Club <onboarding@resend.dev>`
- Email types:
  - Booking confirmation (`lib/resend/emails.ts` -> `sendConfirmationEmail()`)
  - Session-end 10-minute reminder (`lib/resend/emails.ts` -> `sendReminderEmail()`)
- Bilingual support: All emails sent in user's locale preference (en/es)
- Also called directly via REST API from Edge Function (`supabase/functions/session-reminder/index.ts`)

**AI Chatbot - OpenAI:**
- Purpose: "Nelly" AI assistant for club visitors
- SDK: `openai` ^6.27.0
- Auth: `OPENAI_API_KEY` env var
- Model: `gpt-4o-mini`
- Endpoint: `app/api/chat/route.ts` (POST `/api/chat`)
- Features: Streaming SSE responses, CMS-enriched system prompt, bilingual
- Rate limiting: DB-backed via `chat_rate_limits` table, 20 messages/hour per session
- Rate limit logic: `lib/chat/rate-limit.ts`

## Data Storage

**Database - Supabase (PostgreSQL):**
- Provider: Supabase (hosted PostgreSQL)
- Connection: `NEXT_PUBLIC_SUPABASE_URL` env var
- Clients:
  - Browser client: `lib/supabase/client.ts` (uses `createBrowserClient` from `@supabase/ssr`)
  - Server client: `lib/supabase/server.ts` (uses `createServerClient` from `@supabase/ssr`, cookie-based)
  - Admin client: `lib/supabase/admin.ts` (uses `createClient` from `@supabase/supabase-js`, bypasses RLS)
- Auth keys:
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Anon key (public, RLS enforced)
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server only, bypasses RLS)
- Tables (10 total):
  - `profiles` - User profiles (linked to `auth.users`)
  - `locations` - Club locations
  - `courts` - Courts per location
  - `court_config` - Per-court schedule (weekday/weekend open/close times, mode windows)
  - `court_pricing` - Per-court pricing by booking mode (full_court/open_play)
  - `memberships` - User membership records (Stripe-synced)
  - `reservations` - Court bookings with exclusion constraints preventing double-booking
  - `events` - Club events (bilingual, with types: tournament/training/social)
  - `content_blocks` - CMS content (bilingual rich text/plain text)
  - `webhook_events` - Stripe webhook idempotency tracking
  - `app_config` - Key-value application configuration
  - `chat_rate_limits` - Chat session rate limiting
- RLS: Enabled on all tables. Users see own data; `service_role` has full access.
- Realtime: Enabled for `memberships` table (post-checkout subscription listener)
- Migrations: `supabase/migrations/0001_initial_schema.sql` through `0007_admin_view_rpc_ratelimit_index.sql`

**File Storage:**
- Local filesystem / public directory only (no Supabase Storage or S3 detected)
- Event images referenced via `image_url` column (external URLs)

**Caching:**
- Membership status cached in signed HMAC cookie (5-minute TTL)
  - Implementation: `lib/middleware/cookie-signing.ts`
  - Cookie name: `nell_membership_cache`
  - Signing secret: `MEMBERSHIP_COOKIE_SECRET` env var

## Authentication & Identity

**Auth Provider - Supabase Auth:**
- Implementation: Email/password authentication via Supabase Auth
- Auth flow:
  - Signup/Login: Server actions in `app/actions/auth.ts`
  - OAuth callback: `app/auth/callback/route.ts` (code exchange)
  - Password reset: `app/[locale]/(auth)/reset-password/` flow
  - Profile completion: `app/[locale]/(auth)/signup/complete-profile/`
- Session management: Cookie-based via `@supabase/ssr`
- JWT validation: `supabase.auth.getUser()` in middleware (never trust session alone)
- Admin role: Stored in `app_metadata.role` (set via `lib/supabase/admin.ts` -> `assignAdminRole()`)
- Middleware auth: `middleware.ts` handles route protection, auth redirects, admin gating, membership checks

**Route Protection (middleware.ts):**
- Public routes: No auth check, i18n only
- Auth redirect routes (`/login`, `/signup`): Redirect authenticated users to `/member/dashboard`
- Protected routes (`/member/*`): Require authentication
- Admin routes (`/admin/*`): Require `app_metadata.role === 'admin'`
- Member routes: Require active membership (DB-checked with cookie cache)
- Reservation routes: Open to ALL authenticated users (members and non-members)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar detected)

**Logs:**
- `console.error` / `console.warn` throughout server-side code
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from Next.js App Router conventions)

**CI Pipeline:**
- Not detected (no `.github/workflows/`, no `vercel.json` found)
- Playwright config has CI-aware settings (`forbidOnly`, `retries`, `workers`)

## Environment Configuration

**Required env vars (app runtime):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PRICE_ID_VIP` - Stripe price ID for VIP membership
- `STRIPE_PRICE_ID_BASIC` - Stripe price ID for Basic membership
- `RESEND_API_KEY` - Resend transactional email API key
- `OPENAI_API_KEY` - OpenAI API key for chatbot
- `MEMBERSHIP_COOKIE_SECRET` - HMAC secret for membership cookie signing
- `NEXT_PUBLIC_SITE_URL` - Public site URL (fallback for Stripe redirects)

**Required env vars (Supabase Edge Functions):**
- `SUPABASE_URL` - Auto-provided by Supabase runtime
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase runtime
- `RESEND_API_KEY` - Must be set via `supabase secrets set`

**Secrets location:**
- `.env.local` (local development, gitignored)
- Supabase Vault (pg_cron secrets: `project_url`, `anon_key`)
- Supabase Secrets (Edge Function secrets)
- Vercel Environment Variables (production, inferred)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` (`app/api/stripe/webhook/route.ts`)
  - Signature verification via `stripe.webhooks.constructEvent()`
  - Idempotency via `webhook_events` table (deduplicates by `stripe_event_id`)
  - Handled events:
    - `checkout.session.completed` (subscription) -> upsert membership as active
    - `checkout.session.completed` (payment) -> update reservation to paid/confirmed
    - `customer.subscription.updated` -> sync plan/status changes
    - `customer.subscription.deleted` -> mark membership cancelled
    - `invoice.payment_succeeded` -> update period end, set active
    - `invoice.payment_failed` -> set membership to past_due

**Outgoing:**
- None (no outgoing webhook dispatches detected)

**Scheduled Jobs:**
- `session-reminder` Edge Function (`supabase/functions/session-reminder/index.ts`)
  - Triggered every minute by pg_cron via pg_net
  - Sends 10-minute session-end reminder emails via Resend REST API
  - Expires stale `pending_payment` reservations based on `app_config.pending_payment_hold_hours`

---

*Integration audit: 2026-03-14*
