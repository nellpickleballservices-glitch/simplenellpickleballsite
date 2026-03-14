---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [supabase, react, next-app-router, server-actions, oauth, google, tdd, vitest, tailwind]

# Dependency graph
requires:
  - phase: 01-01
    provides: Route groups, proxy.ts cookie infrastructure
  - phase: 01-02
    provides: lib/supabase/server.ts createClient, lib/supabase/client.ts createClient, profiles table schema

provides:
  - lib/utils/normalizeName.ts — normalizeName() and validateName() with accent-safe split/map approach
  - lib/utils/passwordValidation.ts — validatePasswordLength() and validatePasswordMatch()
  - app/actions/auth.ts — signUpAction, loginAction, logoutAction, resetPasswordAction, updatePasswordAction (useActionState-compatible)
  - app/[locale]/(auth)/signup/SignupForm.tsx — signup form with inline name validation, optional plan cards
  - app/[locale]/(auth)/login/LoginForm.tsx — login form with Google OAuth button and forgot password link
  - app/[locale]/(auth)/reset-password/ResetPasswordForm.tsx — password reset request form
  - app/[locale]/(auth)/reset-password/update/ — PKCE email link landing page for new password
  - app/[locale]/(auth)/signup/complete-profile/ — Google OAuth phone collection step
  - app/[locale]/WelcomeBanner.tsx — full-width lime banner fading after 3 seconds
  - app/[locale]/page.tsx — home page with WelcomeBanner triggered by ?welcome=1
affects: [02-memberships, 03-reservations, 04-public, 05-admin, any phase reading user session]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useActionState Server Action signature: (prevState, formData) not (formData) — required for React 19 useActionState hook
    - TDD Red-Green: failing tests written before implementation, accent-safe name normalization using split/map
    - WelcomeBanner: CSS opacity transition (not toast) triggered by ?welcome=1 search param set by redirect in Server Action
    - Google OAuth flow: signInWithOAuth called client-side, callback route checks profiles.phone, redirects to /signup/complete-profile

key-files:
  created:
    - lib/utils/normalizeName.ts
    - lib/utils/passwordValidation.ts
    - app/actions/auth.ts
    - app/[locale]/(auth)/signup/SignupForm.tsx
    - app/[locale]/(auth)/login/LoginForm.tsx
    - app/[locale]/(auth)/reset-password/ResetPasswordForm.tsx
    - app/[locale]/(auth)/reset-password/update/UpdatePasswordForm.tsx
    - app/[locale]/(auth)/reset-password/update/page.tsx
    - app/[locale]/(auth)/signup/complete-profile/page.tsx
    - app/[locale]/(auth)/signup/complete-profile/CompleteProfileForm.tsx
    - app/[locale]/(auth)/signup/complete-profile/actions.ts
    - app/[locale]/WelcomeBanner.tsx
  modified:
    - tests/unit/normalizeName.test.ts
    - tests/unit/passwordValidation.test.ts
    - app/[locale]/(auth)/login/page.tsx
    - app/[locale]/(auth)/signup/page.tsx
    - app/[locale]/(auth)/reset-password/page.tsx
    - app/[locale]/page.tsx
    - app/actions/auth.ts

key-decisions:
  - "Server Action signature: (_prevState, formData) required for React 19 useActionState — plans calling these actions must use useActionState, not direct form action prop"
  - "normalizeName uses split/map instead of \\b\\w regex — regex treats accented chars as word boundaries causing MaríA instead of María"
  - "WelcomeBanner triggered via ?welcome=1 search param in redirect from signUpAction — keeps banner logic in Server Component (page.tsx reads user session), banner itself is Client Component"
  - "complete-profile step has its own actions.ts file — avoids circular imports between complete-profile and app/actions/auth.ts"

patterns-established:
  - "Pattern: Server Actions used with useActionState must accept (prevState: State, formData: FormData) as parameters"
  - "Pattern: Auth pages = Server Component page.tsx wrapping Client Component Form.tsx — pages handle data fetching, forms handle interactivity"
  - "Pattern: Inline validation on blur for name fields using validateName() from lib/utils — not toast, not submit-only"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]

# Metrics
duration: 7min
completed: 2026-03-08
---

# Phase 1 Plan 03: Auth Flows Summary

**Supabase email+password and Google OAuth auth flows with TDD validation utilities (normalizeName, passwordValidation), Server Actions with useActionState, NELL-branded auth pages, and WelcomeBanner triggered by ?welcome=1 redirect**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-08T03:13:03Z
- **Completed:** 2026-03-08T03:20:00Z
- **Tasks:** 3
- **Files modified:** 17 (12 created, 5 updated)

## Accomplishments

- TDD-first validation utilities: 13 unit tests passing, accent-safe normalizeName (maría → María), validateName (rejects digits, empty), validatePasswordLength (8+ chars), validatePasswordMatch
- Five Server Actions covering complete auth lifecycle: signUpAction (name normalize + profiles INSERT + /?welcome=1), loginAction, logoutAction, resetPasswordAction (PKCE email), updatePasswordAction
- Full auth UI in NELL brand (midnight bg, lime primary, turquoise borders): signup with optional plan cards (VIP/Basic), login with Google OAuth button and forgot password link, reset password request/update pages, Google OAuth complete-profile step, WelcomeBanner with 3-second CSS fade

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD validation utilities** - `13b6b3e` (feat)
2. **Task 2: Server Actions** - `3ae299b` (feat)
3. **Task 3: Auth UI + WelcomeBanner** - `1ef5e30` (feat)

## Files Created/Modified

- `lib/utils/normalizeName.ts` - normalizeName() (split/map, accent-safe) + validateName() (rejects digits, empty)
- `lib/utils/passwordValidation.ts` - validatePasswordLength() (8+ chars) + validatePasswordMatch()
- `tests/unit/normalizeName.test.ts` - 8 assertions covering trim, capitalize, accents, validation
- `tests/unit/passwordValidation.test.ts` - 5 assertions covering length and match
- `app/actions/auth.ts` - 5 Server Actions (signUpAction, loginAction, logoutAction, resetPasswordAction, updatePasswordAction) with useActionState-compatible (prevState, formData) signature
- `app/[locale]/(auth)/signup/SignupForm.tsx` - signup form: all fields, blur validation, plan cards, useActionState
- `app/[locale]/(auth)/signup/page.tsx` - signup page wrapper (Server Component)
- `app/[locale]/(auth)/login/LoginForm.tsx` - login form + Google OAuth button (client-side signInWithOAuth) + forgot password link
- `app/[locale]/(auth)/login/page.tsx` - login page wrapper (Server Component)
- `app/[locale]/(auth)/reset-password/ResetPasswordForm.tsx` - reset request form with success state
- `app/[locale]/(auth)/reset-password/page.tsx` - reset password page wrapper
- `app/[locale]/(auth)/reset-password/update/UpdatePasswordForm.tsx` - new password form for PKCE flow
- `app/[locale]/(auth)/reset-password/update/page.tsx` - update password page wrapper
- `app/[locale]/(auth)/signup/complete-profile/CompleteProfileForm.tsx` - Google OAuth phone collection
- `app/[locale]/(auth)/signup/complete-profile/actions.ts` - completeOAuthProfileAction (upserts profiles)
- `app/[locale]/(auth)/signup/complete-profile/page.tsx` - complete-profile page wrapper
- `app/[locale]/WelcomeBanner.tsx` - Client Component: lime banner, useEffect + setTimeout + opacity transition for 3s fade
- `app/[locale]/page.tsx` - home page: reads ?welcome=1, fetches profile first_name, renders WelcomeBanner

## Decisions Made

- **useActionState signature:** Server Actions updated to `(_prevState: AuthActionResult, formData: FormData)` — required by React 19's `useActionState` hook. Future plans building forms against these actions must use `useActionState`.
- **normalizeName approach:** `split(/\s+/).map(capitalize)` instead of `\b\w` regex — `\b` treats boundaries after accented chars incorrectly, producing `MaríA` instead of `María`.
- **WelcomeBanner triggered by ?welcome=1:** `signUpAction` redirects to `/?welcome=1`, home page reads search param server-side, passes `firstName` from profiles to Client Component. Keeps session read in Server Component.
- **complete-profile/actions.ts:** Separate file from `app/actions/auth.ts` to avoid circular imports and keep the complete-profile route group self-contained.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] accent-safe normalizeName using split/map**
- **Found during:** Task 1 (TDD — GREEN phase)
- **Issue:** Initial `\b\w` regex produced `MaríA` for input `maría` — `\b` treats boundary between accented `í` and `a` as a word start, uppercasing `a` to `A`
- **Fix:** Replaced `.replace(/\b\w/g, ...)` with `.split(/\s+/).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')` — splits on whitespace only, no boundary issues
- **Files modified:** `lib/utils/normalizeName.ts`
- **Verification:** Unit test `"maría" → "María"` passes (13/13 tests green)
- **Committed in:** `13b6b3e` (Task 1 commit)

**2. [Rule 1 - Bug] Server Action signature updated for useActionState**
- **Found during:** Task 3 (TypeScript check on auth UI files)
- **Issue:** TypeScript TS2769 — `useActionState(signUpAction, initialState)` requires action signature `(prevState: State, payload: unknown) => Promise<State>`, but actions were `(formData: FormData) => Promise<State>`
- **Fix:** Added `_prevState: AuthActionResult` as first parameter to all 5 Server Actions and the complete-profile action
- **Files modified:** `app/actions/auth.ts`, `app/[locale]/(auth)/signup/complete-profile/actions.ts`
- **Verification:** TypeScript reports 0 errors on auth files after fix
- **Committed in:** `1ef5e30` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes required for correctness — accent handling and proper React 19 useActionState type compatibility. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `proxy.ts` (from plan 01-01): `request.cookies.set()` expects `[key, value]` tuple but receives `[key, value, options]`. This is out of scope for this plan and does not affect the auth files. Logged to deferred items.

## User Setup Required

None — auth Server Actions connect to Supabase via the existing `createClient()` from plan 01-02. Google OAuth configuration in the Supabase dashboard (provider setup and authorized redirect URLs) is a one-time external step documented in plan 01-02 user setup.

## Next Phase Readiness

- Auth flows complete: signup, login, logout, password reset (PKCE), Google OAuth with profile completion
- All auth pages styled with NELL brand (midnight/lime/turquoise) — ready for Phase 1 Plan 04 (i18n)
- All hardcoded strings marked `// TODO: i18n` — plan 01-04 can grep for these and move to messages/
- Server Actions exported from `app/actions/auth.ts` — Phase 2+ can import `logoutAction` for nav logout button
- WelcomeBanner pattern established: any Server Action can redirect to `/?welcome=1` to trigger welcome message

---
*Phase: 01-foundation*
*Completed: 2026-03-08*
