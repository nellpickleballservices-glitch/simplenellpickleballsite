---
phase: 04-admin-and-cms
plan: 03
subsystem: admin
tags: [admin, courts, reservations, server-actions, supabase, resend, i18n]

requires:
  - phase: 04-admin-and-cms
    provides: Admin foundation (requireAdmin, layout, sidebar, ConfirmDialog, migration 0005)
  - phase: 03-reservations
    provides: Reservations table schema, court/location tables, reservation types
provides:
  - Court management Server Actions (getCourts, addCourt, setMaintenance, clearMaintenance)
  - Reservation management Server Actions (getAll, cancel, createOnBehalf, markCashPaid, searchUsers)
  - Admin courts page with add form, status badges, and maintenance controls
  - Admin reservations page with filterable table, pagination, and inline actions
affects: [04-04, 05-public-pages]

tech-stack:
  added: []
  patterns: [admin-court-crud, admin-reservation-management, cascade-cancellation, guest-reservation-pattern]

key-files:
  created:
    - app/[locale]/(admin)/admin/courts/page.tsx
    - app/[locale]/(admin)/admin/courts/CourtForm.tsx
    - app/[locale]/(admin)/admin/courts/MaintenanceForm.tsx
    - app/[locale]/(admin)/admin/reservations/page.tsx
    - app/[locale]/(admin)/admin/reservations/AdminReservationForm.tsx
  modified:
    - app/actions/admin.ts
    - messages/en.json
    - messages/es.json

key-decisions:
  - "Guest reservations use admin's user_id with guest_name and created_by_admin=true (per research recommendation)"
  - "Maintenance cascade sends cancellation emails via Resend fire-and-forget (try/catch per user)"
  - "Location upsert on court creation reuses existing location by name or creates new one"

patterns-established:
  - "addCourtAction creates default court_config (weekday/weekend) and court_pricing (full_court/open_play) matching seed data"
  - "AdminReservationForm composes startsAt/endsAt from separate date + time inputs via hidden fields"

requirements-completed: [ADMIN-05, ADMIN-06, ADMIN-07]

duration: 5min
completed: 2026-03-12
---

# Phase 4 Plan 03: Courts and Reservations Management Summary

**Admin court CRUD with GPS and maintenance cascade cancellation, plus filterable reservation table with create-on-behalf and mark-cash-paid**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T03:59:30Z
- **Completed:** 2026-03-12T04:05:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 9 Server Actions for court and reservation management, all gated by requireAdmin()
- Court management UI with add form (location upsert + GPS), status badges, and inline maintenance controls
- Reservation table with date/court/status filters, pagination (20/page), cancel and mark-paid actions
- Admin reservation creation supporting both registered users (with search) and guest walk-ins
- Maintenance mode cascade: cancels overlapping reservations and sends email notifications via Resend
- Full i18n coverage in en.json and es.json for all court and reservation admin strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Court and reservation management Server Actions** - `6459e7f` (feat)
2. **Task 2: Court management UI and reservation management UI** - `a2a6100` (feat)

## Files Created/Modified
- `app/actions/admin.ts` - 9 new Server Actions for court CRUD, reservation management, user search
- `app/[locale]/(admin)/admin/courts/page.tsx` - Court list with add form toggle and maintenance controls
- `app/[locale]/(admin)/admin/courts/CourtForm.tsx` - Add court form with location, GPS, useActionState
- `app/[locale]/(admin)/admin/courts/MaintenanceForm.tsx` - Maintenance toggle with ConfirmDialog
- `app/[locale]/(admin)/admin/reservations/page.tsx` - Filterable reservation table with pagination
- `app/[locale]/(admin)/admin/reservations/AdminReservationForm.tsx` - Create reservation for user or guest
- `messages/en.json` - Admin court and reservation i18n keys
- `messages/es.json` - Spanish translations for court and reservation admin

## Decisions Made
- Guest reservations use admin's user_id + guest_name + created_by_admin=true pattern (consistent with research recommendation)
- Location upsert via onConflict: 'name' avoids duplicates when adding courts to existing locations
- Default court_config and court_pricing created automatically for new courts matching seed data patterns
- Cancellation emails sent per-user with individual try/catch to prevent one failure from blocking others

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - uses existing migration 0005 from Plan 04-01.

## Next Phase Readiness
- Court and reservation admin complete, operational tools ready for club management
- Plan 04-04 can proceed for any remaining admin features
- Phase 5 public pages can reference courts and reservations data

---
*Phase: 04-admin-and-cms*
*Completed: 2026-03-12*
