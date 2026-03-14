# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- TypeScript ^5.9.3 - All application code (frontend, server actions, API routes, config files)

**Secondary:**
- SQL - Database migrations in `supabase/migrations/*.sql`
- TypeScript (Deno) - Supabase Edge Functions in `supabase/functions/session-reminder/index.ts`

## Runtime

**Environment:**
- Node.js (version not pinned, no `.nvmrc` or `.node-version` file)
- Deno - Supabase Edge Functions runtime (`Deno.serve()` pattern)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js ^16.1.6 - Full-stack React framework (App Router)
- React ^19.2.4 - UI library
- React DOM ^19.2.4 - DOM rendering

**Internationalization:**
- next-intl ^4.8.3 - i18n routing and translations (Spanish default, English secondary)
  - Config: `next.config.ts` wraps export with `createNextIntlPlugin`
  - Routing: `i18n/routing.ts` - locales `['es', 'en']`, defaultLocale `'es'`, localePrefix `'as-needed'`
  - Messages: `messages/es.json`, `messages/en.json`
  - Navigation: `i18n/navigation.ts`
  - Request handler: `i18n/request.ts`

**Styling:**
- Tailwind CSS ^4.2.1 - Utility-first CSS framework
- @tailwindcss/postcss ^4.2.1 - PostCSS plugin (Tailwind v4 pattern)
- PostCSS ^8.5.8 - CSS processing
  - Config: `postcss.config.mjs`

**Animation:**
- Motion ^12.36.0 (Framer Motion successor) - UI animations
  - Components: `components/motion/`

**Rich Text:**
- @tiptap/react ^3.20.1 - Rich text editor (admin CMS)
- @tiptap/starter-kit ^3.20.1 - Default TipTap extensions
- @tiptap/pm ^3.20.1 - ProseMirror bindings

**Testing:**
- Vitest ^4.0.18 - Unit test runner
  - Config: `vitest.config.ts` - environment `node`, tests in `tests/unit/**/*.test.ts`
  - UI: @vitest/ui ^4.0.18
- Playwright ^1.58.2 - E2E testing
  - Config: `playwright.config.ts` - Chromium only, baseURL `http://localhost:3000`

**Build/Dev:**
- next dev / next build / next start - Development, build, production server

## Key Dependencies

**Critical:**
- @supabase/ssr ^0.9.0 - Server-side Supabase client (cookie-based auth for SSR)
- @supabase/supabase-js ^2.98.0 - Supabase JavaScript client
- stripe ^20.4.1 - Stripe payment processing (API version `2026-02-25.clover`)
- openai ^6.27.0 - OpenAI API client for AI chatbot ("Nelly")
- resend ^6.9.3 - Transactional email service

**Infrastructure:**
- next-intl ^4.8.3 - Internationalization layer (deeply integrated into routing)

## Configuration

**Environment:**
- `.env.local` - Local environment variables (gitignored)
- `.env.local.example` - Template showing required variables
- Required env vars (from code analysis):
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only, bypasses RLS)
  - `STRIPE_SECRET_KEY` - Stripe API secret key
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification secret
  - `STRIPE_PRICE_ID_VIP` - Stripe price ID for VIP plan
  - `STRIPE_PRICE_ID_BASIC` - Stripe price ID for Basic plan
  - `OPENAI_API_KEY` - OpenAI API key for chatbot
  - `RESEND_API_KEY` - Resend email API key
  - `NEXT_PUBLIC_SITE_URL` - Site URL for redirects (fallback to `http://localhost:3000`)

**Build:**
- `tsconfig.json` - TypeScript config (target ES2017, strict mode, bundler module resolution, `@/*` path alias)
- `next.config.ts` - Next.js config (wrapped with next-intl plugin)
- `postcss.config.mjs` - PostCSS with Tailwind v4 plugin
- `vitest.config.ts` - Vitest unit test config
- `playwright.config.ts` - Playwright E2E test config

**TypeScript Path Aliases:**
- `@/*` maps to project root (`./`)

## Platform Requirements

**Development:**
- Node.js (latest LTS recommended, no version pinned)
- npm
- Supabase CLI (for Edge Functions and migrations)
- Stripe CLI (for webhook testing locally)

**Production:**
- Next.js hosting platform (Vercel or similar)
- Supabase (PostgreSQL database + Auth + Edge Functions)
- Stripe account (payment processing)
- Resend account (transactional email)
- OpenAI API account (chatbot)

## Module System

- ES Modules (`"type": "module"` in `package.json`)
- `"module": "esnext"` and `"moduleResolution": "bundler"` in `tsconfig.json`

---

*Stack analysis: 2026-03-13*
