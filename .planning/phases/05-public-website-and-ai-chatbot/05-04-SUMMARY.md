---
phase: 05-public-website-and-ai-chatbot
plan: 04
subsystem: ui
tags: [mobile-nav, whatsapp, dropdown, motion, tailwind]

# Dependency graph
requires:
  - phase: 05-public-website-and-ai-chatbot
    provides: "Marketing layout, homepage, MobileNav component"
provides:
  - "Clean marketing layout without WhatsApp floating bubble"
  - "Dropdown-style mobile navigation (no slide-out drawer)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Click-outside handler for dropdown menus via useRef + mousedown listener"
    - "Absolute top-full positioning for navbar dropdowns"

key-files:
  created: []
  modified:
    - "app/[locale]/(marketing)/layout.tsx"
    - "app/[locale]/page.tsx"
    - "components/public/MobileNav.tsx"

key-decisions:
  - "WhatsApp bubble removed globally -- Contact page inline CTA is sole WhatsApp touchpoint"
  - "MobileNav uses absolute top-full positioning relative to sticky nav parent"

patterns-established:
  - "Dropdown menus use absolute top-full right-0 with opacity/y animation"

requirements-completed: [PUB-06]

# Metrics
duration: 1min
completed: 2026-03-13
---

# Phase 5 Plan 04: UAT Gap Closure Summary

**Removed WhatsApp floating bubble from all pages and rewrote MobileNav from slide-out drawer to dropdown menu**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-13T22:54:27Z
- **Completed:** 2026-03-13T22:55:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Removed WhatsAppBubble component from marketing layout and homepage (Contact page inline CTA remains)
- Rewrote MobileNav as absolute-positioned dropdown with opacity/y animation
- Eliminated slide-out drawer patterns: no fixed panel, no backdrop overlay, no body scroll lock
- Hamburger button now toggles open/close with X icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove WhatsApp bubble from marketing layout and homepage** - `f3907a9` (fix)
2. **Task 2: Rewrite MobileNav from slide-out drawer to dropdown menu** - `a69545a` (fix)

## Files Created/Modified
- `app/[locale]/(marketing)/layout.tsx` - Removed WhatsAppBubble import and render
- `app/[locale]/page.tsx` - Removed WhatsAppBubble import and render
- `components/public/MobileNav.tsx` - Complete rewrite from slide-out drawer to dropdown menu

## Decisions Made
- WhatsApp bubble removed globally -- Contact page inline CTA is the sole WhatsApp touchpoint
- MobileNav uses absolute top-full positioning relative to sticky nav parent for natural dropdown behavior
- Click-outside handler via useRef + mousedown event listener (no backdrop overlay needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT gap closure complete for tests 4 (WhatsApp overlap) and 5 (hamburger dropdown)
- All public website components finalized

---
*Phase: 05-public-website-and-ai-chatbot*
*Completed: 2026-03-13*
