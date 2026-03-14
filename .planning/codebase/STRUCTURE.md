# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
nell_pickleball_club/
├── app/                        # Next.js App Router
│   ├── [locale]/               # i18n dynamic segment (es default, en prefixed)
│   │   ├── (admin)/admin/      # Admin dashboard (role-gated)
│   │   │   ├── cms/            # Content management (TipTap editor)
│   │   │   ├── courts/         # Court + maintenance management
│   │   │   ├── events/         # Event CRUD
│   │   │   ├── reservations/   # All reservations view + admin booking
│   │   │   ├── stripe/         # Stripe dashboard link
│   │   │   └── users/          # User search, details, disable/enable
│   │   ├── (auth)/             # Auth pages (login, signup, reset)
│   │   │   ├── login/
│   │   │   ├── reset-password/
│   │   │   └── signup/
│   │   ├── (marketing)/        # Public marketing pages
│   │   │   ├── about/
│   │   │   ├── contact/
│   │   │   ├── events/
│   │   │   ├── learn-pickleball/
│   │   │   └── pricing/
│   │   ├── (member)/           # Authenticated member pages
│   │   │   ├── checkout-success/
│   │   │   ├── dashboard/
│   │   │   └── reservations/
│   │   ├── layout.tsx          # Root layout (fonts, providers, Navbar)
│   │   ├── page.tsx            # Homepage
│   │   └── WelcomeBanner.tsx   # Post-signup welcome banner
│   ├── actions/                # Server Actions (mutations)
│   │   ├── admin.ts            # Barrel re-export for admin actions
│   │   ├── admin/              # Admin action modules by domain
│   │   │   ├── auth.ts         # requireAdmin() guard
│   │   │   ├── cms.ts          # Content block CRUD
│   │   │   ├── courts.ts       # Court management
│   │   │   ├── events.ts       # Event management
│   │   │   ├── reservations.ts # Admin reservation management
│   │   │   ├── stats.ts        # Dashboard statistics
│   │   │   └── users.ts        # User management
│   │   ├── auth.ts             # Signup, login, logout, password reset
│   │   ├── billing.ts          # Stripe checkout + portal sessions
│   │   ├── profile.ts          # Profile update, password change
│   │   ├── reservations.ts     # Create/cancel reservations
│   │   └── sessionPayment.ts   # Per-session Stripe payment
│   ├── api/                    # API routes
│   │   ├── chat/route.ts       # OpenAI chatbot (streaming SSE)
│   │   └── stripe/webhook/route.ts  # Stripe webhook handler
│   ├── auth/callback/route.ts  # Supabase auth callback
│   └── globals.css             # Global styles (Tailwind)
├── components/                 # Shared React components
│   ├── admin/                  # Admin UI components
│   │   ├── AdminSidebar.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── StatCard.tsx
│   ├── chatbot/                # AI chatbot widget
│   │   ├── ChatBubble.tsx
│   │   ├── ChatPanel.tsx
│   │   └── ChatWidget.tsx
│   ├── effects/                # Visual effect components
│   │   ├── AnimatedAccents.tsx
│   │   ├── FloatingParticles.tsx
│   │   ├── GlowButton.tsx
│   │   ├── GlowCard.tsx
│   │   ├── GrainOverlay.tsx
│   │   ├── HeroVideo.tsx
│   │   └── SubpageHeroAccents.tsx
│   ├── motion/                 # Animation wrappers (Motion library)
│   │   ├── HeroEntrance.tsx
│   │   ├── MotionProvider.tsx
│   │   ├── ScrollReveal.tsx
│   │   └── StaggerChildren.tsx
│   ├── public/                 # Public-facing reusable components
│   │   ├── CourtDiagram.tsx
│   │   ├── EventCard.tsx
│   │   ├── MobileNav.tsx
│   │   ├── NavLink.tsx
│   │   ├── TableOfContents.tsx
│   │   ├── ValueTimeline.tsx
│   │   └── WhatsAppBubble.tsx
│   ├── Footer.tsx
│   ├── LanguageSwitcher.tsx
│   └── Navbar.tsx
├── i18n/                       # Internationalization config
│   ├── navigation.ts           # Locale-aware navigation helpers
│   ├── request.ts              # Per-request locale + message loading
│   └── routing.ts              # Locale definitions and routing config
├── lib/                        # Shared library code
│   ├── chat/
│   │   └── rate-limit.ts       # DB-backed chat rate limiting
│   ├── content.ts              # CMS content block fetching
│   ├── middleware/
│   │   ├── cookie-signing.ts   # HMAC-signed membership cookie cache
│   │   └── route-helpers.ts    # Route classification functions
│   ├── queries/
│   │   └── reservations.ts     # Court availability engine
│   ├── resend/
│   │   ├── emails.ts           # Email templates (confirmation, reminder)
│   │   └── index.ts            # Resend client instance
│   ├── stripe/
│   │   ├── index.ts            # Stripe client instance
│   │   └── webhookHandlers.ts  # Stripe event handler functions
│   ├── supabase/
│   │   ├── admin.ts            # Service role client (bypasses RLS)
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server Component / Server Action client
│   ├── types/
│   │   ├── admin.ts            # Admin domain types (Event, ContentBlock, etc.)
│   │   └── reservations.ts     # Reservation domain types (Court, TimeSlot, etc.)
│   └── utils/
│       ├── normalizeName.ts    # Name sanitization and validation
│       └── passwordValidation.ts  # Password validation helpers
├── messages/                   # Translation JSON files
│   ├── en.json
│   └── es.json
├── public/                     # Static assets
│   ├── images/
│   └── videos/
├── supabase/                   # Supabase project config
│   ├── functions/              # Edge Functions
│   │   └── session-reminder/   # Cron-triggered session reminder
│   └── migrations/             # SQL migrations (7 files)
├── tests/                      # Test files
│   ├── auth/
│   ├── i18n/
│   └── unit/
├── middleware.ts                # Next.js middleware entry point
├── next.config.ts               # Next.js config (next-intl plugin)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

## Directory Purposes

**`app/[locale]/`:**
- Purpose: All user-facing pages organized by access level via route groups
- Contains: Server Component pages, co-located client form components
- Key files: `layout.tsx` (root layout), `page.tsx` (homepage)

**`app/[locale]/(admin)/admin/`:**
- Purpose: Admin dashboard with sidebar layout
- Contains: CRUD pages for courts, events, CMS content, users, reservations
- Key files: `layout.tsx` (admin layout with role check + sidebar)

**`app/[locale]/(auth)/`:**
- Purpose: Authentication pages (no special layout beyond root)
- Contains: Login, signup (with complete-profile step), password reset flows

**`app/[locale]/(marketing)/`:**
- Purpose: Public-facing marketing pages with Footer + ChatWidget
- Contains: About, contact, events, learn-pickleball, pricing pages
- Key files: `layout.tsx` (adds Footer + ChatWidget)

**`app/[locale]/(member)/`:**
- Purpose: Authenticated member pages
- Contains: Dashboard (membership card, reservation history, settings), reservation booking, checkout success

**`app/actions/`:**
- Purpose: All Server Action functions grouped by domain
- Contains: Auth, billing, profile, reservations, session payment, admin (subdirectory)
- Key files: `admin.ts` (barrel re-export of all admin actions)

**`app/actions/admin/`:**
- Purpose: Admin-only Server Actions separated by domain
- Contains: 7 domain files each with `'use server'` directive

**`app/api/`:**
- Purpose: API route handlers for external integrations
- Contains: Stripe webhook endpoint, OpenAI chat streaming endpoint

**`components/`:**
- Purpose: Shared React components used across multiple pages
- Contains: Layout components, admin UI, chatbot, visual effects, motion wrappers, public components

**`lib/`:**
- Purpose: Non-component shared code -- clients, queries, types, utilities
- Contains: Service client factories, business logic queries, type definitions, helper functions

**`i18n/`:**
- Purpose: next-intl configuration
- Contains: Routing config, request config, navigation helpers

**`supabase/`:**
- Purpose: Supabase project configuration and migrations
- Contains: SQL migration files (schema), Edge Functions (session reminder cron)

**`messages/`:**
- Purpose: Translation strings for UI text
- Contains: `en.json` and `es.json` with matching key structures

## Key File Locations

**Entry Points:**
- `middleware.ts`: Request interceptor -- auth, membership, i18n
- `app/[locale]/layout.tsx`: Root layout with fonts and providers
- `app/[locale]/page.tsx`: Homepage
- `next.config.ts`: Next.js configuration (next-intl plugin only)

**Configuration:**
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `vitest.config.ts`: Vitest test runner config
- `playwright.config.ts`: E2E test config
- `i18n/routing.ts`: Locale definitions (`es` default, `en`)
- `postcss.config.mjs`: PostCSS with Tailwind

**Core Logic:**
- `app/actions/reservations.ts`: Reservation creation with conflict detection, membership checks, advance booking window
- `app/actions/billing.ts`: Stripe Checkout session creation for subscriptions
- `app/actions/sessionPayment.ts`: Stripe Checkout for per-session payments
- `lib/queries/reservations.ts`: Court availability computation engine
- `lib/stripe/webhookHandlers.ts`: Stripe event handlers syncing membership state
- `lib/middleware/cookie-signing.ts`: HMAC-signed membership cookie cache

**Supabase Clients:**
- `lib/supabase/server.ts`: Use in Server Components and Server Actions
- `lib/supabase/client.ts`: Use in Client Components (browser)
- `lib/supabase/admin.ts`: Use for admin operations that bypass RLS (webhooks, signup profile creation)

**Testing:**
- `tests/unit/`: Unit tests
- `tests/auth/`: Auth flow tests
- `tests/i18n/`: i18n tests

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Server Actions: `camelCase.ts` (e.g., `sessionPayment.ts`, `reservations.ts`)
- Components: `PascalCase.tsx` (e.g., `ReservationForm.tsx`, `CourtCard.tsx`)
- Lib modules: `camelCase.ts` (e.g., `webhookHandlers.ts`, `cookie-signing.ts`)
- Types: `camelCase.ts` in `lib/types/` (e.g., `reservations.ts`, `admin.ts`)

**Directories:**
- Route groups: `(groupName)` with parentheses (Next.js convention)
- Feature directories: `kebab-case` (e.g., `learn-pickleball`, `reset-password`)
- Lib subdirectories: `kebab-case` (e.g., `cookie-signing`)
- Component subdirectories: `lowercase` (e.g., `admin`, `chatbot`, `effects`, `motion`, `public`)

**Co-located Components:**
- Form components live next to their page: e.g., `app/[locale]/(auth)/login/LoginForm.tsx` alongside `page.tsx`
- This pattern applies to admin pages, auth pages, member pages

## Where to Add New Code

**New Marketing Page:**
- Page: `app/[locale]/(marketing)/[page-name]/page.tsx`
- Inherits Footer + ChatWidget from `app/[locale]/(marketing)/layout.tsx`
- Add translation keys to `messages/en.json` and `messages/es.json`

**New Admin Section:**
- Page: `app/[locale]/(admin)/admin/[section-name]/page.tsx`
- Server Actions: `app/actions/admin/[section-name].ts` (add `'use server'` directive)
- Re-export from barrel: `app/actions/admin.ts`
- Add sidebar link: `components/admin/AdminSidebar.tsx`

**New Member Feature:**
- Page: `app/[locale]/(member)/[feature-name]/page.tsx`
- Co-located client components in same directory
- Server Actions: `app/actions/[feature-name].ts`

**New Server Action:**
- Create `app/actions/[domain].ts` with `'use server'` at top
- For admin actions: create `app/actions/admin/[domain].ts` and add re-export to `app/actions/admin.ts`
- Follow pattern: `(prevState: State, formData: FormData) => Promise<State>`

**New Shared Component:**
- Layout/global: `components/[ComponentName].tsx`
- Admin-only: `components/admin/[ComponentName].tsx`
- Public/marketing: `components/public/[ComponentName].tsx`
- Visual effects: `components/effects/[ComponentName].tsx`
- Animation wrappers: `components/motion/[ComponentName].tsx`

**New Library Module:**
- Service client: `lib/[service-name]/index.ts`
- Query functions: `lib/queries/[domain].ts`
- Type definitions: `lib/types/[domain].ts`
- Utility functions: `lib/utils/[utilName].ts`

**New Database Migration:**
- Create `supabase/migrations/NNNN_description.sql` (increment from `0007`)

**New API Route:**
- Create `app/api/[route-name]/route.ts`
- Use `export async function POST/GET(request: Request)` pattern

## Special Directories

**`.planning/`:**
- Purpose: Project planning documents, milestones, debug logs
- Generated: Manually by developers/AI
- Committed: Yes

**`.worktrees/`:**
- Purpose: Git worktree for parallel branch development
- Generated: Yes (via `git worktree`)
- Committed: Worktree config committed; contents are branch-specific

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Generated: No (hand-written SQL)
- Committed: Yes
- Contains 7 migration files covering: initial schema, webhook events, reservations, pg_cron reminders, admin/events/CMS, footer social links, admin views/RPC/rate limiting

**`supabase/functions/`:**
- Purpose: Supabase Edge Functions (Deno runtime)
- Contains: `session-reminder/` -- cron-triggered function for session end reminders
- Generated: No
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at root URL
- Contains: `images/` and `videos/` directories
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `next build` / `next dev`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-03-14*
