# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
nell_pickleball_club/
├── app/                        # Next.js App Router (pages, actions, API routes)
│   ├── [locale]/               # Locale-prefixed route segment (es default, en explicit)
│   │   ├── (admin)/admin/      # Admin panel pages
│   │   ├── (auth)/             # Login, signup, password reset
│   │   ├── (marketing)/        # Public pages (about, contact, events, pricing, learn)
│   │   ├── (member)/           # Member pages (dashboard, reservations, settings)
│   │   ├── layout.tsx          # Root layout (fonts, i18n provider, Navbar)
│   │   ├── page.tsx            # Homepage
│   │   └── WelcomeBanner.tsx   # Post-signup welcome banner
│   ├── actions/                # Server Actions (mutations)
│   ├── api/                    # API routes (webhooks, chat)
│   ├── assets/                 # Static images and videos
│   ├── auth/callback/          # Supabase auth callback handler
│   └── globals.css             # Global Tailwind styles
├── components/                 # Shared React components
│   ├── admin/                  # Admin-specific components
│   ├── chatbot/                # AI chatbot widget
│   ├── effects/                # Visual effects (grain, particles, glow)
│   ├── motion/                 # Framer Motion wrappers
│   └── public/                 # Public page components
├── i18n/                       # Internationalization config
├── lib/                        # Shared utilities and integrations
│   ├── queries/                # Data fetching functions
│   ├── resend/                 # Email service integration
│   ├── stripe/                 # Stripe SDK and webhook handlers
│   ├── supabase/               # Supabase client factories
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Validation and helper utilities
├── messages/                   # i18n translation JSON files
├── supabase/                   # Supabase project config
│   ├── functions/              # Edge Functions (session reminders)
│   └── migrations/             # SQL migration files (0001-0006)
├── tests/                      # Test files
│   ├── auth/                   # Auth flow tests
│   ├── i18n/                   # Internationalization tests
│   └── unit/                   # Unit tests
├── middleware.ts               # Auth, i18n, route protection middleware
├── next.config.ts              # Next.js config (next-intl plugin)
├── tsconfig.json               # TypeScript config with @/ path alias
├── vitest.config.ts            # Vitest test runner config
└── playwright.config.ts        # Playwright E2E test config
```

## Directory Purposes

**`app/[locale]/`:**
- Purpose: All user-facing pages organized by route group
- Contains: Page components (Server Components), co-located client components
- Key files: `layout.tsx` (root layout), `page.tsx` (homepage)

**`app/[locale]/(admin)/admin/`:**
- Purpose: Admin panel with sidebar navigation
- Contains: Dashboard, user management, court management, reservation management, CMS, events, Stripe dashboard
- Key files: `layout.tsx` (admin layout with sidebar + role check), `page.tsx` (dashboard with stats)
- Sub-pages: `users/`, `courts/`, `reservations/`, `cms/`, `events/`, `stripe/`

**`app/[locale]/(auth)/`:**
- Purpose: Authentication flows
- Contains: Login, signup (with complete-profile step), password reset
- Key files: `login/page.tsx`, `signup/page.tsx`, `signup/complete-profile/page.tsx`

**`app/[locale]/(marketing)/`:**
- Purpose: Public-facing marketing pages with animations
- Contains: About, contact, events listing, learn-pickleball guide, pricing
- Key files: `layout.tsx` (wraps children with MotionProvider, Footer, ChatWidget)

**`app/[locale]/(member)/`:**
- Purpose: Authenticated member area
- Contains: Member dashboard, court reservations, account settings, checkout success
- Key files: `dashboard/page.tsx`, `reservations/page.tsx`

**`app/actions/`:**
- Purpose: All Server Action functions organized by domain
- Contains: Six action files covering auth, billing, reservations, session payments, profile, admin
- Key files:
  - `auth.ts` - signup, login, logout, password reset
  - `billing.ts` - Stripe checkout/portal session creation
  - `reservations.ts` - create/cancel reservations
  - `sessionPayment.ts` - non-member per-session Stripe payment
  - `profile.ts` - update profile, change password
  - `admin.ts` - all admin operations (stats, users, courts, events, CMS, reservations)

**`app/api/`:**
- Purpose: HTTP API endpoints for webhooks and streaming
- Contains: Stripe webhook handler, AI chat endpoint
- Key files: `stripe/webhook/route.ts`, `chat/route.ts`

**`components/`:**
- Purpose: Reusable React components shared across pages
- Contains: Layout components, admin components, chatbot, visual effects, motion wrappers
- Key files:
  - `Navbar.tsx` - Global navigation bar
  - `Footer.tsx` - Site footer
  - `LanguageSwitcher.tsx` - es/en toggle
  - `admin/AdminSidebar.tsx` - Admin navigation sidebar
  - `admin/ConfirmDialog.tsx` - Reusable confirmation modal
  - `admin/StatCard.tsx` - Dashboard stat display card
  - `chatbot/ChatWidget.tsx` - AI chatbot entry point
  - `effects/GrainOverlay.tsx`, `effects/FloatingParticles.tsx`, `effects/GlowButton.tsx` - Visual effects
  - `motion/MotionProvider.tsx`, `motion/ScrollReveal.tsx`, `motion/HeroEntrance.tsx` - Animation wrappers
  - `public/CourtDiagram.tsx`, `public/ValueTimeline.tsx`, `public/EventCard.tsx` - Marketing page components

**`lib/`:**
- Purpose: Shared business logic, integrations, types, and utilities
- Contains: Database query functions, service SDK wrappers, TypeScript types, validation helpers

**`lib/queries/`:**
- Purpose: Read-only data fetching with business logic
- Key files: `reservations.ts` (court availability computation with time slot generation)

**`lib/supabase/`:**
- Purpose: Supabase client factories for different security contexts
- Key files:
  - `server.ts` - Server-side client (cookies, respects RLS)
  - `client.ts` - Browser client (cookies, respects RLS)
  - `admin.ts` - Service-role client (bypasses RLS, server-only)

**`lib/stripe/`:**
- Purpose: Stripe SDK configuration and webhook event handlers
- Key files:
  - `index.ts` - Stripe client singleton
  - `webhookHandlers.ts` - Handlers for 6 webhook event types

**`lib/resend/`:**
- Purpose: Email delivery via Resend
- Key files:
  - `index.ts` - Resend client singleton
  - `emails.ts` - Bilingual email templates (confirmation, reminder)

**`lib/types/`:**
- Purpose: TypeScript type definitions matching database schema
- Key files:
  - `reservations.ts` - Reservation, Court, CourtConfig, TimeSlot, etc.
  - `admin.ts` - Event, ContentBlock, AdminStats, UserWithDetails

**`lib/utils/`:**
- Purpose: Pure utility functions
- Key files:
  - `normalizeName.ts` - Name normalization and validation
  - `passwordValidation.ts` - Password length and match validation

**`i18n/`:**
- Purpose: next-intl internationalization configuration
- Key files:
  - `routing.ts` - Locale config (es default, en explicit, `as-needed` prefix)
  - `request.ts` - Server-side locale resolution and message loading
  - `navigation.ts` - Locale-aware Link, redirect, usePathname, useRouter exports

**`messages/`:**
- Purpose: Static translation strings
- Key files: `es.json`, `en.json`

**`supabase/`:**
- Purpose: Database schema and edge functions
- Contains: SQL migrations, Deno edge functions
- Key files:
  - `migrations/0001_initial_schema.sql` - Core tables (profiles, locations, courts, memberships, reservations, events, content_blocks)
  - `migrations/0002_webhook_events.sql` - Stripe webhook deduplication table
  - `migrations/0003_reservations.sql` - Booking modes, court_config, court_pricing, exclusion constraints, seed data
  - `migrations/0004_pg_cron_reminder.sql` - Scheduled session reminder
  - `migrations/0005_admin_events_cms.sql` - Event types, CMS enhancements
  - `migrations/0006_footer_social_links.sql` - Footer social media links
  - `functions/session-reminder/index.ts` - Edge function for reminder emails

## Key File Locations

**Entry Points:**
- `middleware.ts`: Auth, i18n, and route protection middleware
- `app/[locale]/layout.tsx`: Root layout with fonts, Navbar, i18n provider
- `app/[locale]/page.tsx`: Homepage
- `next.config.ts`: Next.js configuration (next-intl plugin)

**Configuration:**
- `tsconfig.json`: TypeScript config (includes `@/*` path alias mapping to `./*`)
- `vitest.config.ts`: Unit test runner config
- `playwright.config.ts`: E2E test config
- `postcss.config.mjs`: PostCSS with Tailwind CSS v4
- `.env.local`: Environment variables (exists, not committed)
- `.env.local.example`: Template for required env vars

**Core Logic:**
- `app/actions/reservations.ts`: Full reservation create/cancel logic with 13-step validation
- `app/actions/admin.ts`: All admin operations (~900 lines, largest action file)
- `lib/queries/reservations.ts`: Court availability engine with time slot generation
- `lib/stripe/webhookHandlers.ts`: Membership lifecycle via Stripe webhook processing
- `lib/content.ts`: CMS content block fetching by prefix/key

**Authentication:**
- `middleware.ts`: JWT validation, route protection, membership gate
- `app/actions/auth.ts`: Signup, login, logout, password reset actions
- `app/auth/callback/route.ts`: OAuth/magic-link code exchange
- `lib/supabase/admin.ts`: Admin role assignment, service-role client

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Server Actions: `camelCase.ts` (e.g., `sessionPayment.ts`)
- Co-located components: `PascalCase.tsx` (e.g., `ReservationForm.tsx`, `CourtCard.tsx`)
- Shared components: `PascalCase.tsx` (e.g., `Navbar.tsx`, `AdminSidebar.tsx`)
- Lib modules: `camelCase.ts` (e.g., `passwordValidation.ts`, `normalizeName.ts`)
- Types: `camelCase.ts` (e.g., `reservations.ts`, `admin.ts`)
- SQL migrations: `NNNN_snake_case.sql` (e.g., `0001_initial_schema.sql`)

**Directories:**
- Route groups: `(lowercase)` with parentheses (e.g., `(admin)`, `(marketing)`)
- Feature directories: `lowercase` (e.g., `courts`, `reservations`, `chatbot`)
- Lib subdirectories: `lowercase` (e.g., `queries`, `types`, `utils`)

## Where to Add New Code

**New Public Marketing Page:**
- Page: `app/[locale]/(marketing)/[page-name]/page.tsx`
- Components: `components/public/[ComponentName].tsx` if reusable
- Translations: Add keys to `messages/es.json` and `messages/en.json`
- CMS content: Add `content_blocks` rows with prefix matching the page

**New Admin Feature:**
- Page: `app/[locale]/(admin)/admin/[feature-name]/page.tsx`
- Co-located components: same directory as page (e.g., `[feature-name]/FeatureForm.tsx`)
- Server Actions: Add functions to `app/actions/admin.ts` (guard with `await requireAdmin()`)
- Types: Add to `lib/types/admin.ts`

**New Server Action (non-admin):**
- Create or extend file in `app/actions/[domain].ts`
- Follow pattern: authenticate with `getUser()`, validate input, query/mutate via Supabase, return `{ success?, error? }`

**New Database Table:**
- Create migration: `supabase/migrations/NNNN_description.sql`
- Enable RLS, create policies matching existing patterns
- Add TypeScript types to `lib/types/[domain].ts`

**New Shared Component:**
- Reusable UI: `components/[ComponentName].tsx`
- Admin-specific: `components/admin/[ComponentName].tsx`
- Visual effects: `components/effects/[ComponentName].tsx`
- Animation wrappers: `components/motion/[ComponentName].tsx`

**New External Integration:**
- SDK client: `lib/[service-name]/index.ts`
- Business logic: `lib/[service-name]/[handlers].ts`
- Types: `lib/types/[service-name].ts`

**New API Route:**
- Location: `app/api/[endpoint-name]/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`

**New Utility Function:**
- Location: `lib/utils/[utilityName].ts`
- Keep pure (no side effects, no imports from Supabase/Stripe)

**New Query/Data Fetching:**
- Location: `lib/queries/[domain].ts`
- Use `createClient()` from `lib/supabase/server.ts`
- Call from Server Components only

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No (in `.gitignore`)

**`.planning/`:**
- Purpose: Project planning artifacts, milestones, debug logs, codebase analysis
- Generated: No (manually maintained)
- Committed: Yes

**`.worktrees/`:**
- Purpose: Git worktree for parallel branch development
- Contains: `admin-court-enhancements/` branch worktree
- Generated: Via `git worktree add`
- Committed: Partially (`.git` file references)

**`supabase/migrations/`:**
- Purpose: Database schema versioning (run in order)
- Generated: No (manually authored)
- Committed: Yes

**`app/assets/`:**
- Purpose: Static images and videos for the site
- Contains: `images/`, `videos/`
- Generated: No
- Committed: Yes (recently added, currently untracked)

---

*Structure analysis: 2026-03-14*
