---
phase: 05-public-website-and-ai-chatbot
plan: 01
subsystem: ui
tags: [motion, framer-motion, footer, whatsapp, navbar, mobile-nav, content-helper, i18n]

# Dependency graph
requires:
  - phase: 04-admin-and-cms
    provides: content_blocks table and CMS editor
  - phase: 01-foundation
    provides: Navbar, LanguageSwitcher, i18n setup, Supabase server client
provides:
  - MotionProvider (LazyMotion wrapper for all public pages)
  - ScrollReveal, StaggerChildren, HeroEntrance animation wrappers
  - getContentBlocks/getContentBlock helpers for CMS data fetching
  - Footer with nav links, social icons, WhatsApp, email
  - WhatsAppBubble floating component with bilingual greeting
  - MobileNav hamburger slide-out with full navigation
  - Enhanced Navbar with sticky behavior, public page links, mobile support
  - Migration 0006 seeding footer_social_links, learn_court_dimensions, contact_info
affects: [05-02, 05-03, public-pages]

# Tech tracking
tech-stack:
  added: [motion, openai]
  patterns: [LazyMotion provider wrapping public pages, m.div animation components, content block fetching by prefix]

key-files:
  created:
    - lib/content.ts
    - components/motion/MotionProvider.tsx
    - components/motion/ScrollReveal.tsx
    - components/motion/StaggerChildren.tsx
    - components/motion/HeroEntrance.tsx
    - components/Footer.tsx
    - components/public/WhatsAppBubble.tsx
    - components/public/MobileNav.tsx
    - supabase/migrations/0006_footer_social_links.sql
  modified:
    - components/Navbar.tsx
    - messages/en.json
    - messages/es.json
    - middleware.ts
    - tsconfig.json

key-decisions:
  - "motion/react imports (not framer-motion) -- motion v12 renamed package"
  - "Content helper uses dynamic column selection for locale (content_es/content_en) with type casting"
  - "MobileNav uses AnimatePresence from motion/react for slide-in/out panel animation"
  - "WhatsApp bubble bottom-left z-40, chatbot will be bottom-right z-50 (no overlap)"

patterns-established:
  - "Motion wrappers: use client components with m.div, rely on ancestor MotionProvider for LazyMotion context"
  - "Content fetching: getContentBlocks(prefix, locale) returns Record<string, string> map"
  - "Footer: Server Component fetching social links from CMS content_blocks"

requirements-completed: [PUB-06]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 5 Plan 1: Shared Infrastructure Summary

**Motion animation wrappers, content helper, Footer with social links, WhatsApp bubble, MobileNav hamburger menu, and enhanced sticky Navbar with public page links**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T05:49:57Z
- **Completed:** 2026-03-13T05:54:51Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Installed motion and openai packages; created 4 motion animation wrapper components (MotionProvider, ScrollReveal, StaggerChildren, HeroEntrance)
- Built content helper (getContentBlocks/getContentBlock) for CMS data fetching on public pages
- Created Footer with 3-column layout (brand/nav/social), WhatsApp bubble with bilingual greeting, and MobileNav with hamburger slide-out panel
- Enhanced Navbar with sticky backdrop-blur, public page links (About, Learn, Events, Contact), and mobile hamburger integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, create migration, content helper, and motion wrappers** - `6cecfe9` (feat)
2. **Task 2: Create Footer, WhatsApp bubble, MobileNav, and enhance Navbar** - `bb88678` (feat)

## Files Created/Modified
- `lib/content.ts` - Content block fetching helper (getContentBlocks, getContentBlock)
- `components/motion/MotionProvider.tsx` - LazyMotion wrapper with domAnimation features
- `components/motion/ScrollReveal.tsx` - Viewport-triggered fade-in/slide-up wrapper
- `components/motion/StaggerChildren.tsx` - Staggered entrance animation for child elements
- `components/motion/HeroEntrance.tsx` - Above-the-fold staggered entrance animation
- `components/Footer.tsx` - Public footer with nav links, social icons, WhatsApp, email
- `components/public/WhatsAppBubble.tsx` - Floating WhatsApp link button bottom-left
- `components/public/MobileNav.tsx` - Hamburger slide-out menu for mobile
- `components/Navbar.tsx` - Enhanced with sticky, public links, mobile hamburger
- `supabase/migrations/0006_footer_social_links.sql` - Seeds footer_social_links, learn_court_dimensions, contact_info
- `messages/en.json` - Added Footer, Nav (about/learn/events/contact), Public, Contact namespaces
- `messages/es.json` - Added Footer, Nav, Public, Contact namespaces (Spanish)
- `middleware.ts` - Fixed cookies.set signature for Next.js 16
- `tsconfig.json` - Excluded supabase/functions from type checking

## Decisions Made
- Used `motion/react` imports (motion v12 renamed package from framer-motion)
- Content helper uses dynamic column selection for locale with Record type casting to avoid Supabase generic type constraints
- MobileNav imports logoutAction server action directly (Next.js App Router supports this in client components)
- WhatsApp bubble at z-40 (below future chatbot at z-50) per CONTEXT.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed motion variants ease type narrowing**
- **Found during:** Task 2 (type checking)
- **Issue:** TypeScript narrowed `ease: 'easeOut'` to `string` type, incompatible with motion's `Easing` type
- **Fix:** Added `as const` to ease values in HeroEntrance and StaggerChildren item variants
- **Files modified:** components/motion/HeroEntrance.tsx, components/motion/StaggerChildren.tsx
- **Committed in:** bb88678 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed pre-existing middleware.ts cookies.set signature**
- **Found during:** Task 2 (build verification)
- **Issue:** `request.cookies.set(name, value, options)` uses 3-arg signature removed in Next.js 16
- **Fix:** Changed to `request.cookies.set(name, value)` for request cookies and `set({ name, value, ...options })` for response cookies
- **Files modified:** middleware.ts
- **Committed in:** bb88678 (Task 2 commit)

**3. [Rule 3 - Blocking] Excluded supabase/functions from tsconfig**
- **Found during:** Task 2 (build verification)
- **Issue:** Deno edge function imports (`https://esm.sh/...`) fail TypeScript compilation in Node environment
- **Fix:** Added `supabase/functions` to tsconfig.json exclude array
- **Files modified:** tsconfig.json
- **Committed in:** bb88678 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for successful build. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

- **NEXT_PUBLIC_WHATSAPP_PHONE**: Set to club's WhatsApp business phone number (digits only with country code, e.g., 18091234567). WhatsApp bubble will not render without this.
- **Migration 0006**: Run `supabase/migrations/0006_footer_social_links.sql` in Supabase Dashboard SQL Editor to seed content blocks.

## Next Phase Readiness
- All shared infrastructure components ready for Plans 02 and 03
- Motion wrappers, Footer, WhatsApp bubble, and enhanced Navbar available for all public pages
- Content helper ready for CMS-driven page content fetching

---
*Phase: 05-public-website-and-ai-chatbot*
*Completed: 2026-03-13*
