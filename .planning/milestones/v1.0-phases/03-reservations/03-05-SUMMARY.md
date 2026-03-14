---
phase: 03-reservations
plan: "05"
subsystem: ui, notifications
tags: [next-intl, supabase-edge-functions, deno, resend, pg_cron, server-actions, useActionState]

# Dependency graph
requires:
  - phase: 03-01
    provides: Supabase schema with reservations table, profiles, courts, Resend integration
provides:
  - Dashboard settings page with profile edit and password change forms
  - Session reminder Edge Function (bilingual, 10-min reminders via Resend)
  - pg_cron migration for automated reminder scheduling
  - Expired pending_payment hold cleanup
affects: [04-admin]

# Tech tracking
tech-stack:
  added: [pg_cron, pg_net, supabase-edge-functions]
  patterns: [Deno.serve Edge Function pattern, Vault-based secret storage for cron jobs]

key-files:
  created:
    - app/[locale]/(member)/dashboard/settings/page.tsx
    - app/[locale]/(member)/dashboard/settings/ProfileForm.tsx
    - app/[locale]/(member)/dashboard/settings/PasswordForm.tsx
    - app/actions/profile.ts
    - supabase/functions/session-reminder/index.ts
    - supabase/migrations/0004_pg_cron_reminder.sql
  modified:
    - messages/en.json
    - messages/es.json

key-decisions:
  - "Current password verified via signInWithPassword before allowing password change"
  - "Edge Function uses 1-minute time window (10-11 min) matching cron frequency to avoid duplicate sends"
  - "Expired hold cleanup runs as side effect of reminder function (no separate cron job needed)"

patterns-established:
  - "Profile Server Actions: updateProfileAction and changePasswordAction with validation and normalization"
  - "Deno Edge Function pattern: Deno.serve + esm.sh imports + Deno.env.get for secrets"
  - "Vault secrets for pg_cron HTTP calls (project_url and anon_key stored securely)"

requirements-completed: [DASH-04, DASH-05, NOTIF-02, NOTIF-03, NOTIF-04]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 3 Plan 05: Dashboard Settings & Session Reminders Summary

**Profile edit/password change settings page with bilingual Deno Edge Function sending 10-minute session-end reminders via Resend and pg_cron**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T17:00:38Z
- **Completed:** 2026-03-08T17:03:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Settings page at /dashboard/settings with independent profile and password forms using useActionState
- Server Actions with name validation/normalization, current password verification before change
- Supabase Edge Function queries reservations ending in ~10 min, sends locale-aware reminder emails
- reminder_sent flag prevents duplicate reminders; expired pending_payment holds cleaned as side effect
- pg_cron + pg_net migration for minute-by-minute automated function invocation

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard settings page with profile and password forms** - `7303825` (feat)
2. **Task 2: Session reminder Edge Function + pg_cron schedule** - `c38ee08` (feat)

## Files Created/Modified
- `app/actions/profile.ts` - updateProfileAction and changePasswordAction Server Actions
- `app/[locale]/(member)/dashboard/settings/page.tsx` - Settings page with breadcrumb, two form sections
- `app/[locale]/(member)/dashboard/settings/ProfileForm.tsx` - Client form for name/phone editing
- `app/[locale]/(member)/dashboard/settings/PasswordForm.tsx` - Client form for password change
- `supabase/functions/session-reminder/index.ts` - Deno Edge Function for 10-min reminders + hold cleanup
- `supabase/migrations/0004_pg_cron_reminder.sql` - pg_cron/pg_net schedule with Vault secrets
- `messages/en.json` - Added Settings namespace (labels, buttons, errors)
- `messages/es.json` - Added Settings namespace (Spanish translations)

## Decisions Made
- Current password verified via signInWithPassword before allowing password change (prevents unauthorized changes even with session)
- Edge Function uses 1-minute time window (10-11 min before end) matching cron frequency to avoid duplicate processing
- Expired hold cleanup piggybacks on reminder function instead of separate cron job (simpler infrastructure)
- onboarding@resend.dev as FROM address (consistent with 03-01 confirmation emails; production will use custom domain)

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

Before the cron job will work:
1. Deploy the Edge Function: `supabase functions deploy session-reminder`
2. Set RESEND_API_KEY secret: `supabase secrets set RESEND_API_KEY=re_xxxxx`
3. Run migration 0004 in Supabase Dashboard SQL Editor
4. Replace placeholder values in Vault (project_url and anon_key) with actual values

## Issues Encountered

Pre-existing TypeScript errors in CourtDiagram.tsx, TimeSlotGrid.tsx, and proxy.ts unrelated to this plan. New files compile without errors.

## Next Phase Readiness
- Phase 3 reservations complete: all 5 plans executed
- Settings page ready for user testing
- Reminder system ready after Edge Function deployment and Vault configuration
- Phase 4 (Admin & CMS) can proceed

---
*Phase: 03-reservations*
*Completed: 2026-03-08*
