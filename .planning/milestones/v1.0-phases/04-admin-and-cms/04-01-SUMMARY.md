---
phase: 04-admin-and-cms
plan: 01
subsystem: admin
tags: [admin, rbac, supabase, next-intl, server-actions, dashboard]

requires:
  - phase: 01-foundation
    provides: proxy.ts middleware, supabase server/admin clients, Navbar, i18n setup
  - phase: 03-reservations
    provides: reservations table schema, court/location tables
provides:
  - Three-layer admin route protection (proxy, layout, requireAdmin)
  - Admin layout shell with responsive sidebar navigation
  - Admin dashboard with stat cards
  - Admin type definitions (Event, ContentBlock, AdminStats, UserWithDetails)
  - Migration 0005 with events enhancements and content_blocks seed data
  - ConfirmDialog reusable component for destructive actions
affects: [04-02, 04-03, 04-04, 05-cms-pages]

tech-stack:
  added: []
  patterns: [three-layer-admin-auth, admin-server-actions, admin-layout-shell]

key-files:
  created:
    - supabase/migrations/0005_admin_events_cms.sql
    - lib/types/admin.ts
    - app/actions/admin.ts
    - app/[locale]/(admin)/admin/layout.tsx
    - components/admin/AdminSidebar.tsx
    - components/admin/StatCard.tsx
    - components/admin/ConfirmDialog.tsx
  modified:
    - proxy.ts
    - components/Navbar.tsx
    - messages/en.json
    - messages/es.json
    - app/[locale]/(admin)/admin/page.tsx

key-decisions:
  - "Three-layer admin protection: proxy.ts (Layer 1), layout.tsx (Layer 2), requireAdmin() in Server Actions (Layer 3)"
  - "Admin stats query profiles table for total users count (avoids auth.admin.listUsers pagination overhead)"
  - "AdminSidebar uses Unicode symbols for nav icons (no icon library dependency)"

patterns-established:
  - "requireAdmin() helper: all admin Server Actions call this first for Layer 3 protection"
  - "Admin layout shell: sidebar + main content area with bg-[#0a1628] dark theme"
  - "StatCard component: reusable stat display with title, value, optional icon"

requirements-completed: [ADMIN-11, ADMIN-09, CMS-01]

duration: 3min
completed: 2026-03-12
---

# Phase 4 Plan 01: Admin Foundation Summary

**Three-layer admin route protection with dashboard stats, responsive sidebar navigation, and database migration for events/CMS**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T03:53:48Z
- **Completed:** 2026-03-12T03:57:07Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Three-layer admin route protection: proxy.ts redirects non-admin from /admin/*, layout.tsx server-side role gate, requireAdmin() in Server Actions
- Admin dashboard at /admin with 4 stat cards (total users, active members, today reservations, upcoming events)
- Responsive sidebar with 7 navigation links (Dashboard, Users, Courts, Reservations, Events, CMS, Stripe)
- Migration 0005 with events columns (event_type, start_time, end_time, image_url), court maintenance columns, and 13 content_blocks seed rows
- ConfirmDialog reusable component for destructive admin actions
- Admin link in Navbar conditionally visible for admin-role users

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, types, and requireAdmin helper** - `5d45145` (feat)
2. **Task 2: Three-layer route protection, admin layout, dashboard, sidebar, Navbar** - `399a450` (feat)

## Files Created/Modified
- `supabase/migrations/0005_admin_events_cms.sql` - Events enhancements, court maintenance columns, content_blocks seeds
- `lib/types/admin.ts` - Admin domain types (Event, ContentBlock, AdminStats, UserWithDetails)
- `app/actions/admin.ts` - requireAdmin helper + getAdminStatsAction Server Action
- `app/[locale]/(admin)/admin/layout.tsx` - Layer 2 admin gate + sidebar shell layout
- `app/[locale]/(admin)/admin/page.tsx` - Admin dashboard with 4 stat cards
- `components/admin/AdminSidebar.tsx` - Responsive sidebar with 7 nav links and mobile overlay
- `components/admin/StatCard.tsx` - Reusable stat card component
- `components/admin/ConfirmDialog.tsx` - Reusable confirmation dialog for destructive actions
- `proxy.ts` - Layer 1 admin route protection added
- `components/Navbar.tsx` - Conditional admin link for admin-role users
- `messages/en.json` - Admin namespace with all sidebar, stat, and dialog keys
- `messages/es.json` - Admin namespace Spanish translations

## Decisions Made
- Used profiles table count for total users stat instead of auth.admin.listUsers (simpler, avoids pagination)
- Unicode symbols for sidebar nav icons to avoid adding an icon library dependency
- America/Santo_Domingo timezone for today's reservations calculation (consistent with Phase 3)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

- [User Action Required]: Run `supabase/migrations/0005_admin_events_cms.sql` in Supabase Dashboard SQL Editor before using admin features

## Next Phase Readiness
- Admin foundation complete: route protection, layout shell, and types ready for all subsequent admin plans
- Plan 04-02 (Users management) can proceed using requireAdmin and admin layout
- Plan 04-03 (Events/Courts management) can proceed using Event types and migration columns
- Plan 04-04 (CMS management) can proceed using ContentBlock types and seeded content_blocks

---
*Phase: 04-admin-and-cms*
*Completed: 2026-03-12*
