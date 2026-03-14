---
phase: 01-foundation
plan: "04"
subsystem: ui
tags: [next-intl, i18n, typescript, react, nextjs, routing, middleware]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: next.config.ts with withNextIntl plugin already wired
  - phase: 01-foundation/01-03
    provides: auth UI components with TODO: i18n markers to externalize

provides:
  - next-intl 4 routing config (locales es/en, defaultLocale es, localePrefix as-needed)
  - next-intl 4 request config loading messages/{locale}.json
  - messages/es.json and messages/en.json with Auth, Nav, Home, Brand namespaces
  - NextIntlClientProvider wrapping entire app in layout.tsx
  - Zero hardcoded UI strings in any .tsx component
  - LanguageSwitcher component (globe icon, ES/EN dropdown, saves locale_pref)
  - proxy.ts composing Supabase auth + next-intl middleware

affects:
  - Phase 2 (all pages must use useTranslations — pattern established)
  - Phase 3 (reservation pages must add keys to messages files)
  - All future feature phases (i18n infrastructure is locked)

# Tech tracking
tech-stack:
  added:
    - next-intl 4.8.3 (already in package.json, now fully wired)
    - next/font/google (Bebas Neue + Inter loaded in layout.tsx)
  patterns:
    - useTranslations('Namespace.sub') in both Server and Client Components
    - Namespace structure: Auth.signup, Auth.login, Auth.resetPassword, Auth.updatePassword, Auth.completeProfile, Nav, Home, Brand
    - intlMiddleware composed after Supabase auth check in proxy.ts; auth cookies copied into intl response

key-files:
  created:
    - i18n/routing.ts
    - i18n/request.ts
    - messages/es.json
    - messages/en.json
    - components/LanguageSwitcher.tsx
  modified:
    - app/[locale]/layout.tsx
    - app/[locale]/page.tsx
    - app/[locale]/WelcomeBanner.tsx
    - app/[locale]/(auth)/signup/SignupForm.tsx
    - app/[locale]/(auth)/signup/page.tsx
    - app/[locale]/(auth)/login/LoginForm.tsx
    - app/[locale]/(auth)/login/page.tsx
    - app/[locale]/(auth)/reset-password/ResetPasswordForm.tsx
    - app/[locale]/(auth)/reset-password/page.tsx
    - app/[locale]/(auth)/reset-password/update/UpdatePasswordForm.tsx
    - app/[locale]/(auth)/reset-password/update/page.tsx
    - app/[locale]/(auth)/signup/complete-profile/CompleteProfileForm.tsx
    - app/[locale]/(auth)/signup/complete-profile/page.tsx
    - proxy.ts
    - tests/unit/noHardcodedStrings.test.ts

key-decisions:
  - "noHardcodedStrings test scans for 'TODO: i18n' (not '// TODO: i18n') — JSX comments use {/* */} syntax, plain string match catches both styles"
  - "Server Components (page.tsx files) use useTranslations() directly — next-intl 4 supports both Server and Client Component usage"
  - "WelcomeBanner uses t('welcome', { name }) interpolation instead of string concatenation"
  - "LanguageSwitcher saves locale_pref to profiles table directly via Supabase client — no Server Action needed for this simple update"
  - "Bebas Neue + Inter fonts loaded via next/font/google in layout.tsx with CSS variable pattern"

patterns-established:
  - "i18n pattern: const t = useTranslations('Namespace') at top of component; t('key') for all strings"
  - "Message key structure: flat keys per namespace (Auth.signup.title, not Auth.signup.form.title)"
  - "Brand strings in Brand namespace — reused across all auth pages for NELL logo/tagline"
  - "Pending state strings follow naming: submitButton / submittingButton pattern"

requirements-completed: [I18N-01, I18N-02]

# Metrics
duration: 10min
completed: 2026-03-08
---

# Phase 01 Plan 04: i18n Infrastructure Summary

**next-intl 4 wired end-to-end: routing config, ES/EN message files, NextIntlClientProvider in layout, all 12 auth component strings externalized via useTranslations(), globe LanguageSwitcher with locale_pref persistence, and proxy.ts composing Supabase auth + intl middleware**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-08T03:29:19Z
- **Completed:** 2026-03-08T03:38:43Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Created i18n/routing.ts and i18n/request.ts with correct next-intl 4 API (defineRouting + getRequestConfig)
- Created messages/es.json and messages/en.json with matching key structures across 5 namespaces (Auth, Nav, Home, Brand)
- Removed all 12 files worth of `{/* TODO: i18n */}` comments — noHardcodedStrings unit test now passes with real assertion
- Created LanguageSwitcher component with globe icon, ES/EN dropdown, and locale_pref save for logged-in users
- Updated proxy.ts to compose Supabase auth + next-intl middleware (auth cookies forwarded into intl response)

## Task Commits

Each task was committed atomically:

1. **TDD RED: noHardcodedStrings test** - `9e03161` (test)
2. **Task 1: i18n config + message files + layout** - `e30321a` (feat)
3. **Task 2: externalize strings + LanguageSwitcher + proxy** - `71cd371` (feat)

**Plan metadata:** (docs commit - see below)

_Note: TDD RED committed separately; GREEN + implementation in single feat commit per task_

## Files Created/Modified

- `i18n/routing.ts` - defineRouting with locales ['es','en'], defaultLocale 'es', localePrefix 'as-needed'
- `i18n/request.ts` - getRequestConfig loading messages/{locale}.json server-side
- `messages/es.json` - All Spanish UI strings (Auth, Nav, Home, Brand namespaces)
- `messages/en.json` - All English UI strings (same key structure as es.json)
- `app/[locale]/layout.tsx` - NextIntlClientProvider wrapping children; Bebas Neue + Inter fonts
- `app/[locale]/page.tsx` - Home page strings via useTranslations('Home')
- `app/[locale]/WelcomeBanner.tsx` - Welcome message via t('welcome', { name }) interpolation
- `app/[locale]/(auth)/signup/SignupForm.tsx` - All form labels/buttons via useTranslations('Auth.signup')
- `app/[locale]/(auth)/signup/page.tsx` - Page title via translations
- `app/[locale]/(auth)/login/LoginForm.tsx` - All form labels/buttons via useTranslations('Auth.login')
- `app/[locale]/(auth)/login/page.tsx` - Page title via translations
- `app/[locale]/(auth)/reset-password/ResetPasswordForm.tsx` - All strings via useTranslations('Auth.resetPassword')
- `app/[locale]/(auth)/reset-password/page.tsx` - Page title via translations
- `app/[locale]/(auth)/reset-password/update/UpdatePasswordForm.tsx` - All strings via useTranslations
- `app/[locale]/(auth)/reset-password/update/page.tsx` - Page title via translations
- `app/[locale]/(auth)/signup/complete-profile/CompleteProfileForm.tsx` - All strings via useTranslations
- `app/[locale]/(auth)/signup/complete-profile/page.tsx` - Page title/subtitle via translations
- `proxy.ts` - Adds intlMiddleware after Supabase auth; copies auth cookies into intl response
- `components/LanguageSwitcher.tsx` - New component: globe icon, ES/EN dropdown, locale_pref save
- `tests/unit/noHardcodedStrings.test.ts` - Real implementation replacing stub todos

## Decisions Made

- **noHardcodedStrings check pattern:** The plan specified `// TODO: i18n` but TSX files use JSX comment syntax `{/* TODO: i18n */}`. The test correctly checks for `TODO: i18n` (without `//`) to catch both comment styles.
- **Server Components use useTranslations directly:** next-intl 4 supports useTranslations in Server Components without any wrapper — page.tsx files call it at the top level without `'use client'`.
- **Brand namespace:** Extracted "NELL" and "Pickleball Club" into a `Brand` namespace rather than duplicating in every auth namespace, following DRY principle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] noHardcodedStrings test pattern corrected from `// TODO: i18n` to `TODO: i18n`**
- **Found during:** Task 1 TDD RED phase
- **Issue:** Plan specified checking for `// TODO: i18n` but TSX component files use JSX comment syntax `{/* TODO: i18n */}` — the `//` prefix is absent, so the original plan pattern would never match any violations (test passes falsely)
- **Fix:** Changed test to check for `TODO: i18n` (plain string) which correctly matches `{/* TODO: i18n */}` in JSX files
- **Files modified:** tests/unit/noHardcodedStrings.test.ts
- **Verification:** Test now correctly detected 12 files in RED phase; passes in GREEN phase
- **Committed in:** 9e03161 (TDD RED commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test pattern)
**Impact on plan:** Essential fix — without it, the test would always pass falsely (false negative), providing no protection against hardcoded strings.

## Issues Encountered

None beyond the test pattern deviation documented above.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- i18n infrastructure is complete and locked — all future pages must use useTranslations()
- Add new message keys to both messages/es.json and messages/en.json simultaneously
- LanguageSwitcher is ready to be placed in a navbar component (Phase 2 or later)
- locale-routing.spec.ts Playwright stubs remain skipped (require running server — E2E phase)

---
*Phase: 01-foundation*
*Completed: 2026-03-08*
