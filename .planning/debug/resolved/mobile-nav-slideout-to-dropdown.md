---
status: resolved
trigger: "Mobile hamburger menu opens as a slide-out panel from the right. User wants a standard dropdown menu instead."
created: 2026-03-13T00:00:00Z
updated: 2026-03-13T00:00:00Z
---

## Current Focus

hypothesis: MobileNav uses fixed-position full-height slide-in panel with x-axis animation; needs to become a relative/absolute dropdown with y-axis animation
test: Code review of MobileNav.tsx layout and animation props
expecting: Confirm panel uses fixed positioning, x-axis motion, body scroll lock, and backdrop overlay
next_action: Return diagnosis

## Symptoms

expected: Hamburger menu opens a standard dropdown that drops down from the navbar
actual: Hamburger menu opens a full-height slide-out panel from the right edge, with backdrop overlay and body scroll lock
errors: N/A (UI behavior gap, not a code error)
reproduction: Click hamburger icon on mobile viewport
started: Current implementation — built this way originally

## Eliminated

(none — root cause identified on first pass)

## Evidence

- timestamp: 2026-03-13
  checked: MobileNav.tsx lines 72-78 — panel motion and layout
  found: Panel uses `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}` with class `fixed top-0 right-0 z-50 h-full w-72 bg-midnight border-l border-charcoal flex flex-col`
  implication: This is a right-edge slide-in panel, full viewport height, fixed position — classic slide-out drawer pattern

- timestamp: 2026-03-13
  checked: MobileNav.tsx lines 62-70 — backdrop overlay
  found: Full-screen backdrop `fixed inset-0 z-50 bg-black/60` with fade animation
  implication: Backdrop overlay is a slide-out panel pattern; a dropdown menu does not need a full-screen backdrop

- timestamp: 2026-03-13
  checked: MobileNav.tsx lines 25-34 — body scroll lock
  found: useEffect locks body scroll with `document.body.style.overflow = 'hidden'` when open
  implication: Body scroll lock is for full-panel overlays; a dropdown menu should not lock body scroll

- timestamp: 2026-03-13
  checked: MobileNav.tsx lines 80-92 — close button
  found: Dedicated close button (X icon) in top-right of panel
  implication: Slide-out panels need explicit close buttons; a dropdown can simply toggle via the hamburger itself

- timestamp: 2026-03-13
  checked: MobileNav.tsx lines 136-172 — bottom section with mt-auto
  found: Login/signup/logout buttons pushed to bottom of panel via `mt-auto`
  implication: This vertical space distribution only makes sense in a full-height panel; a dropdown should stack items naturally

- timestamp: 2026-03-13
  checked: Navbar.tsx line 119 — MobileNav integration point
  found: `<MobileNav>` is rendered inside the `<nav>` element, which is the sticky navbar container
  implication: The parent navbar is already positioned correctly (sticky top-0 z-50). A dropdown child can use absolute positioning relative to this parent.

## Resolution

root_cause: |
  MobileNav is implemented as a **full-height slide-out drawer** pattern instead of a **dropdown menu**. Five specific aspects create this behavior:

  1. **Animation axis**: `x: '100%'` to `x: 0` — slides horizontally from right edge. Needs to be `y`-axis (or height/opacity) animation dropping down from navbar.

  2. **Positioning**: `fixed top-0 right-0 h-full w-72` — fixed to viewport, full height, fixed width. Needs to be `absolute` (or similar), positioned below the navbar, full width or auto width.

  3. **Backdrop overlay**: Full-screen `fixed inset-0 bg-black/60` overlay. A dropdown does not need this. Remove or replace with a simpler click-outside handler.

  4. **Body scroll lock**: `useEffect` sets `document.body.style.overflow = 'hidden'`. Not needed for a dropdown menu — remove entirely.

  5. **Layout structure**: `flex-col` with `mt-auto` pushing auth buttons to bottom of a full-height panel. Should be a simple stacked list without vertical space distribution.

fix: (diagnosis only — not applied)
verification: (diagnosis only)
files_changed: []
