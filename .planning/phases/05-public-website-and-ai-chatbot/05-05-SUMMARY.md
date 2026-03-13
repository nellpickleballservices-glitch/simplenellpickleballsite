---
phase: 05-public-website-and-ai-chatbot
plan: 05
subsystem: i18n
tags: [i18n, language-switcher, next-intl, gap-closure]
dependency_graph:
  requires: [i18n/routing.ts]
  provides: [i18n/navigation.ts, locale-aware-language-switching]
  affects: [components/LanguageSwitcher.tsx]
tech_stack:
  added: [next-intl/navigation createNavigation]
  patterns: [locale-aware-router-replace]
key_files:
  created: [i18n/navigation.ts]
  modified: [components/LanguageSwitcher.tsx]
decisions:
  - "router.replace with locale option over Link href for reliable locale switching"
  - "Button elements replace Link elements in language dropdown (no href navigation needed)"
metrics:
  duration: 1 min
  completed: "2026-03-13T22:55:19Z"
---

# Phase 05 Plan 05: Language Switcher Fix Summary

Locale-aware navigation via next-intl createNavigation replaces manual path building for reliable language switching

## What Was Done

### Task 1: Create i18n/navigation.ts and rewrite LanguageSwitcher

Created `i18n/navigation.ts` exporting locale-aware `Link`, `useRouter`, `usePathname`, and `redirect` from `createNavigation(routing)`. Rewrote `LanguageSwitcher.tsx` to import `useRouter` and `usePathname` from `@/i18n/navigation` instead of `next/navigation` and `next/link`. Replaced `<Link>` elements with `<button>` elements calling `router.replace(pathname, { locale: targetLocale })`. Removed the fragile `buildLocalePath()` function entirely.

**Commit:** 773bd13

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `grep "next/link\|next/navigation" components/LanguageSwitcher.tsx` -- no matches (PASS)
2. `grep "i18n/navigation" components/LanguageSwitcher.tsx` -- match found (PASS)
3. `grep "createNavigation" i18n/navigation.ts` -- match found (PASS)
4. `npx next build` -- succeeds (PASS)
