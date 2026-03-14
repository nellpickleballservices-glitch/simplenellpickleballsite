# Codebase Structure

**Analysis Date:** 2026-03-13

## Directory Layout

```
nell_pickleball_club/
├── app/                        # Next.js App Router
│   ├── [locale]/               # i18n dynamic segment (es, en)
│   │   ├── layout.tsx          # Root layout (fonts, Navbar, NextIntlClientProvider)
│   │   ├── page.tsx            # Home page (marketing landing)
│   │   ├── WelcomeBanner.tsx   # Post-signup welcome banner (co-located)
│   │   ├── (admin)/admin/      # Admin route group
│   │   │   ├── layout.tsx      # Admin layout (sidebar, Layer 2 auth check)
│   │   │   ├── page.tsx        # Admin dashboard (stats)
│   │   │   ├── cms/page.tsx    # Content management
│   │   │   ├── courts/page.tsx # Court management
│   │   │   ├── events/page.tsx # Event management
│   │   │   ├── reservations/page.tsx  # Reservation management
│   │   │   ├── stripe/page.tsx # Stripe config/status
│   │   │   └── users/page.tsx  # User management
│   │   ├── (auth)/             # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── signup/complete-profile/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── reset-password/update/page.tsx
│   │   ├── (marketing)/        # Marketing route group (has Footer, ChatWidget, MotionProvider)
│   │   │   ├── layout.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── events/page.tsx
│   │   │   ├── learn-pickleball/page.tsx
│   │   │   └── pricing/page.tsx
│   │   └── (member)/           # Member route group (requires active membership for most routes)
│   │       ├── checkout-success/page.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── dashboard/settings/page.tsx
│   │       └── reservations/page.tsx   # Open to all authenticated users
│   ├── actions/                # Server Actions (mutation layer)
│   │   ├── admin.ts            # All admin CRUD operations
│   │   ├── auth.ts             # Signup, login, logout, password reset
│   │   ├── billing.ts          # Stripe checkout/portal session creation
│   │   ├── profile.ts          # Profile updates, password changes
│   │   ├── reservations.ts     # Create/cancel reservations
│   │   └── sessionPayment.ts   # Per-session Stripe payment for non-members
│   ├── api/                    # API Route Handlers
│   │   ├── chat/route.ts       # OpenAI chatbot (SSE streaming)
│   │   └── stripe/webhook/route.ts  # Stripe webhook endpoint
│   ├── auth/callback/route.ts  # Supabase auth callback (code exchange)
│   └── globals.css             # Global styles (Tailwind imports, custom colors)
├── components/                 # Shared React components
│   ├── Navbar.tsx              # Main navigation bar
│   ├── Footer.tsx              # Site footer
│   ├── LanguageSwitcher.tsx    # Locale toggle (es/en)
│   ├── admin/                  # Admin-specific components
│   │   ├── AdminSidebar.tsx    # Admin navigation sidebar
│   │   ├── ConfirmDialog.tsx   # Confirmation modal
│   │   └── StatCard.tsx        # Dashboard stat card
│   ├── chatbot/                # AI chatbot widget components
│   │   ├── ChatWidget.tsx      # Floating chat trigger
│   │   ├── ChatPanel.tsx       # Chat conversation panel
│   │   └── ChatBubble.tsx      # Individual message bubble
│   ├── motion/                 # Animation components (Framer Motion)
│   │   ├── MotionProvider.tsx  # LazyMotion provider
│   │   ├── HeroEntrance.tsx    # Hero section entrance animation
│   │   ├── ScrollReveal.tsx    # Scroll-triggered reveal
│   │   └── StaggerChildren.tsx # Staggered child animations
│   └── public/                 # Public-facing page components
│       ├── CourtDiagram.tsx    # Court layout visualization
│       ├── EventCard.tsx       # Event display card
│       ├── MobileNav.tsx       # Mobile navigation menu
│       ├── TableOfContents.tsx # Page table of contents
│       ├── ValueTimeline.tsx   # Value proposition timeline
│       └── WhatsAppBubble.tsx  # WhatsApp floating button
├── lib/                        # Shared library code
│   ├── content.ts              # CMS content block fetching
│   ├── queries/                # Read-only data access
│   │   └── reservations.ts    # Court availability, time slots, app config
│   ├── resend/                 # Email service
│   │   ├── index.ts            # Resend client initialization
│   │   └── emails.ts           # Bilingual email templates
│   ├── stripe/                 # Stripe integration
│   │   ├── index.ts            # Stripe client initialization
│   │   └── webhookHandlers.ts  # Webhook event handlers (6 event types)
│   ├── supabase/               # Supabase client factories
│   │   ├── client.ts           # Browser client (anon key)
│   │   ├── server.ts           # Server client (anon key + cookies)
│   │   └── admin.ts            # Admin client (service role, bypasses RLS)
│   ├── types/                  # TypeScript type definitions
│   │   ├── admin.ts            # Event, ContentBlock, AdminStats, UserWithDetails
│   │   └── reservations.ts     # Reservation, Court, TimeSlot, CourtConfig types
│   └── utils/                  # Shared utility functions
│       ├── normalizeName.ts    # Name capitalization and validation
│       └── passwordValidation.ts  # Password length and match validation
├── i18n/                       # Internationalization config
│   ├── routing.ts              # Locale routing config (es default, en secondary)
│   ├── request.ts              # Per-request locale resolution
│   └── navigation.ts           # i18n-aware Link, redirect, usePathname, useRouter
├── messages/                   # Translation JSON files
│   ├── es.json                 # Spanish translations (default)
│   └── en.json                 # English translations
├── supabase/                   # Supabase project files
│   ├── functions/              # Edge Functions
│   │   └── session-reminder/index.ts  # Session end reminder emails (pg_cron triggered)
│   └── migrations/             # Database migrations (SQL)
│       ├── 0001_initial_schema.sql
│       ├── 0002_webhook_events.sql
│       ├── 0003_reservations.sql
│       ├── 0004_pg_cron_reminder.sql
│       ├── 0005_admin_events_cms.sql
│       └── 0006_footer_social_links.sql
├── tests/                      # Test files
│   ├── auth/                   # Auth-related tests
│   ├── i18n/                   # i18n-related tests
│   └── unit/                   # Unit tests
├── middleware.ts               # Auth + i18n middleware
├── next.config.ts              # Next.js config (next-intl plugin)
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Vitest config
├── playwright.config.ts        # Playwright E2E config
├── package.json                # Dependencies and scripts
└── postcss.config.mjs          # PostCSS config (Tailwind)
```

## Directory Purposes

**`app/[locale]/`:**
- Purpose: All user-facing pages, organized by role via route groups
- Contains: Server Component pages, co-located client components
- Key files: `layout.tsx` (root layout), `page.tsx` (home)

**`app/[locale]/(admin)/admin/`:**
- Purpose: Admin dashboard and management pages
- Contains: Pages for courts, events, CMS, users, reservations, Stripe
- Key files: `layout.tsx` (admin sidebar + Layer 2 auth), `page.tsx` (stats dashboard)

**`app/[locale]/(auth)/`:**
- Purpose: Authentication flows
- Contains: Login, signup, password reset pages

**`app/[locale]/(marketing)/`:**
- Purpose: Public marketing pages with shared layout (Footer, ChatWidget, MotionProvider)
- Contains: About, contact, events, learn-pickleball, pricing pages

**`app/[locale]/(member)/`:**
- Purpose: Member-only pages (gated by middleware membership check)
- Contains: Dashboard, settings, reservations, checkout success
- Note: `/reservations` route is exempt from membership gate -- open to all authenticated users

**`app/actions/`:**
- Purpose: All server-side mutations (the "write" layer)
- Contains: `'use server'` action functions grouped by domain

**`app/api/`:**
- Purpose: API route handlers for external integrations
- Contains: Stripe webhook endpoint, OpenAI chat endpoint

**`components/`:**
- Purpose: Reusable React components shared across pages
- Contains: Layout components (Navbar, Footer), domain-specific UI (admin, chatbot, motion, public)

**`lib/`:**
- Purpose: Shared business logic, service clients, types, and utilities
- Contains: Database queries, external service clients, type definitions, helper functions

**`i18n/`:**
- Purpose: Internationalization configuration
- Contains: Routing config, request-level locale resolution, i18n-aware navigation exports

**`messages/`:**
- Purpose: Translation strings for next-intl
- Contains: `es.json` (default), `en.json`

**`supabase/`:**
- Purpose: Database schema and edge functions
- Contains: SQL migrations (schema history), edge functions (session reminders)

## Key File Locations

**Entry Points:**
- `middleware.ts`: Auth + i18n middleware (processes all non-API requests)
- `app/[locale]/layout.tsx`: Root layout (fonts, providers, Navbar)
- `app/[locale]/page.tsx`: Home page

**Configuration:**
- `next.config.ts`: Next.js config with next-intl plugin
- `tsconfig.json`: TypeScript config (uses `@/` path alias for project root)
- `i18n/routing.ts`: Locale routing rules (default `es`, prefix `as-needed`)
- `vitest.config.ts`: Unit test config
- `playwright.config.ts`: E2E test config

**Core Logic:**
- `app/actions/reservations.ts`: Reservation creation with 13-step business rule validation
- `app/actions/admin.ts`: All admin CRUD operations (~900 lines)
- `lib/queries/reservations.ts`: Court availability engine (time slot generation)
- `lib/stripe/webhookHandlers.ts`: Stripe event processing (membership sync)
- `lib/content.ts`: CMS content block fetching

**Testing:**
- `tests/unit/`: Unit tests
- `tests/auth/`: Auth flow tests
- `tests/i18n/`: Internationalization tests

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Components: PascalCase (`Navbar.tsx`, `ChatWidget.tsx`, `AdminSidebar.tsx`)
- Server Actions: camelCase (`auth.ts`, `reservations.ts`, `billing.ts`)
- Library modules: camelCase (`normalizeName.ts`, `passwordValidation.ts`)
- Types: camelCase filename, PascalCase exports (`reservations.ts` exports `Reservation`, `TimeSlot`)

**Directories:**
- Route groups: parenthesized by role `(admin)`, `(auth)`, `(marketing)`, `(member)`
- Component dirs: lowercase by domain (`admin/`, `chatbot/`, `motion/`, `public/`)
- Lib dirs: lowercase by concern (`queries/`, `supabase/`, `stripe/`, `resend/`, `types/`, `utils/`)

**Functions:**
- Server Actions: `verbNounAction` pattern (`createReservationAction`, `cancelReservationAction`, `getAdminStatsAction`)
- Queries: `getEntityName` pattern (`getCourtAvailability`, `getContentBlocks`, `getAppConfigs`)
- Utilities: descriptive camelCase (`normalizeName`, `validatePasswordLength`)

## Where to Add New Code

**New Public Page:**
- Create `app/[locale]/(marketing)/page-name/page.tsx`
- Add translations to `messages/es.json` and `messages/en.json`
- The `(marketing)` layout automatically provides Footer, ChatWidget, and MotionProvider

**New Admin Page:**
- Create `app/[locale]/(admin)/admin/page-name/page.tsx`
- Add Server Action functions to `app/actions/admin.ts`
- Admin layout provides sidebar navigation and Layer 2 auth check

**New Member Page:**
- Create `app/[locale]/(member)/page-name/page.tsx`
- Middleware automatically gates access to active members
- If page should be open to all authenticated users, add exemption in `middleware.ts` `isReservationRoute` logic

**New Server Action:**
- Add to existing domain file in `app/actions/` or create new file
- Always include `'use server'` directive at top
- Always authenticate user with `supabase.auth.getUser()`
- Return `{ error?: string }` or `{ success?: boolean }` objects
- For admin actions, call `requireAdmin()` from `app/actions/admin.ts`

**New Database Query:**
- Add to `lib/queries/` (create new file if new domain)
- Use `createClient()` from `lib/supabase/server.ts` for RLS-scoped queries
- Use `supabaseAdmin` from `lib/supabase/admin.ts` only for cross-user queries

**New Component:**
- Shared components: `components/` root or appropriate subdirectory
- Page-specific components: co-locate in the page directory (e.g., `app/[locale]/(member)/reservations/CourtCard.tsx`)
- Admin components: `components/admin/`

**New Type Definition:**
- Add to existing file in `lib/types/` or create new file
- Export interfaces and type aliases with PascalCase names

**New Utility Function:**
- Add to `lib/utils/` -- one file per concern
- Export pure functions that are framework-agnostic

**New Database Migration:**
- Add to `supabase/migrations/` with sequential numbering: `0007_description.sql`

**New Translation Keys:**
- Add to both `messages/es.json` and `messages/en.json`
- Group under a namespace matching the page (e.g., `"Reservations": { ... }`)

## Special Directories

**`supabase/migrations/`:**
- Purpose: SQL migration files defining the database schema
- Generated: Manually authored
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Supabase Edge Functions (Deno runtime)
- Generated: No
- Committed: Yes
- Note: `session-reminder/` is triggered by pg_cron for session end reminders

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `next build` / `next dev`)
- Committed: No

**`.worktrees/`:**
- Purpose: Git worktree for parallel branch development
- Generated: Manual (`git worktree add`)
- Committed: Yes (worktree metadata)

**`messages/`:**
- Purpose: i18n translation JSON files
- Generated: No (manually maintained)
- Committed: Yes
- Note: Must keep `es.json` and `en.json` in sync -- same keys in both

---

*Structure analysis: 2026-03-13*
