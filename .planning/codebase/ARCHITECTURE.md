# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Next.js 16 App Router with Server Actions, Supabase backend, and Stripe billing

**Key Characteristics:**
- Server-first rendering: pages are async Server Components by default; client interactivity added via `'use client'` leaf components
- Server Actions (`'use server'`) handle all mutations (auth, reservations, billing, admin CRUD) -- no custom REST endpoints except webhooks and chat
- Supabase as sole database and auth provider; Stripe for payments; OpenAI for AI chatbot
- Internationalization via `next-intl` with `[locale]` dynamic segment and `as-needed` prefix (Spanish default, English prefixed)
- Middleware layers: i18n routing + Supabase auth + membership gating + admin role check

## Layers

**Middleware (Edge):**
- Purpose: Route classification, auth checks, membership caching, i18n locale resolution
- Location: `middleware.ts`
- Contains: Supabase JWT validation, signed cookie membership cache, admin role gate, i18n middleware composition
- Depends on: `@/lib/middleware/route-helpers`, `@/lib/middleware/cookie-signing`, `@supabase/ssr`, `next-intl/middleware`
- Used by: All non-API requests matching the config matcher

**Route Groups (Presentation):**
- Purpose: Organize pages by access level and layout
- Location: `app/[locale]/(admin)/`, `app/[locale]/(auth)/`, `app/[locale]/(marketing)/`, `app/[locale]/(member)/`
- Contains: Page components (Server Components), co-located client form components
- Depends on: Server Actions, lib/queries, lib/content, components/
- Used by: End users via browser

**Server Actions (Business Logic):**
- Purpose: All mutations and form handling
- Location: `app/actions/` (top-level) and `app/[locale]/(auth)/signup/complete-profile/actions.ts`, `app/[locale]/(member)/reservations/actions.ts`
- Contains: Auth flows, billing, reservations, profile updates, admin CRUD
- Depends on: `lib/supabase/server`, `lib/supabase/admin`, `lib/stripe`, `lib/resend/emails`, `lib/utils/*`
- Used by: Page components via `useActionState` hook

**API Routes (Webhooks & Chat):**
- Purpose: External service callbacks and streaming API
- Location: `app/api/stripe/webhook/route.ts`, `app/api/chat/route.ts`, `app/auth/callback/route.ts`
- Contains: Stripe webhook handler with idempotency, OpenAI streaming chat, Supabase auth callback
- Depends on: `lib/stripe`, `lib/stripe/webhookHandlers`, `lib/supabase/admin`, `lib/chat/rate-limit`
- Used by: Stripe (webhook), ChatWidget (chat), Supabase Auth (callback)

**Library Layer (Shared Logic):**
- Purpose: Reusable modules for external service clients, queries, types, and utilities
- Location: `lib/`
- Contains: Supabase clients (server/client/admin), Stripe client, Resend email, reservation queries, type definitions, middleware helpers
- Depends on: External SDKs (`@supabase/ssr`, `stripe`, `resend`, `openai`)
- Used by: Server Actions, API Routes, Pages, Middleware

**Components (UI):**
- Purpose: Shared React components
- Location: `components/`
- Contains: Layout (Navbar, Footer), admin UI (sidebar, dialogs), public marketing components, chatbot, motion/animation wrappers, visual effects
- Depends on: `next-intl`, `motion`, `@tiptap/*` (CMS editor)
- Used by: Page components across all route groups

**i18n Configuration:**
- Purpose: Locale routing and message loading
- Location: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`
- Contains: Locale definitions (es, en), routing config, request-level message loader
- Depends on: `next-intl`
- Used by: `middleware.ts`, `next.config.ts`, all page components

## Data Flow

**User Signup:**
1. User submits `SignupForm` (`app/[locale]/(auth)/signup/SignupForm.tsx`)
2. `signUpAction` server action validates input, calls `supabase.auth.signUp()` with user metadata
3. Profile row inserted via `supabaseAdmin` (service role) since no session exists pre-confirmation
4. Redirect to `/?welcome=1` triggers `WelcomeBanner` component

**Reservation Booking:**
1. `app/[locale]/(member)/reservations/page.tsx` loads court availability via `getCourtAvailability()` from `lib/queries/reservations.ts`
2. User selects court, time slot, and booking mode via `ReservationForm` + `TimeSlotGrid` + `CourtCard`
3. `createReservationAction` validates auth, membership, booking window, conflicts, then inserts reservation
4. For non-members: returns `needsPayment: true`, triggering `PaymentPanel` which calls `createSessionPaymentAction`
5. Non-member payment: Stripe Checkout (mode: payment), webhook updates reservation status via `handleOneTimePaymentCompleted`
6. Confirmation email sent via Resend (fire-and-forget)

**Membership Subscription:**
1. User clicks plan on `PricingCards` component
2. `createCheckoutSessionAction` creates Stripe Checkout session (mode: subscription)
3. Stripe redirects to `/checkout-success?session_id=...`
4. Webhook `checkout.session.completed` fires `handleCheckoutCompleted` which upserts `memberships` row
5. Subsequent billing events (`subscription.updated`, `subscription.deleted`, `invoice.*`) sync membership state

**Admin Operations:**
1. Admin layout (`app/[locale]/(admin)/admin/layout.tsx`) performs server-side role check
2. Admin pages call server actions from `app/actions/admin/` (barrel-exported via `app/actions/admin.ts`)
3. All admin actions call `requireAdmin()` which validates `app_metadata.role === 'admin'`
4. Admin actions use both `createClient()` (user-scoped) and `supabaseAdmin` (service role) depending on operation

**AI Chatbot:**
1. `ChatWidget` component opens `ChatPanel` with streaming messages
2. `POST /api/chat` fetches CMS content blocks and upcoming events from Supabase
3. System prompt constructed with club knowledge base, then sent to OpenAI `gpt-4o-mini` with streaming
4. Rate limiting via DB-backed `chat_rate_limits` table

**State Management:**
- No client-side state library (no Redux, Zustand, etc.)
- Server state via React Server Components with direct Supabase queries
- Form state via React 19 `useActionState` hook
- Membership status cached in HMAC-signed httpOnly cookie (5-minute TTL) to avoid DB roundtrip on every protected page load

## Key Abstractions

**Supabase Client Factory:**
- Purpose: Provides context-appropriate Supabase clients
- Examples: `lib/supabase/server.ts` (cookie-based, RSC/Server Actions), `lib/supabase/client.ts` (browser), `lib/supabase/admin.ts` (service role, bypasses RLS)
- Pattern: Factory function per environment; server client requires async cookie store (Next.js 16)

**Server Actions with `useActionState`:**
- Purpose: Type-safe form mutations with progressive enhancement
- Examples: `app/actions/auth.ts`, `app/actions/reservations.ts`, `app/actions/profile.ts`
- Pattern: `(prevState: State, formData: FormData) => Promise<State>` signature; return `{ errors?, message?, success? }`

**Court Availability Engine:**
- Purpose: Generates time slots with availability from court config and existing reservations
- Examples: `lib/queries/reservations.ts` (`getCourtAvailability`, `generateTimeSlots`)
- Pattern: Fetches courts, configs, pricing, reservations in parallel; computes per-slot availability with open_play (4 spots) vs full_court modes

**Webhook Handler Pattern:**
- Purpose: Process Stripe events with idempotency
- Examples: `app/api/stripe/webhook/route.ts`, `lib/stripe/webhookHandlers.ts`
- Pattern: Signature verification -> idempotency guard via `webhook_events` table (unique constraint) -> event dispatch to typed handlers

**Admin Action Modules:**
- Purpose: Domain-organized admin server actions with barrel re-export
- Examples: `app/actions/admin/auth.ts`, `app/actions/admin/courts.ts`, `app/actions/admin/events.ts`, `app/actions/admin/cms.ts`, `app/actions/admin/users.ts`, `app/actions/admin/reservations.ts`, `app/actions/admin/stats.ts`
- Pattern: Each domain file has own `'use server'` directive; barrel file `app/actions/admin.ts` re-exports all

**CMS Content Blocks:**
- Purpose: Admin-editable bilingual content rendered on marketing pages
- Examples: `lib/content.ts` (`getContentBlocks`, `getContentBlock`)
- Pattern: Fetch by key prefix from `content_blocks` table, select locale-specific column (`content_es`/`content_en`)

## Entry Points

**Root Layout:**
- Location: `app/[locale]/layout.tsx`
- Triggers: All page renders
- Responsibilities: Font loading (Bebas Neue, Poppins, Bungee), `NextIntlClientProvider`, `MotionProvider`, `Navbar`

**Middleware:**
- Location: `middleware.ts`
- Triggers: All non-static requests
- Responsibilities: Public route bypass (skip auth for marketing pages), auth validation, admin role check, membership gating with cookie cache, i18n locale routing

**Homepage:**
- Location: `app/[locale]/page.tsx`
- Triggers: Root URL `/` or `/en`
- Responsibilities: Hero section, features, pricing plans, CTA; fetches CMS content blocks and optional user welcome banner

**Stripe Webhook:**
- Location: `app/api/stripe/webhook/route.ts`
- Triggers: Stripe event delivery
- Responsibilities: Signature verification, idempotency, event dispatch to handlers that sync membership/payment state

**Auth Callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: Supabase auth redirects (email confirmation, password reset)
- Responsibilities: Exchange auth code for session, redirect to target page

## Error Handling

**Strategy:** Return error objects from Server Actions; never throw in user-facing flows

**Patterns:**
- Server Actions return typed result objects: `{ errors?: Record<string, string>, message?: string, success?: boolean }`
- Supabase errors checked via `if (error)` pattern, mapped to user-facing error keys (e.g., `'slot_taken'`, `'beyond_booking_window'`)
- Webhook handlers throw on critical failures (returns 500 for Stripe retry), use `console.warn` for non-critical issues
- Email sending wrapped in try/catch with fire-and-forget pattern -- booking succeeds even if email fails
- DB constraint violations caught by error code (e.g., `23P01` exclusion violation, `23505` unique violation)

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` only; no structured logging framework

**Validation:**
- Server-side validation in every Server Action before DB operations
- Shared validators: `lib/utils/normalizeName.ts` (name sanitization), `lib/utils/passwordValidation.ts`
- No client-side validation library; form validation happens on submit via Server Actions

**Authentication:**
- Supabase Auth with email/password (no OAuth providers)
- JWT validated via `supabase.auth.getUser()` (server roundtrip, not session-based)
- Admin role stored in `app_metadata.role` (set via service role client)
- Three-layer admin protection: middleware check -> layout server-side check -> `requireAdmin()` in each action

**Authorization:**
- RLS on Supabase tables (users see own data)
- Service role (`supabaseAdmin`) used for cross-user operations (admin, webhooks, signup profile creation)
- Membership status gates access to `/member/*` routes (except `/reservations`)
- Reservation routes open to all authenticated users (non-members pay per session)

**Internationalization:**
- `next-intl` v4 with `[locale]` dynamic segment
- Two locales: `es` (default, no prefix), `en` (prefixed `/en/...`)
- Translation files: `messages/es.json`, `messages/en.json`
- CMS content stored with dual columns: `content_es`, `content_en`
- Emails sent in user's locale preference

---

*Architecture analysis: 2026-03-14*
