---
phase: 01-foundation
plan: "02"
subsystem: data-layer
tags: [supabase, rls, auth, database, schema, server-client, oauth]
dependency_graph:
  requires: [01-00]
  provides: [lib/supabase/server.ts, lib/supabase/client.ts, lib/supabase/admin.ts, app/auth/callback/route.ts, supabase/migrations/0001_initial_schema.sql]
  affects: [01-01, 01-03, all-future-phases]
tech_stack:
  added: ["@supabase/ssr (getAll/setAll cookie API)", "@supabase/supabase-js (admin client)"]
  patterns: ["Server/browser client split", "service_role admin pattern", "PKCE OAuth callback", "RLS with auth.uid() caching"]
key_files:
  created:
    - lib/supabase/server.ts
    - lib/supabase/client.ts
    - lib/supabase/admin.ts
    - app/auth/callback/route.ts
    - supabase/migrations/0001_initial_schema.sql
  modified: []
decisions:
  - "SUPABASE_SERVICE_ROLE_KEY used (no NEXT_PUBLIC_ prefix) — server-only enforcement at env var naming level"
  - "app/auth/callback/route.ts placed outside app/[locale]/ — prevents locale prefix collision with Supabase OAuth redirect URL"
  - "auth.uid() wrapped in (SELECT auth.uid()) in all RLS policies — enables Postgres query planner caching"
  - "Policy names made unique per table (e.g. 'Service role full access on memberships') — avoids duplicate policy name conflicts across tables"
metrics:
  duration: "2 min"
  completed_date: "2026-03-08"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 1 Plan 2: Supabase Client Split + Database Schema Summary

**One-liner:** Supabase server/browser/admin client split using @supabase/ssr 0.7.x getAll/setAll API, PKCE OAuth callback route outside [locale], and 7-table PostgreSQL schema with RLS enabled and auth.uid() caching pattern.

## What Was Built

### Task 1: Supabase Client Files + OAuth Callback Route (commit: a3c3d41)

Four files created:

**`lib/supabase/server.ts`** — Async factory using `createServerClient` with `await cookies()` (Next.js 16 async Request APIs) and `getAll`/`setAll` cookie API.

**`lib/supabase/client.ts`** — Synchronous factory using `createBrowserClient` for Client Components.

**`lib/supabase/admin.ts`** — Admin client using `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix). Exports `supabaseAdmin` and `assignAdminRole()` which writes to `app_metadata` via `supabaseAdmin.auth.admin.updateUserById()`.

**`app/auth/callback/route.ts`** — GET handler at `app/auth/callback/` (NOT inside `app/[locale]/`). Calls `supabase.auth.exchangeCodeForSession(code)` for PKCE OAuth flow, redirects to `next` param on success or `/auth/error` on failure.

### Task 2: Database Schema Migration (commit: e7fce87)

**`supabase/migrations/0001_initial_schema.sql`** — Complete schema with 7 tables in FK-safe creation order:

| Table | Key Features |
|-------|-------------|
| `profiles` | FK to auth.users, avatar_url (Phase 3), locale_pref DEFAULT 'es' |
| `locations` | lat DECIMAL(10,8), lng DECIMAL(11,8) GPS columns (Phase 3) |
| `courts` | References locations, lat/lng GPS columns, status field |
| `memberships` | plan_type (vip\|basic\|day_pass), payment_method (stripe\|cash), location_id for Basic plan |
| `reservations` | Snapshot first/last name columns, starts_at/ends_at |
| `events` | Bilingual title/description (es/en), location_id |
| `content_blocks` | block_key UNIQUE, anon+authenticated SELECT policy |

All 7 tables have `ENABLE ROW LEVEL SECURITY`. RLS policies use `(SELECT auth.uid())` pattern for query planner caching. `service_role` gets full access on memberships, reservations, courts, locations, and events.

## Verification Results

```
grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/0001_initial_schema.sql
→ 7

grep "SUPABASE_SERVICE_ROLE_KEY" lib/supabase/admin.ts
→ confirmed (no NEXT_PUBLIC_ prefix)

ls app/auth/callback/route.ts
→ exists at correct path (outside [locale])

npx vitest run tests/unit/adminRole.test.ts tests/unit/rls-policies.test.ts
→ 2 test files skipped (todo stubs), 12 todos — no import errors
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Detail] Unique RLS policy names per table**

- **Found during:** Task 2
- **Issue:** RESEARCH.md Pattern 7 uses generic policy names like `"Service role full access"` on multiple tables. PostgreSQL requires policy names to be unique per table, but using identical names across different tables can cause confusion in the Supabase dashboard and potential conflicts.
- **Fix:** Appended table name to service_role policy names (e.g. `"Service role full access on memberships"`, `"Service role full access on locations"`, etc.) for clarity and uniqueness.
- **Files modified:** supabase/migrations/0001_initial_schema.sql
- **Commit:** e7fce87

## User Setup Required

Before any application code can use these files, the user must:

1. Create a Supabase project and collect credentials from Dashboard -> Project Settings -> API
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<Project URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon public key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ```
3. Run `supabase/migrations/0001_initial_schema.sql` in Supabase Dashboard -> SQL Editor
4. Verify RLS: Dashboard -> Authentication -> Policies — all 7 tables should show policies
5. Verify rate limiting: Dashboard -> Authentication -> Rate Limits (SEC-04)

## Self-Check: PASSED

Files verified:
- FOUND: lib/supabase/server.ts
- FOUND: lib/supabase/client.ts
- FOUND: lib/supabase/admin.ts
- FOUND: app/auth/callback/route.ts
- FOUND: supabase/migrations/0001_initial_schema.sql

Commits verified:
- FOUND: a3c3d41 (feat(01-02): create Supabase client split and OAuth callback route)
- FOUND: e7fce87 (feat(01-02): add full database schema migration with RLS)
