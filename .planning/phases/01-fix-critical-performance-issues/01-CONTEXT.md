# Phase 1: Fix Critical Performance Issues - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve performance bottlenecks identified in the v1.0 codebase audit: middleware DB queries on every request, N+1 admin queries, ineffective serverless rate limiting, and reservation query over-fetching. Also includes splitting the admin.ts monolith (902 lines) since we're rewriting its query logic anyway.

</domain>

<decisions>
## Implementation Decisions

### Middleware membership caching
- Cookie-based cache with 5-minute TTL for membership status
- Cookie stores status + plan type: `{ active: true, planType: 'vip', cachedAt: timestamp }`
- Signed cookie (server-side secret) to prevent tampering
- Natural expiry only — no webhook-triggered invalidation
- Middleware reads cookie first, only queries DB if expired or missing

### Middleware route optimization
- Restrict middleware matcher: only run full auth/membership checks on protected routes (/member/*, /admin/*, /dashboard/*)
- Skip Supabase auth check on public routes (/, /about, /learn, /events, /contact) — no getUser() call
- Skip auth check on API routes (/api/chat, /api/stripe/webhook) — they handle their own auth
- Keep next-intl locale middleware running on ALL routes (i18n must work everywhere)
- Redirect logged-in users from /login and /signup to /member/dashboard
- Keep /pricing as redirect target for unsubscribed users hitting /member/*

### Admin N+1 query elimination
- Create a Postgres view joining `profiles` with `auth.users` (email, last_sign_in_at, banned_until, created_at)
- All admin user queries hit this view instead of the Supabase Admin API — eliminates listUsers(1000) entirely
- The view also fixes searchUsersForReservationAction — no more sequential getUserById loop
- Server-side pagination for admin user table: 25 users per page

### Admin code organization
- Split admin.ts (902 lines) into domain-specific files: admin/events.ts, admin/courts.ts, admin/users.ts, admin/reservations.ts, admin/cms.ts
- Extract shared requireAdmin() guard to admin/auth.ts, imported by all domain files

### Content block batch reordering
- Create a Postgres RPC function that accepts [{id, sort_order}] array and updates all blocks atomically in a single transaction
- Replaces the current N+1 sequential update loop in reorderContentBlocksAction

### Chat rate limiting
- Move from in-memory Map to Supabase table (session_id, count, window_start)
- Keep current limit: 20 messages per hour per session
- Show time remaining in rate limit response: "Try again in X minutes"

### Reservation query scoping
- Add .eq('court_id', courtId) filter to reservation availability query when courtId is provided
- Add composite database index on reservations(court_id, starts_at)

### Claude's Discretion
- Postgres view vs security definer function for auth.users access — pick safest approach per Supabase best practices
- Rate limit cleanup strategy (query-based expiry vs pg_cron vs both)
- Exact cookie signing implementation
- Middleware composition pattern for separating i18n from auth checks

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createClient()` from `@/lib/supabase/server` — SSR Supabase client (used in middleware)
- `supabaseAdmin` from `@/lib/supabase/admin` — service role client for admin operations
- `requireAdmin()` in `app/actions/admin.ts` — admin guard to be extracted to admin/auth.ts
- Existing `pg_cron` setup for session reminders — can be reused for rate limit cleanup

### Established Patterns
- Server Actions with `_prevState` + `FormData` signature (keep in split admin files)
- Action return shape: `{ success: true }` or `{ error: 'code' }` (maintain in refactored code)
- Supabase RPC pattern already used elsewhere — consistent with new batch reorder function
- `@supabase/ssr` cookie handling in middleware — extend for membership cache cookie

### Integration Points
- `middleware.ts` — main target for route optimization and membership caching
- `app/actions/admin.ts` — split into domain files, rewrite queries to use Postgres view
- `app/api/chat/route.ts` — replace in-memory Map with Supabase table
- `lib/queries/reservations.ts` — add court_id filter to getCourtAvailability
- `supabase/migrations/` — new migration for Postgres view, RPC function, and composite index

</code_context>

<specifics>
## Specific Ideas

No specific references — standard performance optimization patterns apply.

</specifics>

<deferred>
## Deferred Ideas

- **Tourist pricing:** Add address/residency fields to signup page to distinguish locals from tourists, apply different per-session rates for tourists. Suggested by client (María Nelly).
- **Remove TOCTOU reservation pre-check:** The redundant application-level conflict check before INSERT could be removed (DB exclusion constraint handles it). Not a performance issue, more of a simplification — defer to a future cleanup phase.

</deferred>

---

*Phase: 01-fix-critical-performance-issues*
*Context gathered: 2026-03-14*
