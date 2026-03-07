# Architecture Research

**Domain:** Next.js 15 App Router + Supabase + Stripe sports club SaaS platform
**Researched:** 2026-03-07
**Confidence:** HIGH (Next.js official docs verified 2026-02-27; Supabase SSR patterns from @supabase/ssr package; Stripe webhook patterns from official guides)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VERCEL (Next.js 15)                            │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  (marketing) │  │   (auth)     │  │  (member)    │  │  (admin)   │  │
│  │  Public site │  │ Signup/Login │  │  Dashboard   │  │  Panel     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                │                  │                │          │
│  ┌──────┴────────────────┴──────────────────┴────────────────┴──────┐   │
│  │                     middleware.ts                                 │   │
│  │          (auth check, role enforcement, cookie refresh)           │   │
│  └──────────────────────────────┬────────────────────────────────────┘  │
│                                 │                                        │
│  ┌──────────────────────────────┴────────────────────────────────────┐   │
│  │                     API Routes (/api/*)                            │   │
│  │   /api/stripe/webhook   /api/chatbot   /api/reservations          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
          │                    │                       │
          ▼                    ▼                       ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│    Stripe    │    │    Supabase      │    │   OpenAI / Anthropic  │
│  Checkout    │    │  Postgres + RLS  │    │   (AI chatbot API)    │
│  Webhooks    │    │  Auth (cookies)  │    └──────────────────────┘
│  Billing     │    │  Storage         │
└──────────────┘    │  Edge Functions  │
                    │  Realtime        │
                    └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `(marketing)` route group | Public pages: home, about, learn, events, contact | RSC, reads `content_blocks` table, static/ISR |
| `(auth)` route group | Signup, login, password reset, Stripe checkout redirect | Client components for forms, Server Actions for mutations |
| `(member)` route group | Dashboard, reservations, profile, map | Mixed RSC + client; auth-gated via middleware |
| `(admin)` route group | User management, CMS, court management, Stripe view | Auth-gated, admin role required, heavy server data fetching |
| `middleware.ts` | Auth session refresh, route protection by role | Runs on Edge runtime; uses `@supabase/ssr` cookie utilities |
| `/api/stripe/webhook` | Receives Stripe events, updates `memberships` table in Supabase | Route handler, signature verified, runs as Node.js |
| `/api/chatbot` | Streams AI responses to client | Route handler proxying OpenAI/Anthropic; no direct DB access |
| Supabase Edge Functions | Session-end reminder notifications (scheduled/cron) | Deno runtime; queries `reservations`; sends via Resend |
| Supabase RLS | Enforces data access by role at DB layer | Policies on every table; three roles: anon, member, admin |

---

## Recommended Project Structure

```
nell-pickleball/
├── app/
│   ├── layout.tsx                    # Root layout (html, body, fonts)
│   ├── globals.css
│   ├── (marketing)/                  # Route group — public pages
│   │   ├── layout.tsx                # Marketing layout (navbar, footer)
│   │   ├── page.tsx                  # / (home)
│   │   ├── about/page.tsx            # /about
│   │   ├── learn/page.tsx            # /learn
│   │   ├── events/page.tsx           # /events
│   │   └── contact/page.tsx         # /contact
│   ├── (auth)/                       # Route group — auth flow
│   │   ├── layout.tsx                # Auth layout (centered card)
│   │   ├── signup/page.tsx           # /signup
│   │   ├── login/page.tsx            # /login
│   │   ├── reset-password/page.tsx   # /reset-password
│   │   └── confirm/page.tsx          # /confirm (email callback)
│   ├── (member)/                     # Route group — authenticated members
│   │   ├── layout.tsx                # Member layout (sidebar, navbar)
│   │   ├── dashboard/page.tsx        # /dashboard
│   │   ├── reservations/
│   │   │   ├── page.tsx              # /reservations (list + map)
│   │   │   └── [id]/page.tsx         # /reservations/[id] (detail)
│   │   ├── profile/page.tsx          # /profile
│   │   └── membership/page.tsx       # /membership (manage plan)
│   ├── (admin)/                      # Route group — admin panel
│   │   ├── layout.tsx                # Admin layout (sidebar)
│   │   ├── admin/page.tsx            # /admin (overview)
│   │   ├── admin/users/page.tsx      # /admin/users
│   │   ├── admin/courts/page.tsx     # /admin/courts
│   │   ├── admin/reservations/page.tsx
│   │   ├── admin/events/page.tsx
│   │   ├── admin/cms/page.tsx        # /admin/cms (content blocks)
│   │   └── admin/billing/page.tsx    # /admin/billing (Stripe view)
│   └── api/
│       ├── stripe/
│       │   └── webhook/route.ts      # POST — Stripe webhook handler
│       └── chatbot/
│           └── route.ts             # POST — AI chatbot stream
├── components/
│   ├── ui/                           # Shadcn/ui primitives
│   ├── marketing/                    # Marketing-specific components
│   ├── member/                       # Member dashboard components
│   │   ├── CourtMap.tsx              # Dynamic import wrapper for Leaflet
│   │   └── ReservationCard.tsx
│   ├── admin/                        # Admin panel components
│   └── shared/                       # Cross-context components (Navbar, Footer, Chatbot)
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient (RSC + Route Handlers)
│   │   ├── client.ts                 # createBrowserClient (Client Components)
│   │   └── middleware.ts             # createServerClient for middleware
│   ├── stripe/
│   │   ├── client.ts                 # Stripe instance
│   │   └── webhooks.ts              # Webhook event handlers
│   ├── resend/
│   │   └── emails.ts                # Email send helpers
│   └── utils/
│       ├── formatters.ts             # Name normalization, date formatting
│       └── constants.ts             # App-wide constants
├── actions/                          # Server Actions
│   ├── auth.ts                       # signup, login, logout, resetPassword
│   ├── reservations.ts               # createReservation, cancelReservation
│   ├── profile.ts                    # updateProfile, changePassword
│   └── cms.ts                        # updateContentBlock (admin)
├── types/
│   └── database.ts                   # Generated Supabase types (supabase gen types)
├── middleware.ts                      # Edge middleware (auth + route guard)
├── supabase/
│   ├── functions/
│   │   └── session-reminder/
│   │       └── index.ts             # Edge Function — session end reminders
│   └── migrations/                   # SQL migration files
└── public/
    └── images/
```

### Structure Rationale

- **Route groups `(marketing)`, `(auth)`, `(member)`, `(admin)`:** Each group gets its own `layout.tsx` with distinct navigation chrome. Groups do not appear in URLs, so `/dashboard` stays clean. This is the official Next.js pattern for sectioning an app with different layouts.
- **`lib/supabase/server.ts` vs `lib/supabase/client.ts`:** Separation is mandatory — the server client reads cookies from request headers; the browser client stores session in cookies via `@supabase/ssr`. Mixing them causes auth state errors.
- **`actions/`:** Server Actions live in a dedicated directory, not colocated in pages, to keep them importable across multiple routes and testable in isolation.
- **`supabase/functions/`:** Edge Functions live here and are deployed via Supabase CLI. Keeping them in the monorepo ensures shared type definitions are accessible.
- **`components/` split by domain:** Prevents accidental imports of member-only components into the marketing bundle. Admin components can be heavy (data tables, charts) and should not ship to public pages.

---

## Architectural Patterns

### Pattern 1: Supabase SSR — Server vs Client Client Split

**What:** Two distinct Supabase client factories. The server client (`createServerClient` from `@supabase/ssr`) reads/writes cookies via Next.js `cookies()` helper. The browser client (`createBrowserClient`) runs in Client Components and uses `localStorage`-backed cookie adapter.

**When to use:** Use the server client in Server Components, Route Handlers, Server Actions, and middleware. Use the browser client only in Client Components that need real-time subscriptions or user-triggered mutations.

**Trade-offs:** The server client cannot be instantiated at module level (it must be called inside a function to get fresh cookies per request). Slightly more boilerplate, but eliminates SSR cookie desync bugs.

**Example:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silently ignore: called from Server Component (read-only context)
            // Middleware handles the actual cookie refresh
          }
        },
      },
    }
  )
}

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Pattern 2: Middleware Auth Guard with Role Enforcement

**What:** `middleware.ts` runs on every request. It refreshes the Supabase session (required to prevent token expiry), checks the user's role from the session, and redirects unauthenticated or unauthorized requests.

**When to use:** Always. Even if individual pages do server-side auth checks, middleware provides the first line of defense and handles cookie refresh — which is mandatory for the Supabase JWT to stay valid across navigations.

**Trade-offs:** Middleware runs on the Edge runtime (no Node.js APIs). Role data must be embedded in the JWT or fetched from a lightweight source. The recommended pattern embeds `role` in `app_metadata` so it's available without a DB query.

**Example:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: getUser() refreshes token. Do NOT use getSession() here.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isMemberRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reservations') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/membership')
  const isAdminRoute = pathname.startsWith('/admin')

  if (!user && (isMemberRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAdminRoute && user?.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Pattern 3: Stripe Subscription Flow — Checkout → Webhook → Supabase

**What:** Stripe Checkout is initiated server-side (Server Action or Route Handler), creating a Checkout Session with the user's Supabase `user_id` embedded in `metadata` or `client_reference_id`. Stripe redirects to a success URL. A Stripe webhook (`/api/stripe/webhook`) receives `checkout.session.completed` and `customer.subscription.*` events and writes the membership status to Supabase using the **service role key** (bypasses RLS).

**When to use:** All payment and subscription state mutations. Never read Stripe state for authorization — always read from Supabase (Stripe is source of truth → synced to Supabase → Supabase is operational truth).

**Trade-offs:** There is an inherent delay between Stripe event and Supabase update (usually < 1 second). The success page should poll or use Supabase Realtime rather than trusting redirect query params for membership status.

**Example — Webhook Handler:**
```typescript
// app/api/stripe/webhook/route.ts
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// Service role client — bypasses RLS for webhook writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = session.client_reference_id!
      await supabase.from('memberships').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: 'active',
        plan: session.metadata?.plan ?? 'basic',
      })
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('memberships')
        .update({ status: sub.status })
        .eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

### Pattern 4: Leaflet Map — Dynamic Import in Next.js

**What:** Leaflet requires browser globals (`window`, `document`). It cannot be imported in Server Components or during SSR. The solution is a wrapper component that uses `next/dynamic` with `ssr: false`.

**When to use:** Any component using Leaflet or other browser-only libraries (react-leaflet, etc.).

**Trade-offs:** The map component is excluded from SSR, so it shows a loading state until hydration. Provide a skeleton placeholder.

**Example:**
```typescript
// components/member/CourtMap.tsx
'use client'
import dynamic from 'next/dynamic'

const LeafletMap = dynamic(
  () => import('@/components/member/LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
    ),
  }
)

export function CourtMap({ courts }: { courts: Court[] }) {
  return <LeafletMap courts={courts} />
}

// components/member/LeafletMapInner.tsx — NOT a Server Component
'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
// ... full Leaflet implementation here
```

### Pattern 5: Content Blocks — Headless CMS in Supabase

**What:** A `content_blocks` table stores structured page content keyed by `(page_slug, block_key)`. Server Components fetch blocks at render time. Admins edit blocks via the admin CMS panel. No external CMS dependency.

**When to use:** All marketing page copy: headings, body text, button labels, image URLs. Keeps content editable without a deployment.

**Trade-offs:** Coarse ISR invalidation — either revalidate on tag or set a short `revalidate` time. Rich text blocks require a decision: store as Markdown or as structured JSON (prefer JSON for portability).

**Example — Schema:**
```sql
create table content_blocks (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null,       -- 'home', 'about', 'learn'
  block_key text not null,       -- 'hero_title', 'hero_subtitle'
  content_type text not null,    -- 'text', 'richtext', 'image_url'
  value_text text,
  value_json jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id),
  unique(page_slug, block_key)
);
```

**Example — Server Component fetch:**
```typescript
// app/(marketing)/page.tsx
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600 // ISR: refresh every hour

export default async function HomePage() {
  const supabase = createClient()
  const { data: blocks } = await supabase
    .from('content_blocks')
    .select('block_key, value_text, value_json')
    .eq('page_slug', 'home')

  const block = (key: string) =>
    blocks?.find(b => b.block_key === key)?.value_text ?? ''

  return (
    <main>
      <h1>{block('hero_title')}</h1>
      <p>{block('hero_subtitle')}</p>
    </main>
  )
}
```

### Pattern 6: Supabase Edge Function — Scheduled Session Reminders

**What:** A Supabase Edge Function runs on a pg_cron schedule (every minute or on a tight interval). It queries `reservations` where `end_time` is 10 minutes from now, sends reminder emails via Resend, and logs send status to prevent duplicates.

**When to use:** Any time-based notification. Supabase pg_cron + Edge Functions is the preferred pattern over external cron services because it runs inside the Supabase network with access to the database.

**Trade-offs:** Edge Functions run on Deno (not Node.js) — use `fetch`-based email APIs like Resend, not Node.js SDK. The function must be idempotent: track sent reminders to prevent duplicate emails if the cron runs multiple times near the boundary.

**Example:**
```typescript
// supabase/functions/session-reminder/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const now = new Date()
  const windowStart = new Date(now.getTime() + 9 * 60 * 1000)  // 9 min from now
  const windowEnd   = new Date(now.getTime() + 11 * 60 * 1000) // 11 min from now

  const { data: sessions } = await supabase
    .from('reservations')
    .select('id, user_email, end_time, reminder_sent')
    .gte('end_time', windowStart.toISOString())
    .lte('end_time', windowEnd.toISOString())
    .eq('reminder_sent', false)
    .eq('status', 'confirmed')

  for (const session of sessions ?? []) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NELL Pickleball <no-reply@nellpickleball.com>',
        to: session.user_email,
        subject: 'Tu sesión termina en 10 minutos / Your session ends in 10 minutes',
        text: 'Your pickleball session ends in 10 minutes. Please prepare to exit the court so the next group can begin.',
      }),
    })

    await supabase
      .from('reservations')
      .update({ reminder_sent: true })
      .eq('id', session.id)
  }

  return new Response('OK')
})
```

---

## Data Flow

### Primary Flow: Signup → Stripe → Active Member

```
User fills signup form (name, email, phone, plan)
    ↓
Server Action: creates Supabase auth user + inserts profile row
    ↓
Server Action: creates Stripe Checkout Session
  (client_reference_id = supabase user_id, metadata.plan = 'basic'|'vip')
    ↓
Browser redirects to Stripe Checkout (hosted page)
    ↓
User pays → Stripe fires checkout.session.completed webhook
    ↓
POST /api/stripe/webhook (verified by signature)
    ↓
Service-role Supabase client upserts memberships row
  (status: 'active', stripe_subscription_id, plan)
    ↓
User redirected to /dashboard — membership is now active
```

### Auth Session Flow: Every Request

```
Browser sends request with Supabase cookie
    ↓
middleware.ts intercepts
    ↓
createServerClient reads cookie → supabase.auth.getUser()
  [Supabase validates JWT; if near expiry, issues refreshed token]
    ↓
Refreshed cookie written back to response headers
    ↓
Route protection check (member vs admin)
    ↓
Request passes to Server Component or Route Handler
    ↓
Server Component calls createClient() → reads fresh cookie for DB queries
```

### Reservation Flow

```
Member opens /reservations
    ↓
RSC: fetches courts + availability from Supabase (with RLS = only active members)
    ↓
CourtMap client component renders (dynamic import, ssr: false)
    ↓
Member clicks court marker → time slots rendered
    ↓
Member selects slot → Server Action: createReservation()
    ↓
Server Action checks: membership active? Slot available? (atomic transaction)
    ↓
Insert reservation row (with snapshot: first_name_snapshot, last_name_snapshot)
    ↓
Resend email: confirmation sent
    ↓
Supabase pg_cron runs session-reminder Edge Function at T-10min
    ↓
Reminder email sent, reminder_sent = true
```

### State Management

```
Server Components: data fetched at render, no client state needed
Client Components: React state for UI (map interactions, form state)
No global state library needed for v1 — RSC + Server Actions cover mutations
Supabase Realtime: optional for court availability (real-time color updates on map)
```

---

## Database Table Overview

```
auth.users (managed by Supabase)
    │
    ├── profiles
    │   ├── id (FK → auth.users)
    │   ├── first_name, last_name, phone
    │   └── role: 'member' | 'admin'
    │
    ├── memberships
    │   ├── id, user_id (FK → auth.users)
    │   ├── stripe_customer_id, stripe_subscription_id
    │   ├── status: 'active' | 'canceled' | 'past_due'
    │   └── plan: 'basic' | 'vip'
    │
    ├── reservations
    │   ├── id, user_id (FK → auth.users)
    │   ├── court_id (FK → courts)
    │   ├── start_time, end_time
    │   ├── status: 'confirmed' | 'canceled'
    │   ├── first_name_snapshot, last_name_snapshot  ← denormalized for history
    │   ├── user_email  ← snapshot for notifications
    │   └── reminder_sent: boolean
    │
    ├── courts
    │   ├── id, name, location_name
    │   ├── latitude, longitude  ← GPS for Leaflet markers
    │   ├── status: 'open' | 'closed' | 'maintenance'
    │   └── session_duration_minutes
    │
    ├── events
    │   ├── id, title, description, event_type
    │   ├── start_time, end_time, location
    │   └── image_url
    │
    └── content_blocks
        ├── id, page_slug, block_key
        ├── content_type: 'text' | 'richtext' | 'image_url'
        ├── value_text, value_json
        └── updated_by (FK → auth.users)
```

---

## RLS Policy Structure

**Three permission levels:**

| Role | Mechanism | Access |
|------|-----------|--------|
| `anon` | No session | `content_blocks` (read), `events` (read), `courts` (read-only public info) |
| `member` | Authenticated + `memberships.status = 'active'` | Own `reservations` (CRUD within rules), own `profile`, own `membership` |
| `admin` | `auth.jwt() ->> 'role' = 'admin'` in `app_metadata` | All tables, all rows |

**Critical RLS patterns:**

```sql
-- Members can only see their own reservations
create policy "members_own_reservations" on reservations
  for all using (auth.uid() = user_id);

-- Only active members can insert reservations (checked against memberships table)
create policy "active_members_can_reserve" on reservations
  for insert with check (
    exists (
      select 1 from memberships
      where user_id = auth.uid()
      and status = 'active'
    )
  );

-- Public can read content blocks (marketing pages)
create policy "public_read_content_blocks" on content_blocks
  for select using (true);

-- Only admins can write content blocks
create policy "admin_write_content_blocks" on content_blocks
  for all using (auth.jwt() ->> 'role' = 'admin');

-- Admin role stored in app_metadata (set via service role, not user-editable)
```

**Important:** Admin role must live in `app_metadata` (not `user_metadata`). `app_metadata` cannot be modified by the user themselves — only the service role key can write to it.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–500 members | Current monolith is ideal. Vercel hobby/pro plan, Supabase free/pro. No changes needed. |
| 500–5k members | Add Supabase connection pooler (pgBouncer, already available). Enable ISR for marketing pages. Consider Supabase Realtime for map availability updates. |
| 5k–50k members (national expansion) | Shard courts by `location_id` for RLS performance. Add read replicas if needed. Consider extracting chatbot to a dedicated service. Redis for reservation lock to prevent race conditions at booking time. |

### Scaling Priorities

1. **First bottleneck:** Court reservation race conditions (double-booking). Solve with `select ... for update` or Postgres advisory locks in a Server Action — this is a day-one concern at any scale.
2. **Second bottleneck:** Marketing page DB reads. Solve with ISR (`revalidate` on `content_blocks` tag) so pages are served from CDN edge without hitting Supabase.

---

## Anti-Patterns

### Anti-Pattern 1: Using `getSession()` in Middleware

**What people do:** Call `supabase.auth.getSession()` in middleware to check auth.
**Why it's wrong:** `getSession()` reads the JWT from the cookie without verifying it against Supabase servers. A tampered cookie passes the check. Route guards become security theater.
**Do this instead:** Always use `supabase.auth.getUser()` in middleware. It makes a network call to Supabase to validate the JWT. Yes, it's slightly slower — that is the correct trade-off for security.

### Anti-Pattern 2: Using Service Role Key in Client Components

**What people do:** Expose `SUPABASE_SERVICE_ROLE_KEY` in a client-side Supabase instance to bypass RLS for convenience.
**Why it's wrong:** The service role key bypasses all RLS — any user who inspects the bundle can exfiltrate all data. It is a complete security failure.
**Do this instead:** Service role key is used only in: (1) Stripe webhook route handler, (2) Edge Functions, (3) Server Actions that require admin-level writes (e.g., setting `app_metadata.role` when onboarding an admin). Never in `'use client'` files.

### Anti-Pattern 3: Importing Leaflet in Server Components

**What people do:** Import `react-leaflet` or `leaflet` at the top of a page component.
**Why it's wrong:** Leaflet accesses `window` at import time. Next.js SSR throws `ReferenceError: window is not defined`.
**Do this instead:** Use `dynamic(() => import('./LeafletMapInner'), { ssr: false })` in a client component wrapper. The inner map component can use Leaflet normally.

### Anti-Pattern 4: Trusting Stripe Redirect Query Params for Membership Status

**What people do:** On the post-checkout success page, read `?session_id=...` from the URL and immediately mark the user as a member in the UI.
**Why it's wrong:** The webhook may not have fired yet. The user can also manually construct a success URL with a fake session ID.
**Do this instead:** On the success page, poll Supabase `memberships` table (or subscribe via Realtime) until `status = 'active'` appears. Show a "Processing your membership..." state until confirmed.

### Anti-Pattern 5: Hardcoding Admin Role Check in Next.js Middleware Only

**What people do:** Enforce admin access only in middleware, relying on route protection.
**Why it's wrong:** Route protection can be bypassed by direct API calls or if middleware config is misconfigured. Data remains exposed at the DB level.
**Do this instead:** Defense in depth — middleware blocks the UI, but RLS policies enforce access at the database layer independently. Both must be correct.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Server Action creates Checkout Session; webhook Route Handler handles events | Never expose secret key client-side; always verify webhook signature |
| Supabase Auth | `@supabase/ssr` with separate server/client factories; middleware refreshes tokens | Use `getUser()` not `getSession()` for security; role in `app_metadata` |
| Resend | HTTP API called from Server Actions (immediate emails) and Edge Functions (reminders) | Deno-compatible; Supabase Edge Functions use `fetch`, not Node.js SDK |
| OpenAI / Anthropic | Route handler `/api/chatbot` streams response; no direct DB access from AI | System prompt includes content_blocks for knowledge base; never expose API key to client |
| Leaflet | Dynamic import with `ssr: false`; court coordinates fetched server-side, passed as props | Import Leaflet CSS in the inner component file, not in globals (breaks SSR) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Components ↔ Supabase | Direct query via server client | No REST over the wire — direct Postgres via `@supabase/ssr` |
| Client Components ↔ Supabase | Browser client for real-time subscriptions only; mutations via Server Actions | Avoid direct DB mutations from client components |
| Server Actions ↔ Supabase | Server client with user session for member actions; service role for admin actions | Server Actions run server-side — safe to use secret keys |
| Next.js ↔ Stripe | Stripe SDK in server-only code; client only receives Checkout Session URL | `client_reference_id` links Stripe customer to Supabase user |
| Edge Functions ↔ Supabase DB | Service role client inside Edge Function | Edge Functions share the same Supabase project — use internal URL |
| Admin Panel ↔ All Tables | Server Components + Server Actions with admin role verification | Double-check: middleware blocks UI, RLS blocks DB — both required |

---

## Suggested Build Order

The following order minimizes rework by ensuring each layer is stable before the next depends on it.

1. **Database schema + RLS** — Define all tables, relationships, and policies. Everything else depends on this being correct. Generate TypeScript types with `supabase gen types typescript`.
2. **Supabase client setup + middleware** — Establish the server/client split and auth cookie refresh before writing any pages. Auth bugs discovered late are expensive.
3. **Auth flow** — Signup, login, password reset. Validate the full cookie lifecycle works across RSC and client components.
4. **Stripe integration** — Checkout Session creation + webhook handler. Test with Stripe CLI locally (`stripe listen --forward-to localhost:3000/api/stripe/webhook`). Do not proceed to reservations until membership status writes correctly.
5. **Marketing pages + CMS** — Content blocks table + public pages. These are statically rendered and unblock design review while backend work continues in parallel.
6. **Member dashboard + reservations** — Depends on auth + membership being stable. Include race condition guard at this step.
7. **Interactive court map** — Depends on courts table and reservation system. Leaflet dynamic import pattern should be established in a stub first.
8. **Admin panel** — Depends on all tables existing. Build last because it's CRUD over already-defined data models.
9. **AI chatbot** — Independent of other features. Can be built in parallel with admin panel. Wire in content_blocks as context.
10. **Edge Functions (session reminders)** — Build after reservations are stable. Requires confirmed `reminder_sent` column and Resend integration.

---

## Sources

- Next.js App Router project structure (official docs, verified 2026-02-27): https://nextjs.org/docs/app/getting-started/project-structure
- Next.js route groups convention: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups
- Supabase SSR package (`@supabase/ssr`) — createServerClient, createBrowserClient, middleware patterns: https://supabase.com/docs/guides/auth/server-side/nextjs (HIGH confidence from training data + package changelog)
- Stripe webhook best practices (signature verification, idempotency, client_reference_id): https://stripe.com/docs/webhooks (HIGH confidence — stable API pattern)
- Supabase Edge Functions with Deno + pg_cron scheduling: https://supabase.com/docs/guides/functions/schedule-functions (MEDIUM confidence — confirmed pattern, Deno runtime constraint verified)
- Leaflet + Next.js dynamic import requirement: documented in react-leaflet FAQ and Next.js dynamic imports docs (HIGH confidence — well-established constraint)
- Supabase RLS app_metadata for admin roles: https://supabase.com/docs/guides/database/postgres/row-level-security (HIGH confidence — official recommended pattern)

---

*Architecture research for: NELL Pickleball Club Platform (Next.js 15 + Supabase + Stripe)*
*Researched: 2026-03-07*
