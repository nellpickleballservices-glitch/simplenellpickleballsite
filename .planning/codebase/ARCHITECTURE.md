# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Next.js App Router with Server Actions, Supabase as BaaS (Backend-as-a-Service), Stripe for payments

**Key Characteristics:**
- Server-first rendering: pages are async Server Components that fetch data directly from Supabase
- Mutations via Server Actions (`'use server'` functions in `app/actions/`) invoked by client forms using `useActionState`
- Three-layer admin protection: middleware (Layer 1) -> layout (Layer 2) -> Server Action guard (Layer 3)
- Supabase RLS enforces row-level data isolation; admin operations bypass RLS via service-role client
- Bilingual (es/en) via `next-intl` with locale-prefixed routes (`/dashboard` for es, `/en/dashboard` for en)
- Stripe webhooks drive membership lifecycle; the app never writes membership status directly except through webhook handlers

## Layers

**Presentation Layer (Pages & Components):**
- Purpose: Render UI, handle form submissions, display data
- Location: `app/[locale]/` (pages), `components/` (shared UI)
- Contains: Server Components (pages), Client Components (forms, interactive UI)
- Depends on: Server Actions, lib/queries, lib/content
- Used by: End users (browser)

**Server Actions Layer:**
- Purpose: Handle all mutations (create, update, delete) with auth validation
- Location: `app/actions/`
- Contains: `auth.ts`, `billing.ts`, `reservations.ts`, `sessionPayment.ts`, `profile.ts`, `admin.ts`
- Depends on: `lib/supabase/server`, `lib/supabase/admin`, `lib/stripe`, `lib/resend`
- Used by: Client Components via `useActionState` and direct invocation

**Query Layer:**
- Purpose: Read-only data fetching with business logic (availability computation, content retrieval)
- Location: `lib/queries/`, `lib/content.ts`
- Contains: `reservations.ts` (court availability + time slot generation), `content.ts` (CMS block fetching)
- Depends on: `lib/supabase/server`, `lib/types/`
- Used by: Server Component pages

**Integration Layer:**
- Purpose: Wrap external service SDKs with app-specific configuration
- Location: `lib/stripe/`, `lib/supabase/`, `lib/resend/`
- Contains: Client factories, webhook handlers, email templates
- Depends on: Environment variables, external APIs
- Used by: Server Actions, API routes, Query layer

**API Routes Layer:**
- Purpose: Handle inbound webhooks and streaming AI responses (non-form HTTP endpoints)
- Location: `app/api/`
- Contains: `stripe/webhook/route.ts`, `chat/route.ts`
- Depends on: `lib/stripe`, `lib/supabase/admin`, OpenAI SDK
- Used by: Stripe (webhooks), ChatWidget component (SSE stream)

**Database Layer:**
- Purpose: Persistent storage with row-level security
- Location: `supabase/migrations/`
- Contains: 6 migration files defining 11 tables, RLS policies, exclusion constraints, seed data
- Depends on: Supabase hosted PostgreSQL
- Used by: All server-side layers via Supabase clients

## Data Flow

**Member Subscription Flow:**

1. User selects plan on `/pricing` -> `PricingCards.tsx` calls `createCheckoutSessionAction()` in `app/actions/billing.ts`
2. Action creates Stripe Checkout Session with `client_reference_id = user.id`, redirects to Stripe
3. After payment, Stripe sends `checkout.session.completed` webhook to `app/api/stripe/webhook/route.ts`
4. Webhook route deduplicates via `webhook_events` table, dispatches to `handleCheckoutCompleted()` in `lib/stripe/webhookHandlers.ts`
5. Handler upserts row in `memberships` table with `status: 'active'`
6. Middleware (`middleware.ts`) checks `memberships` table on subsequent requests to gate `/member/` routes

**Court Reservation Flow:**

1. Server Component `app/[locale]/(member)/reservations/page.tsx` calls `getCourtAvailability()` from `lib/queries/reservations.ts`
2. Query fetches courts, configs, pricing, and existing reservations in parallel via `Promise.all`
3. `generateTimeSlots()` computes per-hour availability with spot-level granularity
4. User submits form -> `createReservationAction()` in `app/actions/reservations.ts`
5. Action validates: auth, pending payment block, membership check, advance booking window, location restriction, conflict check
6. Inserts reservation row, sends confirmation email via `lib/resend/emails.ts` (fire-and-forget)
7. Non-members get `status: 'pending_payment'` -> redirected to Stripe one-time checkout via `createSessionPaymentAction()` in `app/actions/sessionPayment.ts`

**Admin CMS Flow:**

1. Admin navigates to `/admin/cms` -> `page.tsx` calls `getContentBlocksAction()` from `app/actions/admin.ts`
2. Content blocks are fetched via `supabaseAdmin` (service role, bypasses RLS), grouped by prefix (`home_`, `about_`, `learn_`, `faq_`)
3. Admin edits content in `ContentEditor.tsx` (TipTap rich text editor)
4. Save calls `updateContentBlockAction()` which updates the row and calls `revalidatePath('/')` for ISR cache invalidation
5. Public pages fetch content via `getContentBlocks()` from `lib/content.ts` using the anon-role Supabase client

**State Management:**
- No client-side state management library (no Redux, Zustand, etc.)
- Server Components fetch fresh data on each request
- Client Components use React's `useActionState` for form state and `useState` for local UI state
- Auth state managed by Supabase cookies, refreshed in `middleware.ts` on every request

## Key Abstractions

**Supabase Client Trio:**
- Purpose: Three Supabase client types for different security contexts
- `lib/supabase/server.ts` - Server Component/Action client (uses cookies, respects RLS)
- `lib/supabase/client.ts` - Browser client (uses cookies, respects RLS)
- `lib/supabase/admin.ts` - Service-role client (bypasses ALL RLS, server-only)
- Pattern: Server Actions use `createClient()` for user-scoped queries, `supabaseAdmin` for cross-user admin queries

**Route Group Segmentation:**
- Purpose: Separate layout and auth concerns by user role
- `(marketing)` - Public pages with Footer, ChatWidget, MotionProvider animations
- `(auth)` - Login/signup/reset-password pages, no special layout
- `(member)` - Authenticated member pages (dashboard, reservations, settings)
- `(admin)` - Admin panel with sidebar layout, triple-layer auth protection

**Server Action Pattern:**
- Purpose: Standardized mutation pattern across the app
- Pattern: `(prevState, formData) => Promise<ActionState>` compatible with `useActionState`
- Examples: `app/actions/auth.ts`, `app/actions/reservations.ts`, `app/actions/profile.ts`
- All actions begin with `await supabase.auth.getUser()` for authentication

**Webhook Handler Pattern:**
- Purpose: Process Stripe events with idempotency
- `app/api/stripe/webhook/route.ts` - Entry point with signature verification and dedup
- `lib/stripe/webhookHandlers.ts` - Individual handlers that receive typed Stripe objects and a SupabaseClient
- Pattern: Handlers are pure functions that take `(StripeObject, SupabaseClient)` for testability

## Entry Points

**Web Application:**
- Location: `app/[locale]/layout.tsx`
- Triggers: Browser navigation
- Responsibilities: Font loading, i18n provider, global Navbar

**Middleware:**
- Location: `middleware.ts`
- Triggers: Every non-static request (matcher excludes `api`, `_next`, static files)
- Responsibilities: Supabase token refresh, auth redirects, admin role check, membership gate, i18n locale routing

**Stripe Webhook:**
- Location: `app/api/stripe/webhook/route.ts`
- Triggers: Stripe event delivery (POST)
- Responsibilities: Signature verification, idempotency dedup, event dispatch to handlers

**Auth Callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: OAuth/email-link redirect from Supabase Auth
- Responsibilities: Exchange auth code for session, redirect to intended destination

**Chat API:**
- Location: `app/api/chat/route.ts`
- Triggers: ChatWidget POST requests
- Responsibilities: Rate limiting, CMS knowledge loading, OpenAI streaming via SSE

**Supabase Edge Function:**
- Location: `supabase/functions/session-reminder/index.ts`
- Triggers: pg_cron schedule (configured in `0004_pg_cron_reminder.sql`)
- Responsibilities: Send session reminder emails 10 minutes before court time

## Error Handling

**Strategy:** Return error objects from Server Actions; never throw in user-facing flows

**Patterns:**
- Server Actions return `{ error: string }` or `{ errors: Record<string, string> }` for validation failures
- Admin actions throw `new Error()` for unexpected failures (caught by error boundaries)
- Webhook handlers throw errors so the route returns 500 and Stripe retries
- Email sending is fire-and-forget: failures are logged but never block the primary operation
- Database constraint violations (e.g., `23P01` exclusion violation) are caught and mapped to user-friendly error codes like `'slot_taken'`

## Cross-Cutting Concerns

**Logging:** `console.error` only, no structured logging framework. Used for email failures, DB errors, and OpenAI errors.

**Validation:**
- Server-side validation in every Server Action before database writes
- Shared validators: `lib/utils/normalizeName.ts`, `lib/utils/passwordValidation.ts`
- Database-level constraints as last line of defense (CHECK, EXCLUDE, UNIQUE)
- No client-side validation library; forms rely on HTML5 attributes and server-side checks

**Authentication:**
- Supabase Auth with email/password (no OAuth providers configured)
- JWT validated on every request via `middleware.ts` calling `supabase.auth.getUser()`
- Admin role stored in `app_metadata.role` (set via service-role client)
- Three-layer admin protection: middleware redirect -> layout server-side check -> `requireAdmin()` in actions

**Internationalization:**
- `next-intl` v4 with `localePrefix: 'as-needed'` (Spanish is default, no prefix)
- Static translations in `messages/es.json` and `messages/en.json`
- Dynamic content (CMS) stored as `content_es` / `content_en` columns in `content_blocks` table
- Locale detection in Server Actions via referer header sniffing for Stripe redirect URLs

---

*Architecture analysis: 2026-03-14*
