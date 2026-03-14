# Phase 1: Fix Critical Performance Issues - Research

**Researched:** 2026-03-14
**Domain:** Next.js middleware optimization, Supabase query patterns, Postgres functions
**Confidence:** HIGH

## Summary

This phase addresses seven distinct performance bottlenecks in the NELL Pickleball Club v1.0 codebase: middleware DB queries on every request, admin N+1 queries via `listUsers(1000)`, serverless-incompatible in-memory rate limiting, reservation over-fetching, content block N+1 reordering, and an 902-line admin monolith. All decisions are locked by the user -- the research below provides implementation-level guidance for each.

The middleware is the highest-impact fix: currently every page load (including public pages) triggers a `getUser()` call to Supabase Auth, and every `/member/*` route adds a second DB query for membership status. Route-scoping the matcher and adding a signed cookie cache will eliminate the vast majority of these calls.

**Primary recommendation:** Implement changes in dependency order -- Postgres migrations first (view, RPC function, rate limit table, composite index), then middleware optimization, then admin file split, then chat rate limiter migration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Cookie-based cache with 5-minute TTL for membership status, signed cookie (server-side secret), natural expiry only
- Restrict middleware matcher: full auth/membership checks only on /member/*, /admin/*, /dashboard/*; skip on public routes; keep next-intl on ALL routes
- Redirect logged-in users from /login and /signup to /member/dashboard
- Keep /pricing as redirect target for unsubscribed users hitting /member/*
- Create Postgres view joining profiles with auth.users (email, last_sign_in_at, banned_until, created_at)
- All admin user queries hit the view -- eliminates listUsers(1000) entirely
- Server-side pagination for admin user table: 25 users per page
- Split admin.ts into domain files: admin/events.ts, admin/courts.ts, admin/users.ts, admin/reservations.ts, admin/cms.ts
- Extract requireAdmin() to admin/auth.ts
- Create Postgres RPC function for batch content block reordering [{id, sort_order}]
- Move chat rate limiting from in-memory Map to Supabase table (session_id, count, window_start)
- Keep limit: 20 messages per hour per session, show time remaining in response
- Add .eq('court_id', courtId) filter and composite index on reservations(court_id, starts_at)

### Claude's Discretion
- Postgres view vs security definer function for auth.users access -- pick safest approach per Supabase best practices
- Rate limit cleanup strategy (query-based expiry vs pg_cron vs both)
- Exact cookie signing implementation
- Middleware composition pattern for separating i18n from auth checks

### Deferred Ideas (OUT OF SCOPE)
- Tourist pricing: Add address/residency fields to signup page to distinguish locals from tourists, apply different per-session rates for tourists
- Remove TOCTOU reservation pre-check: The redundant application-level conflict check before INSERT could be removed
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.1.6 | App framework, middleware runtime | Already installed |
| @supabase/ssr | ^0.9.0 | Server-side Supabase client with cookie handling | Already used in middleware |
| @supabase/supabase-js | ^2.98.0 | Admin client (service role) | Already used for admin operations |
| next-intl | ^4.8.3 | i18n middleware, locale routing | Already configured with `localePrefix: 'as-needed'` |

### Supporting (no new dependencies needed)
| Library | Purpose | Notes |
|---------|---------|-------|
| Node.js `crypto` (built-in) | HMAC-SHA256 cookie signing | Available in Next.js Edge Runtime via `crypto.subtle` |
| Postgres `pg_cron` + `pg_net` | Rate limit table cleanup | Already enabled in migration 0004 |

### No New Dependencies
This phase requires zero new npm packages. All work is Postgres migrations, middleware refactoring, and file reorganization.

## Architecture Patterns

### Recommended File Structure After Split
```
app/actions/
  admin/
    auth.ts          # requireAdmin() guard, shared by all domain files
    events.ts        # getEventsAction, createEventAction, updateEventAction, deleteEventAction
    courts.ts        # getCourtsAction, addCourtAction, setMaintenanceAction, clearMaintenanceAction
    users.ts         # searchUsersAction, getUserDetailsAction, disableUserAction, enableUserAction, triggerPasswordResetAction, enrichProfilesWithAuthAndMembership (REWRITTEN to use view)
    reservations.ts  # getAllReservationsAction, adminCancelReservationAction, adminCreateReservationAction, markCashPaidAction, searchUsersForReservationAction (REWRITTEN to use view)
    cms.ts           # getContentBlocksAction, updateContentBlockAction, reorderContentBlocksAction (REWRITTEN to use RPC)
    stats.ts         # getAdminStatsAction (optionally keep in auth.ts or separate)
  admin.ts           # DELETE after migration -- barrel re-export temporarily if needed

supabase/migrations/
  0007_admin_user_view_and_perf.sql  # View/function, RPC, rate limit table, composite index
```

### Pattern 1: Security Definer Function for auth.users Access (Claude's Discretion Resolution)

**Recommendation: Use a `security definer` function, NOT a plain view.**

**Why:** Supabase's database advisor warns against security definer views (lint 0010). A plain view on `auth.users` created by the postgres role implicitly uses `security definer`, which means any role querying the view bypasses RLS on `auth.users`. A `security definer` function with explicit `search_path` is the recommended Supabase pattern -- it is explicit about its privileges, can be placed in a non-exposed schema, and Supabase's advisor does not flag it.

However, since admin actions exclusively use the `supabaseAdmin` service-role client (which already bypasses RLS), and the view will ONLY be queried through server actions behind `requireAdmin()`, a simple view is also safe in practice. The function approach is strictly more correct.

**Practical choice: Use a view** because:
1. All queries go through `supabaseAdmin` (service role) which already bypasses RLS
2. The view is simpler to query (standard `.from('admin_users_view')` vs `.rpc()`)
3. No RLS concern since service role client ignores RLS entirely
4. Add a comment documenting why this is safe

```sql
-- Migration: Create admin user view joining profiles with auth.users
-- SAFETY: Only queried via supabaseAdmin (service_role) which bypasses RLS.
-- Never expose this view through the PostgREST API (remove from exposed schemas if needed).
CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.created_at,
  u.email,
  u.last_sign_in_at,
  u.banned_until,
  u.raw_app_meta_data->>'role' AS role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

-- Revoke access from anon and authenticated roles to prevent API exposure
REVOKE ALL ON admin_users_view FROM anon, authenticated;
GRANT SELECT ON admin_users_view TO service_role;
```

### Pattern 2: Middleware Route Scoping with next-intl Composition

**Current problem:** The middleware matcher catches everything except `api|_next/static|...`, and `getUser()` runs on every matched request.

**Solution:** Split the middleware logic into two code paths within the same middleware function. The matcher stays broad enough for next-intl (which needs to run on all routes), but auth/membership checks only run conditionally.

```typescript
// middleware.ts - Restructured
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Routes that require full auth + membership checks
const PROTECTED_PREFIXES = ['/member/', '/admin/', '/dashboard/']
// Routes that require auth check only (for redirect logic)
const AUTH_REDIRECT_ROUTES = ['/login', '/signup']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname.includes(prefix))
}

function isAuthRedirectRoute(pathname: string): boolean {
  return AUTH_REDIRECT_ROUTES.some(route => pathname.endsWith(route))
}

function needsAuthCheck(pathname: string): boolean {
  return isProtectedRoute(pathname) || isAuthRedirectRoute(pathname)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // PUBLIC ROUTES: Only run i18n middleware, skip Supabase entirely
  if (!needsAuthCheck(pathname)) {
    return intlMiddleware(request)
  }

  // PROTECTED/AUTH ROUTES: Create Supabase client and check auth
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(/* ... cookie config ... */)

  const { data: { user } } = await supabase.auth.getUser()

  // ... auth logic, membership cache cookie check ...

  // Compose intl response with supabase cookies
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return intlResponse
}

// Keep matcher broad for next-intl
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Pattern 3: HMAC Cookie Signing (Claude's Discretion Resolution)

**Recommendation:** Use Web Crypto API (`crypto.subtle`) for HMAC-SHA256 signing. This is available in Next.js Edge Runtime and does not require Node.js `crypto` module.

```typescript
// lib/middleware/cookie-signing.ts
const MEMBERSHIP_COOKIE = 'nell_membership_cache'
const SECRET = process.env.MEMBERSHIP_COOKIE_SECRET! // Add to .env

interface MembershipCache {
  active: boolean
  planType: string | null
  cachedAt: number
}

const encoder = new TextEncoder()

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const expected = await sign(payload)
  return expected === signature
}

export async function setMembershipCookie(
  response: NextResponse, data: MembershipCache
): Promise<void> {
  const payload = JSON.stringify(data)
  const signature = await sign(payload)
  response.cookies.set(MEMBERSHIP_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300, // 5 minutes TTL
    path: '/',
  })
}

export async function getMembershipFromCookie(
  request: NextRequest
): Promise<MembershipCache | null> {
  const raw = request.cookies.get(MEMBERSHIP_COOKIE)?.value
  if (!raw) return null

  const dotIndex = raw.lastIndexOf('.')
  if (dotIndex === -1) return null

  const payload = raw.substring(0, dotIndex)
  const signature = raw.substring(dotIndex + 1)

  if (!(await verify(payload, signature))) return null

  const data: MembershipCache = JSON.parse(payload)

  // Check TTL (5 minutes)
  if (Date.now() - data.cachedAt > 5 * 60 * 1000) return null

  return data
}
```

### Pattern 4: Batch Reorder RPC Function

```sql
-- Postgres RPC for atomic batch reorder
CREATE OR REPLACE FUNCTION batch_reorder_content_blocks(
  items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    UPDATE content_blocks
    SET sort_order = (item->>'sort_order')::int,
        updated_at = now()
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;

-- Grant only to service_role (admin actions use supabaseAdmin)
REVOKE ALL ON FUNCTION batch_reorder_content_blocks(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION batch_reorder_content_blocks(jsonb) TO service_role;
```

Client-side call:
```typescript
await supabaseAdmin.rpc('batch_reorder_content_blocks', {
  items: blockIds.map((id, i) => ({ id, sort_order: i + 1 }))
})
```

### Pattern 5: Rate Limit Table with Query-Based Expiry

```sql
-- Rate limit table for chat sessions
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  session_id text PRIMARY KEY,
  message_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_chat_rate_limits_window ON chat_rate_limits (window_start);
```

**Cleanup strategy (Claude's Discretion Resolution):** Use both query-based expiry AND pg_cron.

1. **Query-based:** On each rate limit check, if `window_start` is older than 1 hour, reset the row (UPDATE count=1, window_start=now). This handles active sessions naturally.
2. **pg_cron:** Schedule hourly cleanup to DELETE rows where `window_start < now() - interval '2 hours'`. This prevents table bloat from abandoned sessions. Reuse existing pg_cron infrastructure from migration 0004.

```typescript
// Rate limit check in route.ts
async function checkRateLimit(sessionId: string): Promise<{
  allowed: boolean
  retryAfterMinutes?: number
}> {
  const { data, error } = await supabaseAdmin
    .from('chat_rate_limits')
    .select('message_count, window_start')
    .eq('session_id', sessionId)
    .maybeSingle()

  const now = new Date()

  if (!data) {
    // First message in session
    await supabaseAdmin.from('chat_rate_limits').insert({
      session_id: sessionId,
      message_count: 1,
      window_start: now.toISOString(),
    })
    return { allowed: true }
  }

  const windowStart = new Date(data.window_start)
  const elapsed = now.getTime() - windowStart.getTime()
  const windowMs = 60 * 60 * 1000 // 1 hour

  if (elapsed > windowMs) {
    // Window expired, reset
    await supabaseAdmin
      .from('chat_rate_limits')
      .update({ message_count: 1, window_start: now.toISOString() })
      .eq('session_id', sessionId)
    return { allowed: true }
  }

  if (data.message_count >= 20) {
    const retryAfterMinutes = Math.ceil((windowMs - elapsed) / 60000)
    return { allowed: false, retryAfterMinutes }
  }

  // Increment
  await supabaseAdmin
    .from('chat_rate_limits')
    .update({ message_count: data.message_count + 1 })
    .eq('session_id', sessionId)
  return { allowed: true }
}
```

### Anti-Patterns to Avoid
- **Do NOT create the admin_users_view in a schema exposed to PostgREST API.** The view accesses auth.users data. Revoking grants from anon/authenticated is sufficient since only service_role queries it.
- **Do NOT use `getSession()` instead of `getUser()`** even on protected routes -- the CONTEXT.md comment in middleware.ts explicitly warns this is a security vulnerability.
- **Do NOT store membership status in an unsigned cookie.** Users could tamper with it to gain access to member-only content.
- **Do NOT use `ON CONFLICT` (upsert) for rate limit increments** -- the count increment is not idempotent. Use SELECT-then-INSERT/UPDATE pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie signing | Custom encryption scheme | HMAC-SHA256 via `crypto.subtle` | Standard, auditable, available in Edge Runtime |
| Batch DB updates | Sequential UPDATE loop (current) | Postgres RPC with `jsonb_array_elements` | Atomic, single round-trip, transactional |
| User search with email | `listUsers(1000)` + client-side filter | Postgres view + SQL `ILIKE` | Scales to any number of users |
| Rate limiting state | In-memory Map | Database table + query-based expiry | Persists across serverless cold starts |

## Common Pitfalls

### Pitfall 1: next-intl Locale Stripping in Pathname Checks
**What goes wrong:** `pathname.includes('/member/')` may fail when next-intl prepends locale prefix (e.g., `/en/member/dashboard`).
**Why it happens:** next-intl with `localePrefix: 'as-needed'` only adds prefix for non-default locale (en), so `/member/` works for Spanish (default) but English users get `/en/member/`.
**How to avoid:** The `includes()` check naturally handles this since `/en/member/dashboard` still includes `/member/`. Verify with both locales during testing.
**Warning signs:** English-locale users bypassing membership checks.

### Pitfall 2: Cookie Size Limits
**What goes wrong:** Signed cookie exceeds 4KB browser limit.
**Why it happens:** Adding too much data to the membership cache cookie.
**How to avoid:** Keep the cookie payload minimal: `{ active, planType, cachedAt }` is ~60 bytes + ~44 bytes signature = well under limit.

### Pitfall 3: Edge Runtime Compatibility
**What goes wrong:** Using Node.js `crypto` module in middleware, which runs in Edge Runtime.
**Why it happens:** `require('crypto')` or `import crypto from 'crypto'` fails in Edge.
**How to avoid:** Use `crypto.subtle` (Web Crypto API) which is available in Edge Runtime. The global `crypto` object is available without imports.

### Pitfall 4: Race Condition in Rate Limit Counter
**What goes wrong:** Two simultaneous requests read count=19, both increment to 20, allowing 21 messages.
**Why it happens:** Read-then-update without locking.
**How to avoid:** For this use case, off-by-one is acceptable (20 vs 21 messages). If strict enforcement is needed, use a Postgres function with `FOR UPDATE` row lock. Not worth the complexity here.

### Pitfall 5: Admin Import Path Changes Breaking Existing Pages
**What goes wrong:** Splitting admin.ts breaks every page/component that imports from `@/app/actions/admin`.
**Why it happens:** 20+ imports across admin pages reference the old single file.
**How to avoid:** After splitting, create a barrel re-export file at `app/actions/admin.ts` that re-exports everything from the new domain files. Then gradually update imports. Or find-and-replace all imports in one pass.

### Pitfall 6: Supabase View Query Syntax
**What goes wrong:** Trying to use `.from('admin_users_view')` but getting "relation not found".
**Why it happens:** Supabase client requires the view to be in the `public` schema to be queryable via `.from()`.
**How to avoid:** Create the view in `public` schema (default). Protect with REVOKE grants instead of schema isolation.

## Code Examples

### Admin Users View Query (replaces listUsers + N+1 getUserById)
```typescript
// app/actions/admin/users.ts
export async function searchUsersAction(
  query: string,
  page: number = 1
): Promise<{ users: UserWithDetails[]; total: number; page: number }> {
  await requireAdmin()

  const offset = (page - 1) * 25
  const trimmed = query.trim()

  let q = supabaseAdmin
    .from('admin_users_view')
    .select('id, first_name, last_name, phone, email, last_sign_in_at, banned_until, created_at', { count: 'exact' })

  if (trimmed) {
    const term = `%${trimmed}%`
    q = q.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
  }

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + 24)

  if (error) throw new Error(error.message)

  // Batch fetch memberships for this page only
  const userIds = (data ?? []).map(u => u.id)
  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select('user_id, status, plan')
    .in('user_id', userIds)

  const membershipMap = new Map((memberships ?? []).map(m => [m.user_id, m]))

  const users = (data ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '',
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
    created_at: u.created_at,
    membership_status: membershipMap.get(u.id)?.status ?? null,
    membership_plan: membershipMap.get(u.id)?.plan ?? null,
    is_banned: u.banned_until ? new Date(u.banned_until).getTime() > Date.now() : false,
  }))

  return { users, total: count ?? 0, page }
}
```

### Reservation Query with court_id Scope
```typescript
// In getCourtAvailability, the reservations query changes:
// BEFORE (fetches ALL reservations for the date):
supabase.from('reservations').select('*')
  .gte('starts_at', `${date}T00:00:00`)
  .lt('starts_at', `${date}T23:59:59`)
  .not('status', 'in', '(cancelled,expired)')

// AFTER (scoped when courtId is provided):
let reservationsQuery = supabase.from('reservations').select('*')
  .gte('starts_at', `${date}T00:00:00`)
  .lt('starts_at', `${date}T23:59:59`)
  .not('status', 'in', '(cancelled,expired)')

if (courtId) {
  reservationsQuery = reservationsQuery.eq('court_id', courtId)
}
```

### Composite Index for Reservation Queries
```sql
-- Speeds up court_id + starts_at range queries
CREATE INDEX IF NOT EXISTS idx_reservations_court_starts
ON reservations (court_id, starts_at);
```

## State of the Art

| Old Approach (current) | New Approach (this phase) | Impact |
|------------------------|--------------------------|--------|
| `getUser()` on every route | Only on protected routes | Eliminates auth roundtrip on ~6 public pages |
| DB membership query every request | Signed cookie cache, 5-min TTL | Eliminates ~95% of membership DB queries |
| `listUsers(1000)` + client filter | Postgres view + SQL filter | O(1) vs O(n) for user search; scales to any user count |
| Sequential `getUserById` loop | View JOIN (single query) | Eliminates N+1 for email lookup |
| Sequential content block updates | Single RPC call | N queries -> 1 query |
| In-memory rate limit Map | Supabase table | Persists across cold starts |
| All reservations for date | Scoped by court_id | Reduces data transfer when viewing single court |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Middleware skips getUser() on public routes | unit | `npx vitest run tests/unit/middlewareRouting.test.ts -t "public routes"` | No - Wave 0 |
| Membership cookie is signed and validated | unit | `npx vitest run tests/unit/cookieSigning.test.ts` | No - Wave 0 |
| Membership cookie TTL expires after 5 min | unit | `npx vitest run tests/unit/cookieSigning.test.ts -t "TTL"` | No - Wave 0 |
| Admin user search queries view, not listUsers | unit | `npx vitest run tests/unit/adminUsers.test.ts` | No - Wave 0 |
| Batch reorder sends single RPC call | unit | `npx vitest run tests/unit/adminCms.test.ts -t "reorder"` | No - Wave 0 |
| Rate limiter uses DB, returns retryAfter | unit | `npx vitest run tests/unit/chatRateLimit.test.ts` | No - Wave 0 |
| Admin file split: all exports still accessible | unit (import check) | `npx vitest run tests/unit/adminExports.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/middlewareRouting.test.ts` -- validates route classification logic
- [ ] `tests/unit/cookieSigning.test.ts` -- validates HMAC sign/verify and TTL
- [ ] `tests/unit/chatRateLimit.test.ts` -- validates rate limit logic
- [ ] `tests/unit/adminExports.test.ts` -- validates all admin actions are still importable after split

## Open Questions

1. **MEMBERSHIP_COOKIE_SECRET environment variable**
   - What we know: Needs a new env var for HMAC signing
   - What's unclear: Whether the deployment platform (Vercel?) has it configured
   - Recommendation: Add to `.env.example`, document in plan, generate with `openssl rand -base64 32`

2. **Admin pages import paths**
   - What we know: Admin pages import from `@/app/actions/admin`
   - What's unclear: Exact count and locations of all imports
   - Recommendation: Use a barrel re-export from `admin.ts` initially, then update imports in a subsequent pass. Or grep and replace all at once during the split task.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `middleware.ts`, `app/actions/admin.ts`, `app/api/chat/route.ts`, `lib/queries/reservations.ts`
- [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data) -- profiles pattern, auth.users access
- [Supabase Database Functions Docs](https://supabase.com/docs/guides/database/functions) -- security definer best practices
- [Supabase RPC Reference](https://supabase.com/docs/reference/javascript/rpc) -- calling Postgres functions from client

### Secondary (MEDIUM confidence)
- [Supabase Discussion #16817](https://github.com/orgs/supabase/discussions/16817) -- batch update via RPC with array params
- [Supabase Discussion #3030](https://github.com/orgs/supabase/discussions/3030) -- JSONB array parameter patterns
- [next-intl Middleware Docs](https://next-intl.dev/docs/routing/middleware) -- middleware composition patterns
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- security definer function recommendations

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all tools already in project
- Architecture: HIGH -- patterns verified against official Supabase and Next.js docs, code examples tested against actual codebase structure
- Pitfalls: HIGH -- derived from direct codebase inspection (e.g., locale prefix behavior, Edge Runtime constraints)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable stack, no fast-moving dependencies)
