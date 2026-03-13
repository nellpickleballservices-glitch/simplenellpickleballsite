---
phase: 05-public-website-and-ai-chatbot
plan: 02
subsystem: ui
tags: [public-pages, cms, seo, framer-motion, scroll-reveal, timeline, toc, events, contact, whatsapp]

# Dependency graph
requires:
  - phase: 05-public-website-and-ai-chatbot
    provides: Motion wrappers, content helper, Footer, WhatsApp bubble, MobileNav, Navbar
  - phase: 04-admin-and-cms
    provides: content_blocks table, CMS editor, events table
provides:
  - Marketing layout with MotionProvider, Footer, WhatsAppBubble
  - Homepage rewired to CMS content_blocks with animations
  - About page with vision/mission from CMS and 6-value vertical timeline
  - Learn Pickleball page with sticky TOC, scroll spy, 5 CMS sections, SVG court diagram
  - Events page with upcoming events from Supabase, card grid with type badges
  - Contact page with WhatsApp CTA, phone, email, social links
  - Bilingual SEO metadata on all public pages (title, description, OG, hreflang)
affects: [05-03, public-pages, seo]

# Tech tracking
tech-stack:
  added: []
  patterns: [CMS content rendering via dangerouslySetInnerHTML, IntersectionObserver scroll spy, SVG court diagram]

key-files:
  created:
    - app/[locale]/(marketing)/layout.tsx
    - app/[locale]/(marketing)/about/page.tsx
    - app/[locale]/(marketing)/contact/page.tsx
    - app/[locale]/(marketing)/learn-pickleball/page.tsx
    - app/[locale]/(marketing)/events/page.tsx
    - components/public/ValueTimeline.tsx
    - components/public/TableOfContents.tsx
    - components/public/EventCard.tsx
    - components/public/CourtDiagram.tsx
  modified:
    - app/[locale]/page.tsx
    - components/Navbar.tsx
    - components/Footer.tsx
    - components/public/MobileNav.tsx

key-decisions:
  - "Homepage outside marketing route group gets its own MotionProvider+Footer+WhatsApp (not wrapped by marketing layout)"
  - "Nav links updated from /learn to /learn-pickleball to match route folder name"
  - "About page values use i18n strings for titles/descriptions (not CMS) for type safety"
  - "EventCard uses locale-based date formatting via toLocaleDateString for natural display"
  - "CourtDiagram is a static SVG component (no animation needed per plan)"

patterns-established:
  - "Public page pattern: RSC with generateMetadata, HeroEntrance for hero, ScrollReveal for sections, CMS content via getContentBlocks"
  - "Contrast fix: all secondary text uses text-offwhite/70 minimum, icons use brand colors (lime/turquoise/sunset)"
  - "Events query pattern: filter by event_date >= today, order ascending, cast to Event type"

requirements-completed: [PUB-01, PUB-02, PUB-03, PUB-04, PUB-05]

# Metrics
duration: 7min
completed: 2026-03-13
---

# Phase 5 Plan 2: Public Pages Summary

**Five bilingual public pages (Home, About, Learn, Events, Contact) with CMS content, scroll animations, sticky TOC, event card grid, and SEO metadata**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-13T05:57:04Z
- **Completed:** 2026-03-13T06:04:22Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created marketing layout wrapper with MotionProvider, Footer, and WhatsAppBubble for all public pages
- Rewired homepage to CMS content_blocks with HeroEntrance and ScrollReveal animations, contrast fixes applied
- Built About page with vision/mission from CMS and 6-value vertical timeline with alternating sides and staggered scroll reveals
- Created Learn Pickleball page with sticky TOC (IntersectionObserver scroll spy on desktop, accordion on mobile), 5 CMS sections, and SVG court diagram
- Built Events page that queries upcoming events from Supabase with 2-column card grid, colored type badges, staggered entrance, and empty state
- Created Contact page with WhatsApp CTA, phone, email, social links, and hours of operation

## Task Commits

Each task was committed atomically:

1. **Task 1: Marketing layout, Home page CMS rewire, About page, Contact page** - `689f4f1` (feat)
2. **Task 2: Learn Pickleball page, Events page, supporting components** - `84174fb` (feat)

## Files Created/Modified
- `app/[locale]/(marketing)/layout.tsx` - Marketing layout with MotionProvider, Footer, WhatsAppBubble
- `app/[locale]/page.tsx` - Homepage rewired to CMS with animations and generateMetadata
- `app/[locale]/(marketing)/about/page.tsx` - About page with vision/mission/values timeline
- `app/[locale]/(marketing)/contact/page.tsx` - Contact page with WhatsApp CTA
- `app/[locale]/(marketing)/learn-pickleball/page.tsx` - Learn page with sticky TOC and CMS sections
- `app/[locale]/(marketing)/events/page.tsx` - Events page with Supabase query and card grid
- `components/public/ValueTimeline.tsx` - Vertical timeline with alternating sides and scroll reveals
- `components/public/TableOfContents.tsx` - Sticky TOC with IntersectionObserver scroll spy
- `components/public/EventCard.tsx` - Event card with type badge and image/icon fallback
- `components/public/CourtDiagram.tsx` - SVG court diagram with labeled dimensions
- `components/Navbar.tsx` - Updated /learn to /learn-pickleball link
- `components/Footer.tsx` - Updated /learn to /learn-pickleball link
- `components/public/MobileNav.tsx` - Updated /learn to /learn-pickleball link

## Decisions Made
- Homepage is outside the (marketing) route group, so it gets its own MotionProvider + Footer + WhatsApp wrapping (marketing layout only applies to pages inside the route group)
- About page values use hardcoded i18n strings rather than parsing CMS content_blocks for type safety and consistent ordering
- Nav links updated from `/learn` to `/learn-pickleball` to match the actual route folder name
- EventCard uses `toLocaleDateString` with locale-appropriate format string for natural date display
- CourtDiagram rendered as static SVG (no animation) per plan specification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed nav links from /learn to /learn-pickleball**
- **Found during:** Task 1 (marketing layout creation)
- **Issue:** Navbar, Footer, and MobileNav all linked to `/learn` but the route folder is `learn-pickleball`
- **Fix:** Updated href from `/learn` to `/learn-pickleball` in all three navigation components
- **Files modified:** components/Navbar.tsx, components/Footer.tsx, components/public/MobileNav.tsx
- **Committed in:** 689f4f1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Navigation fix necessary for correct routing. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no additional external service configuration required beyond what was set up in Plan 01.

## Next Phase Readiness
- All five public pages are live and accessible at their routes
- Marketing layout provides consistent wrapper for future public pages
- Ready for Plan 03 (AI Chatbot)
- All pages serve CMS content that can be edited via the admin CMS editor

---
*Phase: 05-public-website-and-ai-chatbot*
*Completed: 2026-03-13*
