# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript ^5.9.3 - All application code (strict mode enabled in `tsconfig.json`)

**Secondary:**
- SQL (PostgreSQL) - Database migrations in `supabase/migrations/`
- CSS (Tailwind v4) - Styling via `app/globals.css`

## Runtime

**Environment:**
- Node.js (version not pinned, no `.nvmrc` present)
- Deno - Supabase Edge Functions (`supabase/functions/session-reminder/index.ts`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

**Module System:**
- ESM (`"type": "module"` in `package.json`)

## Frameworks

**Core:**
- Next.js ^16.1.6 - Full-stack React framework (App Router)
- React ^19.2.4 - UI library
- React DOM ^19.2.4 - DOM rendering

**Internationalization:**
- next-intl ^4.8.3 - i18n with locale routing, message files, server/client providers
  - Config: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`
  - Locales: `es` (default), `en`
  - Locale prefix: `as-needed` (no prefix for `es`, `/en/` prefix for English)
  - Messages: `messages/es.json`, `messages/en.json`

**Testing:**
- Vitest ^4.0.18 - Unit tests (config: `vitest.config.ts`)
- Playwright ^1.58.2 - E2E tests (config: `playwright.config.ts`)

**Build/Dev:**
- PostCSS ^8.5.8 - CSS processing (`postcss.config.mjs`)
- Tailwind CSS ^4.2.1 - Utility-first CSS (via `@tailwindcss/postcss` plugin)
- TypeScript ^5.9.3 - Type checking (config: `tsconfig.json`, target ES2017)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.98.0 - Supabase client (database, auth, realtime)
- `@supabase/ssr` ^0.9.0 - Server-side Supabase client for Next.js (cookie-based auth)
- `stripe` ^20.4.1 - Stripe payments SDK (subscriptions + one-time payments)
- `resend` ^6.9.3 - Transactional email service
- `openai` ^6.27.0 - OpenAI API client for AI chatbot ("Nelly")

**UI/UX:**
- `motion` ^12.36.0 - Animation library (formerly Framer Motion)
- `@tiptap/react` ^3.20.1 - Rich text editor (admin CMS)
- `@tiptap/starter-kit` ^3.20.1 - TipTap editor preset
- `@tiptap/pm` ^3.20.1 - ProseMirror core for TipTap

**Fonts (Google Fonts via next/font):**
- Bebas Neue - Display font (`--font-bebas-neue`)
- Poppins - Body font (`--font-poppins`, default)
- Bungee - Accent font (`--font-bungee`)

## Configuration

**Environment:**
- `.env.local` - Local environment variables (gitignored)
- `.env.local.example` - Template with required var names
- Required env vars:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (public)
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server only)
  - `STRIPE_SECRET_KEY` - Stripe server key
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification
  - `STRIPE_PRICE_ID_VIP` - Stripe price ID for VIP plan
  - `STRIPE_PRICE_ID_BASIC` - Stripe price ID for Basic plan
  - `RESEND_API_KEY` - Resend email service key
  - `OPENAI_API_KEY` - OpenAI API key for chatbot
  - `MEMBERSHIP_COOKIE_SECRET` - HMAC signing key for membership cache cookie
  - `NEXT_PUBLIC_SITE_URL` - Site URL fallback for Stripe redirect URLs

**Build:**
- `next.config.ts` - Next.js config (wraps next-intl plugin)
- `tsconfig.json` - TypeScript config (strict, bundler module resolution)
- `postcss.config.mjs` - PostCSS with Tailwind plugin
- `vitest.config.ts` - Vitest unit test config
- `playwright.config.ts` - Playwright E2E config

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)

## Scripts

```bash
npm run dev          # next dev (development server)
npm run build        # next build (production build)
npm run start        # next start (production server)
npm run lint         # next lint
npm run test         # vitest run (all unit tests)
npm run test:unit    # vitest run tests/unit
npm run test:e2e     # playwright test
```

## Platform Requirements

**Development:**
- Node.js (modern LTS recommended, no version pinned)
- npm
- Supabase project (hosted or local via Supabase CLI)
- Stripe account with test keys
- Resend account with API key
- OpenAI API key

**Production:**
- Vercel (Next.js deployment target, inferred from framework)
- Supabase (hosted PostgreSQL + Auth + Edge Functions + Realtime)
- Stripe (payment processing)
- Resend (transactional emails)

**Database Extensions (PostgreSQL):**
- `btree_gist` - Required for reservation exclusion constraints
- `pg_cron` - Scheduled cron jobs (session reminders)
- `pg_net` - HTTP requests from PostgreSQL (invoke Edge Functions)
- Supabase Vault - Secret storage for cron job credentials

---

*Stack analysis: 2026-03-14*
