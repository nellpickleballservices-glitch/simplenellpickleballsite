# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Next.js 16 App Router with Server Actions, Supabase backend, and Stripe billing

**Key Characteristics:**
- Server-first architecture: pages are async Server Components; mutations use `'use server'` actions
- No REST API layer for app logic -- all data fetching and mutations go through Server Actions or direct Supabase queries in Server Components
- Three-layer admin protection: middleware (Layer 1), layout (Layer 2), action-level `requireAdmin()` (Layer 3)
- i18n via `next-intl` with `[locale]` dynamic segment and route groups for role-based layouts
- Supabase RLS enforces row-level security; admin operations use `supabaseAdmin` (service role) to bypass RLS

## Layers

**Presentation (Pages + Components):**
- Purpose: Render UI, handle user interactions
- Location: `app/[locale]/` (pages), `components/` (shared components)
- Contains: Server Components (pages), Client Components (interactive widgets)
- Depends on: Server Actions, lib/queries, lib/content, next-intl translations
- Used by: End users via browser

**Server Actions (Mutation Layer):**
- Purpose: Handle all form submissions and state-changing operations
- Location: `app/actions/`
- Contains: `'use server'` functions that validate input, enforce auth/business rules, and write to Supabase
- Depends on: `lib/supabase/server`, `lib/supabase/admin`, `lib/stripe`, `lib/resend`, `lib/utils`
- Used by: Pages via `useActionState` or direct form action binding
- Key files:
  - `app/actions/auth.ts` -- signup, login, logout, password reset
  - `app/actions/reservations.ts` -- create/cancel reservations
  - `app/actions/billing.ts` -- Stripe checkout/portal sessions
  - `app/actions/sessionPayment.ts` -- per-session Stripe Checkout (non-members)
  - `app/actions/admin.ts` -- all admin CRUD (users, courts, events, CMS, reservations)
  - `app/actions/profile.ts` -- profile updates, password changes

**Data Access (Query Layer):**
- Purpose: Read-only data fetching for Server Components
- Location: `lib/queries/`, `lib/content.ts`
- Contains: Functions that query Supabase and return typed data
- Depends on: `lib/supabase/server`
- Used by: Server Components (pages)
- Key files:
  - `lib/queries/reservations.ts` -- court availability, time slot generation, app config
  - `lib/content.ts` -- CMS content block fetching by key prefix

**Infrastructure (Client Factories + SDKs):**
- Purpose: Initialize and configure external service clients
- Location: `lib/supabase/`, `lib/stripe/`, `lib/resend/`
- Contains: Client creation functions and webhook event handlers
- Depends on: Environment variables
- Used by: Server Actions, API routes, query layer
- Key files:
  - `lib/supabase/server.ts` -- cookie-based Supabase client for Server Components/Actions
  - `lib/supabase/client.ts` -- browser Supabase client for Client Components
  - `lib/supabase/admin.ts` -- service-role client (bypasses RLS). NEVER import from client code
  - `lib/stripe/index.ts` -- Stripe SDK singleton
  - `lib/stripe/webhookHandlers.ts` -- handlers for 6 Stripe webhook event types
  - `lib/resend/index.ts` -- Resend email client
  - `lib/resend/emails.ts` -- bilingual email templates (confirmation, reminder)

**API Routes (External Integrations):**
- Purpose: Handle incoming webhooks and AI chatbot requests
- Location: `app/api/`
- Contains: Route handlers for Stripe webhooks and OpenAI chat
- Depends on: `lib/stripe`, `lib/supabase/admin`, OpenAI SDK
- Used by: Stripe (webhooks), chatbot widget (chat API)
- Key files:
  - `app/api/stripe/webhook/route.ts` -- Stripe webhook endpoint with idempotency guard
  - `app/api/chat/route.ts` -- SSE streaming chatbot powered by OpenAI gpt-4o-mini

**Middleware:**
- Purpose: Auth enforcement, role gating, i18n locale routing
- Location: `middleware.ts`
- Contains: Supabase JWT validation, route protection logic, next-intl middleware composition
- Depends on: `@supabase/ssr`, `next-intl/middleware`, `i18n/routing`
- Used by: All non-API requests

## Data Flow

**Member Reservation Booking:**
1. User navigates to `/reservations` -- Server Component fetches court availability via `getCourtAvailability()` in `lib/queries/reservations.ts`
2. User selects time slot, submits form -- triggers `createReservationAction()` in `app/actions/reservations.ts`
3. Action authenticates user, checks membership, validates booking window, checks conflicts, inserts reservation row
4. If member: status=confirmed, payment_status=free. If non-member: status=pending_payment, needs Stripe checkout
5. Non-member redirected to Stripe Checkout via `createSessionPaymentAction()` in `app/actions/sessionPayment.ts`
6. Stripe webhook `checkout.session.completed` fires, `handleOneTimePaymentCompleted()` updates reservation to paid/confirmed

**Subscription Checkout:**
1. User clicks plan on `/pricing` -- calls `createCheckoutSessionAction()` in `app/actions/billing.ts`
2. Stripe Checkout session created with `mode: subscription`, user redirected to Stripe
3. On success, Stripe webhook fires `checkout.session.completed` (subscription mode)
4. `handleCheckoutCompleted()` in `lib/stripe/webhookHandlers.ts` upserts membership row in Supabase
5. Subsequent webhook events (subscription.updated, invoice.payment_succeeded/failed, subscription.deleted) keep membership status in sync

**Admin CMS Update:**
1. Admin navigates to `/admin/cms` -- `getContentBlocksAction()` fetches all content blocks via `supabaseAdmin`
2. Admin edits content, submits -- `updateContentBlockAction()` writes to Supabase, calls `revalidatePath('/')` for ISR invalidation
3. Public pages fetch fresh content via `getContentBlocks()` in `lib/content.ts`

**State Management:**
- No client-side state management library (no Redux, Zustand, etc.)
- Server Components fetch data on each request
- Form state managed via React 19 `useActionState` pattern
- Auth state derived from Supabase JWT in cookies, validated in middleware

## Key Abstractions

**Supabase Client Tiers:**
- Purpose: Enforce security boundaries between client, server, and admin contexts
- Examples: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`
- Pattern: Three distinct clients -- browser (anon key), server (anon key + cookies), admin (service role, bypasses RLS)

**Server Actions as Mutation Boundary:**
- Purpose: All writes go through `'use server'` functions that validate auth and business rules
- Examples: `app/actions/reservations.ts`, `app/actions/admin.ts`
- Pattern: Each action authenticates the user, validates input, enforces business rules, then writes to Supabase

**Court Availability System:**
- Purpose: Generate time slots with availability for court booking UI
- Examples: `lib/queries/reservations.ts` (`generateTimeSlots`, `getCourtAvailability`)
- Pattern: Fetch court configs + reservations + app configs in parallel, compute per-slot availability with booking mode awareness (full_court vs open_play with 4 spots)

**CMS Content Blocks:**
- Purpose: Admin-editable bilingual content for public pages
- Examples: `lib/content.ts`, `app/actions/admin.ts` (CMS section)
- Pattern: Content stored in `content_blocks` table with `content_es`/`content_en` columns, fetched by key prefix (e.g., `home_`, `about_`), rendered via `dangerouslySetInnerHTML` for rich text

**Webhook Idempotency:**
- Purpose: Prevent duplicate processing of Stripe webhook events
- Examples: `app/api/stripe/webhook/route.ts`
- Pattern: Insert `stripe_event_id` into `webhook_events` table before processing; unique constraint rejects duplicates (error code 23505)

## Entry Points

**Next.js App:**
- Location: `app/[locale]/layout.tsx`
- Triggers: All page requests
- Responsibilities: Renders root HTML, loads fonts (Bebas Neue, Inter), wraps children in `NextIntlClientProvider`, renders `Navbar`

**Middleware:**
- Location: `middleware.ts`
- Triggers: All non-API, non-static requests (see matcher config)
- Responsibilities: Validates JWT via `supabase.auth.getUser()`, enforces route protection (dashboard/admin require auth, admin requires admin role, member routes require active membership), composes next-intl locale routing

**Stripe Webhook:**
- Location: `app/api/stripe/webhook/route.ts`
- Triggers: Stripe webhook events (POST)
- Responsibilities: Verifies signature, deduplicates via DB, dispatches to typed handlers

**Chat API:**
- Location: `app/api/chat/route.ts`
- Triggers: Chatbot widget (POST with messages + sessionId)
- Responsibilities: Rate limiting (20 messages/session/hour), fetches CMS + events for system prompt, streams OpenAI response via SSE

**Auth Callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: Supabase auth redirects (email confirmation, password reset)
- Responsibilities: Exchanges auth code for session, redirects to target page

## Error Handling

**Strategy:** Return error objects from Server Actions; throw in admin actions

**Patterns:**
- Server Actions return `{ error?: string }` or `{ errors?: Record<string, string> }` for form validation -- consumed by `useActionState` on the client
- Admin actions call `requireAdmin()` which redirects on auth failure; data errors `throw new Error()`
- Webhook handler errors return HTTP 500 so Stripe retries; idempotency prevents re-processing
- Email sending is fire-and-forget: failures are logged but do not block the primary operation
- Supabase constraint violations (e.g., exclusion constraint code `23P01`) are caught and mapped to user-friendly error keys like `'slot_taken'`

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` for server-side errors. No structured logging framework.

**Validation:** Shared validation utilities in `lib/utils/` (name normalization, password rules). Server Actions perform their own validation before DB writes. No schema validation library (no Zod/Yup).

**Authentication:** Supabase Auth with email/password. JWT validated in middleware via `getUser()` (not `getSession()` -- see security comment in `middleware.ts`). Admin role stored in `app_metadata.role`. Three-layer protection for admin routes.

**Internationalization:** `next-intl` with `[locale]` segment. Default locale `es` with `localePrefix: 'as-needed'` (no `/es/` prefix for Spanish). Translation files in `messages/en.json` and `messages/es.json`. CMS content has dual `content_es`/`content_en` columns. Emails use bilingual templates.

---

*Architecture analysis: 2026-03-13*
