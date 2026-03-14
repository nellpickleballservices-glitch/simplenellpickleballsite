# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (strict mode enabled in `tsconfig.json`)

**Secondary:**
- SQL (PostgreSQL) - Database migrations in `supabase/migrations/`
- TypeScript (Deno runtime) - Supabase Edge Functions in `supabase/functions/`

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version` file)
- Deno - Used by Supabase Edge Functions (`supabase/functions/session-reminder/index.ts`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework (App Router)
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering

**Internationalization:**
- next-intl 4.8.3 - Locale routing, message loading, navigation helpers
  - Config: `next.config.ts` (wraps with `createNextIntlPlugin`)
  - Routing: `i18n/routing.ts` (locales: `es`, `en`; default: `es`; prefix: `as-needed`)
  - Request config: `i18n/request.ts`
  - Navigation exports: `i18n/navigation.ts`
  - Message files: `messages/en.json`, `messages/es.json`

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS
- PostCSS 8.5.8 - CSS processing via `postcss.config.mjs`
- `@tailwindcss/postcss` 4.2.1 - Tailwind v4 PostCSS plugin

**Animation:**
- Motion (Framer Motion) 12.36.0 - Animations and transitions
  - Components: `components/motion/` and `components/effects/`

**Rich Text Editing:**
- TipTap 3.20.1 - Admin CMS content editor
  - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
  - Used in: `app/[locale]/(admin)/admin/cms/ContentEditor.tsx`

**Testing:**
- Vitest 4.0.18 - Unit test runner
  - Config: `vitest.config.ts`
  - UI: `@vitest/ui` 4.0.18
- Playwright 1.58.2 - E2E test runner
  - Config: `playwright.config.ts`
  - Browser: Chromium only

**Build/Dev:**
- TypeScript compiler - Type checking (target: ES2017, module: ESNext, bundler resolution)
- Next.js built-in bundler (Turbopack)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.98.0 - Supabase client for database, auth, and storage
- `@supabase/ssr` 0.9.0 - Server-side Supabase client with cookie-based auth for Next.js
- `stripe` 20.4.1 - Stripe SDK for payments and subscriptions (API version: `2026-02-25.clover`)
- `openai` 6.27.0 - OpenAI SDK for chatbot (model: `gpt-4o-mini`)
- `resend` 6.9.3 - Transactional email service

**Infrastructure:**
- `next-intl` 4.8.3 - i18n routing and translations (Spanish default, English secondary)
- `motion` 12.36.0 - Animation library (page transitions, scroll reveals, particles)

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Strict mode enabled
- Path alias: `@/*` maps to project root `"./*"`
- Excludes `supabase/functions` from compilation (Deno runtime)

**Environment:**
- `.env.local` - Local environment variables (gitignored)
- `.env.local.example` - Template with required variable names
- Required env vars (from `.env.local.example` and code analysis):
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
  - `SUPABASE_SERVICE_ROLE_KEY` - Server-only admin key (bypasses RLS)
  - `STRIPE_SECRET_KEY` - Stripe API key (server-only)
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
  - `STRIPE_PRICE_ID_VIP` - Stripe Price ID for VIP plan
  - `STRIPE_PRICE_ID_BASIC` - Stripe Price ID for Basic plan
  - `OPENAI_API_KEY` - OpenAI API key for chatbot
  - `RESEND_API_KEY` - Resend email API key
  - `NEXT_PUBLIC_SITE_URL` - Production site URL (fallback for origin detection)

**Build:**
- `next.config.ts` - Minimal; wraps with next-intl plugin
- `postcss.config.mjs` - Tailwind CSS v4 PostCSS plugin
- `vitest.config.ts` - Node environment, path aliases, unit test glob
- `playwright.config.ts` - Chromium-only, base URL localhost:3000

## NPM Scripts

```bash
npm run dev              # next dev (development server)
npm run build            # next build (production build)
npm run start            # next start (production server)
npm run lint             # next lint (ESLint)
npm run test             # vitest run (all unit tests)
npm run test:unit        # vitest run tests/unit
npm run test:e2e         # playwright test
```

## Platform Requirements

**Development:**
- Node.js (LTS recommended, exact version not pinned)
- npm
- Supabase project (cloud-hosted PostgreSQL)
- Stripe account with configured products/prices
- OpenAI API key
- Resend account

**Production:**
- Next.js-compatible hosting (Vercel assumed based on framework)
- Supabase (managed PostgreSQL + Auth + Edge Functions)
- Stripe (payments, subscriptions, billing portal)
- Resend (transactional email)
- OpenAI API (chatbot)

---

*Stack analysis: 2026-03-14*
