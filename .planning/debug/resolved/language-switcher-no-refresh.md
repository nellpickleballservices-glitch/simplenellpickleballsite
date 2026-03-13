---
status: resolved
trigger: "Language switcher only works sometimes. User has to manually change the locale in the URL because the switcher isn't refreshing the content."
created: 2026-03-13T00:00:00Z
updated: 2026-03-13T00:00:00Z
---

## Current Focus

hypothesis: LanguageSwitcher uses next/navigation Link + manual path building instead of next-intl's locale-aware navigation, causing client-side navigation that does not trigger a locale change in the next-intl middleware
test: Code review confirmed
expecting: n/a - diagnosed
next_action: Report diagnosis

## Symptoms

expected: Clicking language switcher changes locale and refreshes all content in the new language
actual: Switcher only works sometimes; user must manually change locale in URL to get content to refresh
errors: none reported
reproduction: Click language switcher to change from ES to EN or vice versa
started: Since implementation

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-03-13
  checked: components/LanguageSwitcher.tsx - imports and navigation method
  found: Uses `import Link from 'next/link'` (line 6) and `import { usePathname } from 'next/navigation'` (line 4). Manually builds locale paths with `buildLocalePath()` function. Does NOT use next-intl navigation primitives.
  implication: next/link performs client-side navigation (SPA-style). The locale change requires server-side re-rendering via the intl middleware to load new messages, but client-side navigation bypasses middleware entirely.

- timestamp: 2026-03-13
  checked: i18n/routing.ts configuration
  found: Uses `localePrefix: 'as-needed'` with defaultLocale 'es'. This means ES pages have no prefix, EN pages have /en prefix.
  implication: The manual path building in buildLocalePath is fragile - it strips/adds /en prefix manually rather than using the framework's navigation system.

- timestamp: 2026-03-13
  checked: Codebase for next-intl navigation setup (createNavigation)
  found: No `createNavigation` call exists anywhere in the codebase. The project never set up next-intl's locale-aware Link/useRouter.
  implication: The project is missing the standard next-intl 4 navigation layer that handles locale switching correctly.

- timestamp: 2026-03-13
  checked: middleware.ts - intl middleware integration
  found: next-intl middleware is correctly composed (line 82). It handles locale detection and routing on server-side requests.
  implication: Full page loads (hard navigation) DO hit middleware and work. Client-side navigations via next/link do NOT hit middleware, so locale doesn't change.

- timestamp: 2026-03-13
  checked: app/[locale]/layout.tsx - NextIntlClientProvider
  found: Messages are loaded server-side via getMessages() and passed to NextIntlClientProvider. The provider receives messages for the CURRENT locale at render time.
  implication: Client-side navigation to a different locale path doesn't re-run the layout's server component, so the provider keeps serving old locale messages.

- timestamp: 2026-03-13
  checked: "works sometimes" aspect
  found: The switcher builds correct href URLs. If the browser does a full navigation (e.g., first click after page load, or if Next.js prefetch cache misses), it works. If Next.js performs a cached client-side navigation, the URL changes but content stays stale.
  implication: This explains the intermittent nature - it depends on whether Next.js client router cache has the route prefetched.

## Resolution

root_cause: |
  TWO compounding issues:

  1. **Wrong Link component**: LanguageSwitcher imports `Link` from `next/link` instead of using next-intl's locale-aware navigation. Client-side navigation via next/link does not trigger the intl middleware, so the locale context, messages, and server components are not re-evaluated for the new locale.

  2. **No createNavigation setup**: The project never called `createNavigation(routing)` from `next-intl/navigation` to create locale-aware Link/useRouter/usePathname/redirect helpers. This is the standard next-intl 4 pattern for locale-aware client navigation.

  The "works sometimes" behavior is because:
  - Hard navigations (fresh page load, cache miss) DO hit the middleware and work correctly
  - Soft/client-side navigations stay in the React client router and skip middleware entirely

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []
