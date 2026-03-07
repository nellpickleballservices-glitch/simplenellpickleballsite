# Stack Research

**Domain:** Sports club membership + court reservation platform
**Researched:** 2026-03-07
**Confidence:** HIGH (Next.js 16 docs fetched directly; Tailwind v4 docs fetched directly; Supabase/Stripe patterns from official Next.js auth guide + training data cross-validated)

---

## Critical Context: Next.js Is Now Version 16

As of October 2025, **Next.js 16 is the current stable release** (latest patch: 16.1.6, docs updated 2026-02-27). Key breaking changes from v15 that affect this project:

1. `middleware.ts` is deprecated and renamed to `proxy.ts` — export the function as `proxy`, not `middleware`
2. `cookies()`, `headers()`, `params`, `searchParams` are fully async — always `await` them
3. Turbopack is now the default bundler — no `--turbopack` flag needed
4. `cacheComponents: true` replaces `experimental.ppr` and `experimental.dynamicIO`
5. Node.js 20.9+ is the minimum runtime requirement

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x (latest) | Full-stack framework | App Router with RSC, Server Actions, Route Handlers — all needed for this project's auth, reservations, and admin flows. Vercel deployment is first-class. |
| TypeScript | 5.1+ | Type safety | Mandatory minimum for Next.js 16. Catches Supabase type mismatches, Stripe payload shapes, and Server Action return types before runtime. |
| React | 19.2 (bundled with Next.js 16) | UI rendering | Bundled by Next.js. React 19 `useActionState` is the correct hook for form mutations — replaces the old `useFormState`. |
| Supabase | JS SDK 2.x, SSR package `@supabase/ssr` | Auth, Postgres DB, Edge Functions, Storage | Native RLS, Auth v2 with PKCE flow, and Edge Functions for cron jobs. The only backend required — avoids managing a separate server. |
| Stripe | stripe SDK 17.x (Node) | Subscription billing and webhooks | Industry standard for recurring subscriptions. Webhooks sync membership state to Supabase in real-time. |
| TailwindCSS | 4.x | Styling | v4 is stable (released January 2025) and the default in new Next.js 16 projects. CSS-first config, no `tailwind.config.js` needed. 3.5-5x faster builds vs v3. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | 0.5.x | Supabase Auth cookie handling for SSR | Always — this replaces the deprecated `@supabase/auth-helpers-nextjs`. Creates `createServerClient` and `createBrowserClient` with proper cookie adapters. |
| `framer-motion` | 11.x or 12.x | Animations and transitions | Use in `'use client'` components only. Never import in Server Components. Wrap animated sections in Client Components. |
| `leaflet` + `react-leaflet` | leaflet 1.9.x, react-leaflet 4.x | Interactive court map with GPS markers | Load with `next/dynamic` and `{ ssr: false }` — Leaflet requires `window` and cannot run server-side. |
| `resend` | 4.x | Transactional email (confirmations, reminders) | Route Handlers for reservation confirmation; Supabase Edge Function for 10-min session reminders via cron. |
| `openai` | 4.x | AI chatbot (bilingual Spanish/English) | Use from a Route Handler (`app/api/chat/route.ts`) with streaming. Alternatively use `@anthropic-ai/sdk` 0.34.x if Claude is preferred — same pattern. |
| `zod` | 3.x | Schema validation for Server Actions and API routes | Validate all Server Action inputs (signup, reservation, profile update). The Next.js auth guide explicitly recommends Zod for Server Action validation. |
| `react-leaflet` | 4.x | React wrapper for Leaflet | Paired with Leaflet. Must be client-side only via `next/dynamic`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack | Bundler (default in Next.js 16) | No configuration needed — it's now the default for `next dev` and `next build`. Do NOT add `--turbopack` flag. |
| ESLint Flat Config | Linting | Next.js 16 removed `next lint`. Use `eslint` directly. `@next/eslint-plugin-next` now defaults to ESLint Flat Config format. |
| Supabase CLI | Local development and Edge Function deployment | `supabase start` spins up local Postgres + Auth + Edge Functions. Required for local RLS testing. |
| `supabase gen types typescript` | TypeScript types from DB schema | Regenerate after every schema change. Import into Supabase client for end-to-end type safety. |

---

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest typescript @types/node @types/react @types/react-dom

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Stripe
npm install stripe

# Tailwind CSS v4 (PostCSS approach — works with Turbopack)
npm install -D tailwindcss @tailwindcss/postcss postcss

# Leaflet + React Leaflet
npm install leaflet react-leaflet @types/leaflet

# Framer Motion
npm install framer-motion

# Resend (email)
npm install resend

# OpenAI (or Anthropic)
npm install openai
# OR
npm install @anthropic-ai/sdk

# Validation
npm install zod

# Dev: Supabase CLI (global)
npm install -g supabase
```

---

## Critical Integration Patterns

### Pattern 1: Supabase SSR Cookie Handling (Next.js 16)

**The core gotcha:** Supabase Auth relies on storing session tokens in cookies. In Next.js App Router, cookies are read/written differently in Server Components vs Route Handlers vs proxy.ts. Using the wrong client type causes "session not found" errors.

Use `@supabase/ssr` (NOT `@supabase/auth-helpers-nextjs` which is deprecated).

```typescript
// lib/supabase/server.ts
// Use for: Server Components, Server Actions, Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // MUST await in Next.js 16

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // Server Components cannot set cookies — ignore this error.
            // The proxy.ts handles session refresh for Server Component calls.
          }
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/client.ts
// Use for: 'use client' components only
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// proxy.ts (formerly middleware.ts in Next.js 15)
// CRITICAL: Must be proxy.ts in Next.js 16, NOT middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Must set cookies on BOTH request and response for Supabase session refresh
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Always call getUser() in proxy to refresh the session token.
  // Never use getSession() in proxy — it does not validate the JWT server-side.
  const { data: { user } } = await supabase.auth.getUser()

  // Protect member routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Admin role check happens in the Route Handler/Server Component, not here.
    // proxy.ts should only do optimistic checks from cookie data.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Key rules for Supabase + Next.js 16:**
- Always `await cookies()` before using the cookie store — it's now fully async in v16
- Use `getUser()` (not `getSession()`) in proxy.ts — `getUser()` validates the JWT server-side
- The proxy.ts cookie adapter must set cookies on BOTH `request` and the new `NextResponse` — if you only set on response, session refresh breaks
- Never call Supabase Auth methods in Server Components that can't set cookies — the proxy.ts refreshes the session so Server Components can read it

### Pattern 2: Stripe Webhook Signature Verification

Stripe webhooks must be verified using the raw request body. In Next.js App Router Route Handlers, disable body parsing by reading the raw buffer.

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // Use current API version
})

export async function POST(request: Request) {
  const body = await request.text() // Raw body — do NOT use request.json()
  const headersList = await headers() // Must await in Next.js 16
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = await createClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions').upsert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

**Key rules for Stripe webhooks:**
- Use `request.text()` NOT `request.json()` — Stripe signature verification requires the raw body string
- `await headers()` — fully async in Next.js 16
- Set `STRIPE_WEBHOOK_SECRET` from `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local dev, and the Stripe Dashboard for production
- Handle idempotency — Stripe may send the same event more than once; `upsert` is safer than `insert`

### Pattern 3: Leaflet with Next.js 16 (SSR Disabled)

Leaflet requires `window` and `document` — it cannot run on the server. The correct pattern is `next/dynamic` with `ssr: false`, but this must be used inside a Client Component.

```typescript
// components/CourtMapWrapper.tsx
// This is a CLIENT component that wraps the dynamic import
'use client'

import dynamic from 'next/dynamic'

const CourtMap = dynamic(() => import('./CourtMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
})

export default function CourtMapWrapper({ courts }: { courts: Court[] }) {
  return <CourtMap courts={courts} />
}
```

```typescript
// components/CourtMap.tsx
// Also a CLIENT component — imports react-leaflet
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet's broken default icon in webpack/turbopack environments
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

export default function CourtMap({ courts }: { courts: Court[] }) {
  return (
    <MapContainer center={[18.68, -68.41]} zoom={13} className="h-96 w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {courts.map((court) => (
        <Marker key={court.id} position={[court.lat, court.lng]}>
          <Popup>{court.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

**Key Leaflet gotchas:**
- Copy Leaflet marker icons to `public/leaflet/` — Turbopack breaks Leaflet's default icon resolution differently than webpack did
- `'use client'` on BOTH the wrapper and the map component
- `next/dynamic` with `ssr: false` must be inside a Client Component (use `'use client'` on the wrapper)
- Import `leaflet/dist/leaflet.css` inside the component, not in `globals.css`, to avoid SSR CSS conflicts

### Pattern 4: Framer Motion with App Router

Framer Motion components use React hooks and cannot run in Server Components.

```typescript
// WRONG — will break at build time
// app/page.tsx (Server Component by default)
import { motion } from 'framer-motion'
export default function Page() {
  return <motion.div animate={{ opacity: 1 }}>Hello</motion.div> // ERROR
}

// CORRECT — isolate animations in Client Components
// components/HeroSection.tsx
'use client'
import { motion } from 'framer-motion'

export function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      Welcome to NELL Pickleball Club
    </motion.div>
  )
}

// app/page.tsx (Server Component — OK to import Client Components)
import { HeroSection } from '@/components/HeroSection'
export default function Page() {
  return <HeroSection />
}
```

**Key Framer Motion rules:**
- All `motion.*` components require `'use client'`
- For page transitions in App Router, use the `AnimatePresence` component at the layout level inside a Client Component wrapper
- framer-motion v11/v12 has tree-shaking: import only what you need to keep bundle size small

### Pattern 5: Resend Transactional Email

```typescript
// app/api/email/reservation-confirm/route.ts
import { Resend } from 'resend'
import { ReservationConfirmEmail } from '@/emails/ReservationConfirm'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { to, reservationDetails } = await request.json()

  const { data, error } = await resend.emails.send({
    from: 'NELL Pickleball <reservations@nellpickleballclub.com>',
    to,
    subject: 'Your court reservation is confirmed',
    react: ReservationConfirmEmail({ ...reservationDetails }),
  })

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json({ data })
}
```

For the 10-minute session-end reminder, use a **Supabase Edge Function** with a pg_cron job — not a Next.js API route. Edge Functions run on Deno and have access to Supabase's internal scheduler.

### Pattern 6: OpenAI Chatbot with Streaming

```typescript
// app/api/chat/route.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const { messages } = await request.json()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Cost-effective for a support chatbot
    messages: [
      {
        role: 'system',
        content: `You are a bilingual (Spanish/English) assistant for NELL Pickleball Club in Bávaro, Dominican Republic.
        Answer questions about pickleball rules, club memberships ($35/mo Basic, $50/mo VIP), court reservations, and events.
        Respond in the same language the user writes in.`,
      },
      ...messages,
    ],
    stream: true,
  })

  return new Response(response.toReadableStream())
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Pages Router | Never for new projects — Pages Router is in maintenance mode |
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Never — auth-helpers is deprecated and does not support Next.js 15+ cookie patterns |
| TailwindCSS v4 | TailwindCSS v3 | Only if targeting very old browsers (Chrome < 111). Next.js docs provide a v3 setup guide, but v4 is the default for new projects in 2026. |
| framer-motion | CSS animations / `@starting-style` | For simple enter/exit animations, React 19.2's `@starting-style` CSS support (now in Next.js 16) is zero-JS and preferred. Use framer-motion only for complex orchestrated sequences. |
| Resend | Supabase built-in email | Resend gives better deliverability and React Email components. Supabase's built-in SMTP is fine for auth emails (reset, confirm) but not for transactional reservation emails. |
| OpenAI `gpt-4o-mini` | Anthropic Claude | Both work identically via Route Handlers. OpenAI is slightly simpler to stream. Claude tends to produce better bilingual output. Choose based on API cost at launch. |
| Leaflet + react-leaflet | Google Maps | Google Maps requires billing account and API key management. Leaflet + OpenStreetMap is free and sufficient for court location markers. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated — does not handle Next.js 16 async cookie API. Will throw "cookies is not a function" errors. | `@supabase/ssr` with `createServerClient` / `createBrowserClient` |
| `middleware.ts` as the file name | Deprecated in Next.js 16. Builds still work but will be removed in a future version. | `proxy.ts` with exported function named `proxy` |
| Synchronous `cookies()`, `headers()`, `params` | Fully removed in Next.js 16 — will throw runtime errors. | Always `await cookies()`, `await headers()`, `await params` |
| `request.json()` in Stripe webhook route | Stripe signature verification requires the raw body string. `json()` consumes the readable stream and changes the body. | `request.text()` |
| `getSession()` in proxy.ts / Server Components | Does not validate the JWT on the server — only reads from cookie. Can be spoofed. | `getUser()` which calls the Supabase Auth server to validate |
| Importing `motion` from `framer-motion` in Server Components | Framer Motion uses React context and hooks — Server Components cannot render them. Build will fail. | Put all `motion.*` usage inside `'use client'` components |
| Importing `leaflet` at module scope in SSR context | `window` is not defined during SSR. Will crash the server. | `next/dynamic(() => import('./Map'), { ssr: false })` inside a Client Component |
| `next lint` command | Removed in Next.js 16. | `eslint .` directly |
| `experimental.ppr` in next.config | Removed in Next.js 16. | `cacheComponents: true` in next.config |
| `serverRuntimeConfig` / `publicRuntimeConfig` | Removed in Next.js 16. | `.env.local` files with `NEXT_PUBLIC_` prefix for client values |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next@16.x` | `react@19.2`, `react-dom@19.2` | Always upgrade React and Next.js together |
| `@supabase/ssr@0.5.x` | `@supabase/supabase-js@2.x`, `next@16.x` | Do NOT mix with `@supabase/auth-helpers-nextjs` |
| `tailwindcss@4.x` | `@tailwindcss/postcss@4.x` | v4 uses `@tailwindcss/postcss` not `autoprefixer` — different PostCSS config than v3 |
| `stripe@17.x` | `next@16.x` | Use `request.text()` for raw body in Route Handlers |
| `leaflet@1.9.x` | `react-leaflet@4.x` | react-leaflet v4 requires React 18+; v4 works with React 19 |
| `framer-motion@11.x` | `next@16.x`, `react@19.x` | framer-motion v11 supports React 19. v12 adds new APIs but same compatibility. |
| `resend@4.x` | `next@16.x` | Use in Route Handlers only — not in Server Components directly (no reason to, but worth noting) |
| Node.js 20.9+ | `next@16.x` | Hard requirement — Next.js 16 dropped Node 18 support |

---

## TailwindCSS v4 Setup for Next.js 16

v4 uses a CSS-first config instead of `tailwind.config.js`:

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

```css
/* app/globals.css */
@import 'tailwindcss';

/* Custom theme tokens (replaces tailwind.config.js theme.extend) */
@theme {
  --color-nell-green: oklch(0.65 0.2 145);
  --color-nell-orange: oklch(0.72 0.22 40);
  --font-display: 'Inter', sans-serif;
}
```

No `tailwind.config.js` needed. Content detection is automatic. The `@theme` block replaces `theme.extend` from v3.

If you need to support older browsers (unlikely for this use case), use v3:

```bash
npm install -D tailwindcss@^3 postcss autoprefixer
```

---

## Supabase Edge Function for Cron Notifications

For the 10-minute session-end reminder, deploy a Supabase Edge Function with pg_cron:

```sql
-- In Supabase SQL Editor: Enable pg_cron and create the job
select cron.schedule(
  'session-end-reminder',
  '* * * * *', -- Every minute
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-session-reminder',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
    body := '{}'::jsonb
  )
  $$
);
```

The Edge Function queries for reservations ending in ~10 minutes and sends Resend emails.

---

## Stripe API Version

Use the API version pinned to Stripe's current stable release. As of early 2026, that is `2025-01-27.acacia`. Set this in the Stripe constructor:

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
})
```

Always pin to a specific version so Stripe's breaking changes don't affect production. Update intentionally after reviewing the changelog.

---

## Sources

- Next.js 16 official docs (nextjs.org/blog/next-16, nextjs.org/docs/app/guides/upgrading/version-16) — fetched 2026-03-07 — HIGH confidence
- Next.js 16 Authentication guide (nextjs.org/docs/app/guides/authentication) — fetched 2026-03-07 — HIGH confidence
- Next.js 16 CSS/Tailwind guide (nextjs.org/docs/app/getting-started/css) — fetched 2026-03-07 — HIGH confidence
- Next.js 16 Lazy Loading guide (nextjs.org/docs/app/guides/lazy-loading) — fetched 2026-03-07 — HIGH confidence
- Next.js 16 proxy.ts docs (formerly middleware.ts) — fetched 2026-03-07 — HIGH confidence
- TailwindCSS v4.0 blog post (tailwindcss.com/blog/tailwindcss-v4) — fetched 2026-03-07 — HIGH confidence
- Supabase SSR patterns — training data cross-validated with Next.js auth guide — MEDIUM confidence (Supabase docs URL was blocked during research; patterns match official `@supabase/ssr` package design)
- Stripe webhook patterns — training data (Stripe SDK 17.x patterns), cross-validated with Next.js Route Handler patterns — MEDIUM confidence
- Framer Motion + Leaflet SSR patterns — training data confirmed by Next.js 16 `next/dynamic` docs — MEDIUM confidence

---

*Stack research for: Sports club membership + court reservation platform (NELL Pickleball Club)*
*Researched: 2026-03-07*
