# Phase 1: Foundation - Research

**Researched:** 2026-03-07
**Domain:** Next.js 16 App Router + Supabase Auth SSR + next-intl 4 + TailwindCSS v4 + Row Level Security
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Signup flow structure
- Single page — all fields on one page: first name, last name, email, phone, password, and optional plan selection
- Plan selection displayed as two side-by-side cards with price + feature bullets (VIP $50/mo all locations, Basic $35/mo one location)
- Plan selection is optional — user can create account without selecting a plan, no prompt or reminder shown
- After signup: redirect to home page, already signed in
- Welcome notification: full-width banner at top of page with name greeting, fades out after 3 seconds with CSS transition

#### Auth methods
- Email + password AND Google OAuth (both on signup and login pages)
- Google signup flow: auto-fill name/email from Google, land on a short profile completion step to add phone number before account is created
- Login page offers: email/password form + "Sign in with Google" button + "Forgot password?" link

#### Auth page design
- Full NELL branding on login and signup pages — not a minimal form
- Brand identity (see Brand Style section in CONTEXT.md)

#### Member gating
- Unsubscribed users who try to access /member/* are redirected to a pricing/subscription page
- Dashboard with upgrade prompt is NOT used — redirect is the pattern

#### Validation UX
- Name validation errors shown inline below each field (not on submit, not toast)
- Error appears on blur or on submit attempt

#### Locale URL behavior
- Spanish (default) uses bare URLs: /dashboard, /reservas
- English uses /en/ prefix: /en/dashboard, /en/reservations
- Visiting / with no locale always defaults to Spanish — no browser language detection

#### i18n language switching
- Globe/flag icon in the navigation bar — clicking reveals ES / EN options
- Switches locale and redirects to the same page in the other language
- Language preference persisted: saved to user profile for logged-in users, cookie for guests

#### Database schema extras (for future phases)
- `profiles` table must include `avatar_url` column (avatar upload UI is Phase 3)
- `memberships` table must support day pass type and cash payment status, not just Stripe subscriptions
- `courts` and `locations` tables must include GPS coordinate columns (map features are Phase 3)

### Claude's Discretion
- Exact loading skeleton and error state designs
- Specific spacing, typography scale, and component-level layout
- Password reset email template content
- RLS policy implementation details
- Admin role assignment implementation (privileged server-side only)

### Deferred Ideas (OUT OF SCOPE)
- Nearest courts by location search — Phase 3
- Day pass purchase flow — Phase 2 (schema support added in Phase 1)
- Cash payment UI and tracking — Phase 2 (schema support added in Phase 1)
- Avatar upload UI — Phase 3 (schema support added in Phase 1)
- Account management section — Phase 3 Dashboard
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with first name, last name, email, phone number, password, and membership plan selection | Supabase `signUp()` with metadata; profiles INSERT trigger pattern |
| AUTH-02 | First and last name validated separately — no numbers, whitespace trimmed, capitalization normalized | Client-side regex validation + server-side normalization in Server Action |
| AUTH-03 | Password requires minimum 8 characters with confirmation match | Supabase Auth minimum password length setting + client-side confirm match |
| AUTH-04 | User can log in with email and password | Supabase `signInWithPassword()` |
| AUTH-05 | User session persists across browser refresh (SSR cookie-based, using `@supabase/ssr`) | `createServerClient` + `createBrowserClient` with `getAll`/`setAll` cookie API |
| AUTH-06 | User can request password reset via email link and set a new confirmed password | `resetPasswordForEmail()` + PKCE callback at `/auth/callback` + `updateUser()` |
| AUTH-07 | Admin role stored in `app_metadata` (not `user_metadata`) — cannot be self-assigned | `supabase.auth.admin.updateUserById()` with `service_role` key; `raw_app_meta_data` pattern |
| I18N-01 | Platform supports Spanish (primary) and English via `next-intl` with `[locale]` route segment | next-intl 4, `defineRouting`, `localePrefix: 'as-needed'`, `app/[locale]/` structure |
| I18N-02 | All UI strings externalized to locale files from Phase 1 | `messages/es.json` + `messages/en.json`; `useTranslations()` hook |
| SEC-01 | Row Level Security enabled on all tables | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + CREATE POLICY for each table |
| SEC-02 | Supabase `proxy.ts` uses `getUser()` — not `getSession()` — for server-side JWT verification | `supabase.auth.getUser()` validated; `getClaims()` is alternative for local JWT validation only |
| SEC-03 | Members can only read/write their own data; admin service role bypasses RLS only in webhook handler | RLS `USING ((SELECT auth.uid()) = user_id)` + service_role client pattern |
| SEC-04 | Login attempt rate limiting (Supabase Auth built-in + optional custom rate limiter) | Supabase Auth has built-in rate limiting; configurable in dashboard |
| SEC-05 | Protected routes enforce auth at middleware level for `/dashboard/*` and `/admin/*` | `proxy.ts` route matching with `getClaims()` check before redirect |
</phase_requirements>

---

## Summary

This phase establishes the entire technical foundation on which all five phases depend. The four areas — Next.js 16 scaffold, Supabase SSR auth, database schema with RLS, and next-intl i18n routing — must be implemented in a specific order because each downstream area depends on the previous one being correct.

The most important paradigm shift from older patterns is that Next.js 16 renamed `middleware.ts` to `proxy.ts` and dropped Edge runtime support; the file now runs on Node.js. Simultaneously, Supabase replaced `getSession()` with `getUser()` (and `getClaims()` for local JWT verification) as the correct server-side auth check. Using `getSession()` in proxy.ts is a documented security vulnerability because it does not revalidate tokens. The combination of `proxy.ts` + `getUser()` + `@supabase/ssr` cookie handling is the current standard pattern.

For i18n, next-intl 4 (released March 2025) is ESM-only and introduces `AppConfig` typed locales. The `localePrefix: 'as-needed'` option correctly models the user's requirement: Spanish (default locale) has bare URLs (`/dashboard`), English has `/en/` prefix. next-intl's `createMiddleware` must be composed with Supabase auth inside a single `proxy.ts` file — both need to run on every request.

**Primary recommendation:** Scaffold with `create-next-app` targeting Next.js 16, configure `proxy.ts` to compose Supabase auth + next-intl middleware, create server/browser client split in `lib/supabase/`, write a single database migration SQL file for all seven tables, and externalize all UI strings before writing any component text.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.x (16.1.6 current) | App Router framework, SSR, routing | Project requirement; Turbopack default, proxy.ts, React 19.2 |
| react / react-dom | 19.2 | UI rendering | Bundled with Next.js 16 |
| typescript | 5.1+ | Type safety | Minimum required by Next.js 16 |
| @supabase/supabase-js | latest | Supabase client SDK | Official client |
| @supabase/ssr | 0.7.x | SSR-safe cookie-based auth for Next.js | Official SSR package; replaces deprecated auth-helpers |
| next-intl | 4.x | i18n routing + message translation | Project requirement; ESM-only, typed locales |
| tailwindcss | 4.x | Utility CSS | Project requirement; CSS-first config, no tailwind.config.js needed |
| @tailwindcss/postcss | 4.x | PostCSS plugin for Tailwind v4 | Required for Next.js integration in v4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react | latest | TypeScript types for React | Always with TypeScript |
| @types/react-dom | latest | TypeScript types for React DOM | Always with TypeScript |
| postcss | latest | CSS processing pipeline | Required by Tailwind v4 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated; do not use |
| next-intl 4 | next-intl 3 | v3 is still supported but v4 adds typed locales, GDPR-compliant cookies, ESM tree-shaking |
| TailwindCSS v4 | TailwindCSS v3 | v4 is the project requirement; CSS-first config, no JS config file |
| proxy.ts | middleware.ts | middleware.ts is deprecated in Next.js 16; use proxy.ts |

**Installation:**
```bash
npx create-next-app@latest nell-pickleball-club --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npm install @supabase/supabase-js @supabase/ssr next-intl
```

---

## Architecture Patterns

### Recommended Project Structure
```
nell-pickleball-club/
├── app/
│   └── [locale]/
│       ├── layout.tsx               # Root locale layout with NextIntlClientProvider
│       ├── page.tsx                 # Home (marketing)
│       ├── (marketing)/             # Public pages group
│       ├── (auth)/                  # Login, signup, password-reset
│       │   ├── login/page.tsx
│       │   ├── signup/page.tsx
│       │   └── reset-password/page.tsx
│       ├── (member)/                # Protected member pages
│       │   └── dashboard/page.tsx
│       └── (admin)/                 # Protected admin pages
│           └── admin/page.tsx
├── app/
│   └── auth/
│       └── callback/route.ts        # OAuth + PKCE code exchange (NOT under [locale])
├── lib/
│   └── supabase/
│       ├── server.ts                # createServerClient — Server Components, Server Actions
│       └── client.ts                # createBrowserClient — Client Components
├── i18n/
│   ├── routing.ts                   # defineRouting — single source of locale config
│   └── request.ts                   # getRequestConfig — server-side locale messages
├── messages/
│   ├── es.json                      # Spanish strings (default)
│   └── en.json                      # English strings
├── proxy.ts                         # Supabase auth + next-intl composed middleware
├── next.config.ts                   # withNextIntl plugin
├── postcss.config.mjs               # @tailwindcss/postcss
└── supabase/
    └── migrations/
        └── 0001_initial_schema.sql  # All tables + RLS in one migration
```

### Pattern 1: Supabase Server Client (lib/supabase/server.ts)
**What:** Async factory function that creates a Supabase client with cookie access for Server Components, Server Actions, and Route Handlers.
**When to use:** Any server-side data fetching, auth checks outside proxy.ts.
```typescript
// Source: https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()  // await required in Next.js 16 (async APIs)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context cannot set cookies — proxy.ts handles this
          }
        },
      },
    }
  )
}
```

### Pattern 2: Supabase Browser Client (lib/supabase/client.ts)
**What:** Singleton factory for use in Client Components (`'use client'`).
**When to use:** All client-side Supabase interactions.
```typescript
// Source: https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Pattern 3: proxy.ts — Composed Supabase Auth + next-intl
**What:** Single `proxy.ts` file that refreshes the Supabase auth token, then delegates to next-intl for locale routing. Both must run on every request.
**When to use:** This is the required composition pattern for Next.js 16 with both Supabase SSR and next-intl.
```typescript
// Source: next-intl.dev/docs/getting-started/app-router/with-i18n-routing
//         supabase.com/docs/guides/auth/server-side/nextjs
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Always call getUser() — refreshes session if needed
  // Do NOT use getSession() — it does not validate the JWT server-side
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect /member/* and /admin/* routes
  if (!user && (pathname.includes('/dashboard') || pathname.includes('/admin'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Delegate locale routing to next-intl
  const intlResponse = intlMiddleware(request)

  // Copy Supabase auth cookies into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 4: next-intl Routing (i18n/routing.ts)
**What:** Central locale configuration with `as-needed` prefix — default locale (Spanish) has no prefix, English has `/en/`.
**When to use:** Single source of truth for all locale logic.
```typescript
// Source: https://next-intl.dev/docs/routing/configuration
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',    // /dashboard (es), /en/dashboard (en)
  localeCookie: {
    // Session cookie — expires when browser closes (GDPR-compliant default in next-intl 4)
    maxAge: undefined,
  },
})
```

### Pattern 5: next-intl Request Config (i18n/request.ts)
**What:** Server-side locale resolver that loads message files for each request.
**When to use:** Always required for next-intl App Router setup.
```typescript
// Source: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

### Pattern 6: Admin Role Assignment (server-side only)
**What:** Use the Supabase Admin API with `service_role` key to write `app_metadata`. This is immutable by users — `user_metadata` is user-writable, `app_metadata` is not.
**When to use:** Admin role setup; must only run in Server Actions or API Routes, never client-side.
```typescript
// Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
import { createClient } from '@supabase/supabase-js'

// Admin client — uses service_role, NEVER expose to client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // server-only env var
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Assign admin role — only callable from privileged server context
export async function assignAdminRole(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'admin' },
  })
  if (error) throw error
}
```

### Pattern 7: Database Schema Migration
**What:** Single SQL migration file creating all seven tables with RLS in one atomic operation.
**When to use:** Run once during initial Supabase project setup.
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Performance tip: wrap auth.uid() in (SELECT ...) to allow Postgres query planner caching

-- profiles
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,                          -- Phase 3 avatar upload
  locale_pref  TEXT DEFAULT 'es',             -- i18n language preference
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

-- memberships
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type       TEXT NOT NULL,               -- 'vip' | 'basic' | 'day_pass'
  status          TEXT NOT NULL DEFAULT 'pending', -- 'active' | 'cancelled' | 'past_due' | 'pending'
  payment_method  TEXT DEFAULT 'stripe',       -- 'stripe' | 'cash' (Phase 2)
  location_id     UUID,                        -- Basic plan location restriction
  stripe_subscription_id TEXT,
  stripe_customer_id     TEXT,
  current_period_end     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own membership"   ON memberships FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Service role full access" ON memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

-- locations
CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  lat         DECIMAL(10, 8),                 -- GPS coordinates (Phase 3 map)
  lng         DECIMAL(11, 8),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access" ON locations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- courts
CREATE TABLE courts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'closed' | 'maintenance'
  lat         DECIMAL(10, 8),                 -- GPS coordinates (Phase 3)
  lng         DECIMAL(11, 8),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read courts" ON courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access" ON courts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- reservations
CREATE TABLE reservations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  court_id                    UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  starts_at                   TIMESTAMPTZ NOT NULL,
  ends_at                     TIMESTAMPTZ NOT NULL,
  reservation_user_first_name TEXT NOT NULL,  -- snapshot at booking time
  reservation_user_last_name  TEXT NOT NULL,  -- snapshot at booking time
  status                      TEXT NOT NULL DEFAULT 'confirmed',
  reminder_sent               BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own reservations"   ON reservations FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own reservations" ON reservations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own reservations" ON reservations FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Service role full access" ON reservations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- events
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es    TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  event_date  TIMESTAMPTZ NOT NULL,
  location_id UUID REFERENCES locations(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access" ON events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- content_blocks
CREATE TABLE content_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key   TEXT NOT NULL UNIQUE,
  block_type  TEXT NOT NULL,               -- 'rich_text' | 'plain_text'
  content_es  TEXT,
  content_en  TEXT,
  sort_order  INT DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read content_blocks" ON content_blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role full access" ON content_blocks FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Pattern 8: Name Normalization (Server Action)
**What:** Trim whitespace and capitalize first letter of each word in first/last name fields.
**When to use:** Both signup and profile update Server Actions.
```typescript
// AUTH-02: capitalize first letter, lowercase rest, trim whitespace
function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function validateName(name: string): string | null {
  if (/\d/.test(name)) return 'Name cannot contain numbers'
  if (name.trim().length === 0) return 'Name is required'
  return null
}
```

### Anti-Patterns to Avoid
- **Using `getSession()` in proxy.ts:** Does not revalidate JWT with server — security vulnerability. Always use `getUser()` or `getClaims()`.
- **Using `middleware.ts` filename in Next.js 16:** Deprecated; use `proxy.ts` with exported function named `proxy`.
- **Using `get`/`set`/`remove` individually in `@supabase/ssr`:** The v0.5+ API requires `getAll`/`setAll` only.
- **Storing admin role in `user_metadata`:** Users can self-write `user_metadata`. Only `app_metadata` is immutable to users.
- **Running service_role client in browser:** Service role key bypasses all RLS — must be server-only env var (no `NEXT_PUBLIC_` prefix).
- **Hardcoding UI strings in components:** All strings must go in `messages/es.json` and `messages/en.json` from day one — retrofitting i18n costs 2-3x more.
- **Skipping `await` on `cookies()` in Next.js 16:** Next.js 16 enforces async Request APIs — `cookies()` must be awaited.
- **Placing auth callback route inside `[locale]`:** `app/auth/callback/route.ts` must live outside `[locale]` folder to avoid locale prefix issues.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSR cookie management for auth | Custom cookie serialization | `@supabase/ssr` `createServerClient` with `getAll`/`setAll` | Token refresh, secure flag, SameSite, httpOnly — many edge cases |
| i18n URL routing | Custom locale redirect logic | `next-intl` `createMiddleware` | Handles prefixed/unprefixed locales, redirects, cookie persistence |
| JWT validation in proxy | Manual JWT decode | `supabase.auth.getUser()` | Validates with auth server; manual decode cannot detect revoked sessions |
| Password hashing | bcrypt implementation | Supabase Auth built-in | OWASP-compliant; auto-managed |
| Rate limiting | Custom Redis counter | Supabase Auth built-in rate limiting | Built into Supabase dashboard; configurable per project |
| PKCE flow | Manual code verifier | Supabase `exchangeCodeForSession()` | PKCE verifier storage and exchange handled internally |
| Name capitalization edge cases | Custom regex | `normalizeName()` utility (simple) | Straightforward — but watch out for hyphenated names and accented chars |

**Key insight:** The Supabase + next-intl combination requires careful middleware composition. Both libraries need to run on every request and both need to read/write cookies. A custom solution would re-implement token refresh logic and locale detection that both libraries already handle correctly.

---

## Common Pitfalls

### Pitfall 1: Using `getSession()` instead of `getUser()` in proxy.ts
**What goes wrong:** Auth appears to work, but session validation is based on the local cookie value only — a tampered or expired JWT passes the check.
**Why it happens:** `getSession()` is faster (no network call) and appears to return the same data, so developers use it thinking it's equivalent.
**How to avoid:** Always use `supabase.auth.getUser()` in `proxy.ts`. The Supabase docs explicitly warn: "Never trust `getSession()` inside server code."
**Warning signs:** Auth check passes for users whose accounts have been disabled in Supabase dashboard.

### Pitfall 2: Forgetting to await `cookies()` in Next.js 16
**What goes wrong:** Build error or runtime crash — `cookies()` returns a Promise in Next.js 16 (async Request APIs are now mandatory, the sync compatibility layer was removed).
**Why it happens:** Tutorials and older docs show `const cookieStore = cookies()` without await.
**How to avoid:** Always `const cookieStore = await cookies()` in `lib/supabase/server.ts`.
**Warning signs:** TypeScript type error: "Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'".

### Pitfall 3: Auth callback route inside `[locale]` folder
**What goes wrong:** OAuth redirects fail because the callback URL includes a locale prefix (`/es/auth/callback`) but Supabase is configured to redirect to `/auth/callback` — or next-intl intercepts the callback route before the auth code can be exchanged.
**Why it happens:** Developers place all routes under `app/[locale]/` by default.
**How to avoid:** Place `app/auth/callback/route.ts` at the top level, outside `app/[locale]/`. This route never needs i18n.
**Warning signs:** OAuth returns 404 or redirect loop after Google sign-in.

### Pitfall 4: Using `get`/`set`/`remove` cookie API (deprecated)
**What goes wrong:** Supabase `@supabase/ssr` 0.5+ removed the per-cookie `get`/`set`/`remove` API. Using these methods causes TypeScript errors and auth cookie refresh failures.
**Why it happens:** Most tutorials predating 0.5 (2023-2024) use the old API.
**How to avoid:** Use only `getAll()` and `setAll()` in both `createServerClient` and `createBrowserClient`.
**Warning signs:** TypeScript: "Object literal may only specify known properties, and 'get' does not exist in type".

### Pitfall 5: next-intl `localePrefix: 'as-needed'` + cookie interaction
**What goes wrong:** A returning guest user with a stored `NEXT_LOCALE=en` cookie visits `/` and gets redirected to `/en/` unexpectedly instead of the Spanish default. Or: switching language doesn't persist for guests.
**Why it happens:** `localePrefix: 'as-needed'` strips the prefix for the default locale in URLs but the cookie stores the last locale selection.
**How to avoid:** The `as-needed` behavior is correct by design — the cookie ensures returning users see their preferred language. Document this behavior. To force Spanish always (no browser/cookie detection), also set `localeDetection: false` (next-intl 3) or remove the `localeCookie` in next-intl 4.
**Warning signs:** Unexpected redirects on first visit after switching language.

### Pitfall 6: Supabase `app_metadata` vs `user_metadata` confusion
**What goes wrong:** Admin flag placed in `user_metadata` can be self-assigned by a user calling `supabase.auth.updateUser({ data: { role: 'admin' } })` — complete privilege escalation.
**Why it happens:** `user_metadata` is the default in many examples; `app_metadata` requires the admin API.
**How to avoid:** Only ever write the `role` field via `supabase.auth.admin.updateUserById()` using the `service_role` key in a server-only context (Server Action, Route Handler). Never in a Client Component.
**Warning signs:** Role check in proxy.ts using `user.user_metadata.role` instead of `user.app_metadata.role`.

### Pitfall 7: Missing `createNextIntlPlugin` in next.config.ts
**What goes wrong:** next-intl's `i18n/request.ts` config file is not auto-discovered; `getRequestConfig` doesn't run; translations return undefined keys.
**Why it happens:** The plugin wraps Next.js config and must be explicitly applied.
**How to avoid:** Wrap next.config.ts with `withNextIntl`:
```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
export default withNextIntl({ /* nextConfig */ })
```
**Warning signs:** `useTranslations('Nav')('links.home')` returns the key string instead of the translated text.

### Pitfall 8: RLS not enabled — silent data exposure
**What goes wrong:** All users can read/write all rows — data is wide open at the database level even if API routes seem protected.
**Why it happens:** `ENABLE ROW LEVEL SECURITY` must be called explicitly; new tables have RLS disabled by default.
**How to avoid:** Every `CREATE TABLE` statement in the migration must be followed immediately by `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Verify in Supabase dashboard Authentication > Policies.
**Warning signs:** A member can query another member's reservations via Supabase client SDK.

---

## Code Examples

Verified patterns from official sources:

### Google OAuth Sign-in
```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback?next=/`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

### OAuth Callback Route (app/auth/callback/route.ts)
```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### Password Reset Request
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/callback?next=/reset-password`,
})
```

### TailwindCSS v4 — globals.css
```css
/* Source: https://tailwindcss.com/docs/guides/nextjs */
@import 'tailwindcss';

/* Custom CSS variables for NELL brand colors */
@theme {
  --color-lime: #39FF14;
  --color-midnight: #0B1D3A;
  --color-turquoise: #1ED6C3;
  --color-sunset: #FF6B2C;
  --color-offwhite: #F7F9FC;
  --color-charcoal: #2A2A2A;
}
```

### TailwindCSS v4 — postcss.config.mjs
```javascript
// Source: https://tailwindcss.com/docs/guides/nextjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### useTranslations in Server Component
```typescript
// Source: https://next-intl.dev/docs/getting-started/app-router
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('Auth')
  return <h1>{t('login.title')}</h1>
}
```

### Reading admin role from app_metadata in proxy.ts
```typescript
// Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
const { data: { user } } = await supabase.auth.getUser()
const isAdmin = user?.app_metadata?.role === 'admin'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 (2025) | Must rename file and function; Edge runtime no longer supported |
| `getSession()` in server code | `getUser()` or `getClaims()` | @supabase/ssr 0.4+ (2024) | Security fix; getSession() never validates JWT |
| `get`/`set`/`remove` cookie API | `getAll`/`setAll` only | @supabase/ssr 0.5+ (2024) | Breaking change; old tutorials are wrong |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | auth-helpers is fully deprecated |
| `tailwind.config.js` | `globals.css` with `@theme` | TailwindCSS v4 (2025) | No JS config file; CSS-first configuration |
| `next-intl localeDetection: false` | `localeCookie: false` | next-intl 4.0 (March 2025) | v4 separates locale detection from cookie behavior |
| Sync `cookies()` / `params` | Async `await cookies()` / `await params` | Next.js 16 (removes compatibility shim) | Breaking: sync access throws at runtime |
| `experimental.turbopack: true` | Default (no flag needed) | Next.js 16 | Turbopack is default for dev and build |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Fully deprecated, do not use
- `middleware.ts` filename: Deprecated in Next.js 16, will be removed
- `getSession()` in server contexts: Security issue, officially discouraged
- `tailwind.config.js`: No longer needed for v4; configuration lives in CSS

---

## Open Questions

1. **`getClaims()` vs `getUser()` for route protection in proxy.ts**
   - What we know: `getUser()` validates with Supabase Auth server (network call). `getClaims()` validates JWT signature locally against project public keys (no network call, faster).
   - What's unclear: The Supabase AI prompt docs as of March 2026 show `getUser()` for proxy.ts; a GitHub issue (supabase/supabase#40985) discusses clarifying the distinction. `getClaims()` may be sufficient for most cases.
   - Recommendation: Use `getUser()` per official docs for maximum security. If performance is a concern after profiling, consider `getClaims()` for non-sensitive page checks only.

2. **Composing Supabase auth with next-intl in a single `proxy.ts`**
   - What we know: Both require running on every request. next-intl's `createMiddleware` returns a `NextResponse`. Supabase needs to inject refreshed auth cookies into the final response.
   - What's unclear: The exact cookie copy pattern between the two responses. The pattern in the Code Examples above is the recommended approach but should be verified against next-intl's `withMiddleware` composition helper (if it exists in v4).
   - Recommendation: Use the cookie-copy pattern shown above. Test immediately after scaffolding to catch any cookie loss.

3. **Google OAuth profile completion flow**
   - What we know: After `exchangeCodeForSession`, Google provides name + email. Phone number is not available from Google.
   - What's unclear: Whether the profile completion step should happen at the callback route (server redirect to completion form) or client-side after redirect.
   - Recommendation: Redirect to `/signup/complete-profile?oauth=true` after OAuth callback if the profile's `phone` field is null. This page collects phone and triggers a profiles INSERT.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (e2e) + Vitest (unit) |
| Config file | `playwright.config.ts` / `vitest.config.ts` — Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx playwright test && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Signup form submits with all fields | e2e | `npx playwright test tests/auth/signup.spec.ts` | Wave 0 |
| AUTH-02 | Name normalization: "jose urizar" → "Jose Urizar" | unit | `npx vitest run tests/unit/normalizeName.test.ts` | Wave 0 |
| AUTH-03 | Password min length + confirm match validation | unit | `npx vitest run tests/unit/passwordValidation.test.ts` | Wave 0 |
| AUTH-04 | Login with email/password succeeds | e2e | `npx playwright test tests/auth/login.spec.ts` | Wave 0 |
| AUTH-05 | Session persists after browser refresh | e2e | `npx playwright test tests/auth/session-persist.spec.ts` | Wave 0 |
| AUTH-06 | Password reset email link flow | e2e (manual-only in CI without email access) | `npx playwright test tests/auth/password-reset.spec.ts` | Wave 0 |
| AUTH-07 | Admin role cannot be self-assigned | unit | `npx vitest run tests/unit/adminRole.test.ts` | Wave 0 |
| I18N-01 | Spanish default URL has no locale prefix | e2e | `npx playwright test tests/i18n/locale-routing.spec.ts` | Wave 0 |
| I18N-02 | All UI strings come from locale files (no hardcoded strings) | unit (AST check) | `npx vitest run tests/unit/noHardcodedStrings.test.ts` | Wave 0 |
| SEC-01 | RLS enabled — member cannot read another member's reservations | unit (Supabase test client) | `npx vitest run tests/unit/rls-policies.test.ts` | Wave 0 |
| SEC-02 | proxy.ts uses getUser() not getSession() | unit (source check) | `npx vitest run tests/unit/proxyUsesGetUser.test.ts` | Wave 0 |
| SEC-03 | Member cannot read another member's profile | unit (Supabase test client) | `npx vitest run tests/unit/rls-policies.test.ts` | Wave 0 |
| SEC-04 | Rate limiting active on login (smoke) | manual-only | N/A — Supabase dashboard config | — |
| SEC-05 | /dashboard redirects unauthenticated users to /login | e2e | `npx playwright test tests/auth/route-protection.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx playwright test && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/normalizeName.test.ts` — covers AUTH-02
- [ ] `tests/unit/passwordValidation.test.ts` — covers AUTH-03
- [ ] `tests/unit/adminRole.test.ts` — covers AUTH-07
- [ ] `tests/unit/rls-policies.test.ts` — covers SEC-01, SEC-03
- [ ] `tests/unit/proxyUsesGetUser.test.ts` — covers SEC-02
- [ ] `tests/unit/noHardcodedStrings.test.ts` — covers I18N-02
- [ ] `tests/auth/signup.spec.ts` — covers AUTH-01
- [ ] `tests/auth/login.spec.ts` — covers AUTH-04
- [ ] `tests/auth/session-persist.spec.ts` — covers AUTH-05
- [ ] `tests/auth/password-reset.spec.ts` — covers AUTH-06
- [ ] `tests/i18n/locale-routing.spec.ts` — covers I18N-01
- [ ] `tests/auth/route-protection.spec.ts` — covers SEC-05
- [ ] `playwright.config.ts` — Playwright configuration
- [ ] `vitest.config.ts` — Vitest configuration
- [ ] Framework install: `npm install -D vitest @vitest/ui && npm install -D @playwright/test`

---

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/guides/upgrading/version-16 — Complete Next.js 16 breaking changes; confirmed proxy.ts rename, async Request APIs, Turbopack default, Node.js 20.9+ requirement
- https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth — Current server/browser client patterns, proxy.ts auth composition, getUser() requirement
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS policy SQL syntax, auth.uid() caching pattern
- https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing — Complete next-intl 4 App Router setup files
- https://next-intl.dev/blog/next-intl-4-0 — next-intl 4 breaking changes, ESM-only, GDPR cookie defaults

### Secondary (MEDIUM confidence)
- https://supabase.com/docs/guides/auth/social-login/auth-google — Google OAuth PKCE flow, callback route pattern
- https://supabase.com/docs/reference/javascript/auth-getclaims — getClaims() vs getUser() distinction
- https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — app_metadata admin role pattern
- https://tailwindcss.com/docs/guides/nextjs — TailwindCSS v4 PostCSS installation
- https://next-intl.dev/docs/routing/configuration — defineRouting with localePrefix as-needed

### Tertiary (LOW confidence — needs validation)
- Proxy.ts composition pattern combining Supabase + next-intl — synthesized from both library docs; exact cookie-copy approach should be verified at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official docs (Next.js 16 release notes, Supabase docs, next-intl changelog)
- Architecture: HIGH — patterns sourced directly from official Supabase AI prompt docs and next-intl setup guide
- Pitfalls: HIGH — each pitfall is traceable to official documentation warnings or GitHub issues
- Middleware composition: MEDIUM — synthesized from both libraries' docs; exact interaction needs empirical testing at Plan 01-01/01-03

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days — libraries are relatively stable but @supabase/ssr has been releasing frequently)

**Critical version flags:**
- Next.js: 16.x (current 16.1.6) — Node.js 20.9+ required
- @supabase/ssr: 0.7.x — use `getAll`/`setAll` cookie API only
- next-intl: 4.x — ESM-only; update next.config.ts to use withNextIntl plugin
- TailwindCSS: 4.x — no `tailwind.config.js`; use `@import 'tailwindcss'` + `@theme {}` in globals.css
