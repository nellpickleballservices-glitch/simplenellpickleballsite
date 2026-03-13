---
status: resolved
trigger: "WhatsApp bubble overlaps with AI chatbot bubble. User wants WhatsApp only on Contact page."
created: 2026-03-13T00:00:00Z
updated: 2026-03-13T00:00:00Z
---

## Current Focus

hypothesis: WhatsAppBubble rendered in 2 places site-wide; overlaps chatbot in bottom corners
test: Read all render sites and z-index values
expecting: Multiple render locations and z-index conflict
next_action: Report diagnosis

## Symptoms

expected: WhatsApp bubble only on Contact page, no overlap with chatbot
actual: WhatsApp bubble on ALL marketing pages AND homepage, overlaps chatbot
errors: Visual overlap in bottom corners
reproduction: Visit any marketing page - both bubbles visible
started: Since initial implementation

## Eliminated

(none needed - root cause clear from first pass)

## Evidence

- timestamp: 2026-03-13
  checked: app/[locale]/(marketing)/layout.tsx line 18
  found: WhatsAppBubble rendered in marketing layout (applies to ALL marketing routes)
  implication: Every marketing page gets the bubble

- timestamp: 2026-03-13
  checked: app/[locale]/page.tsx line 394
  found: WhatsAppBubble rendered AGAIN directly in homepage
  implication: Homepage has its own copy outside the marketing layout

- timestamp: 2026-03-13
  checked: components/public/WhatsAppBubble.tsx line 32
  found: Position is "fixed left-6 bottom-6 z-40"
  implication: Bottom-left corner, z-index 40

- timestamp: 2026-03-13
  checked: components/chatbot/ChatBubble.tsx line 21
  found: Position is "fixed right-6 bottom-6 z-50"
  implication: Bottom-right corner, z-index 50

- timestamp: 2026-03-13
  checked: components/chatbot/ChatWidget.tsx line 69
  found: Chat tooltip at "fixed right-24 bottom-8 z-50"
  implication: Tooltip extends leftward from chatbot

- timestamp: 2026-03-13
  checked: app/[locale]/(marketing)/contact/page.tsx
  found: Contact page has its own inline WhatsApp CTA card (lines 70-101) but does NOT render WhatsAppBubble itself
  implication: Contact page gets bubble from the marketing layout wrapper

## Resolution

root_cause: |
  WhatsAppBubble is rendered in TWO site-wide locations:
  1. Marketing layout (layout.tsx line 18) - all /contact, /about, etc.
  2. Homepage (page.tsx line 394) - standalone render

  Neither location restricts it to the Contact page only. The contact page
  already has a proper inline WhatsApp CTA card, making the floating bubble
  redundant there too.

fix: (diagnosis only - not applied)
verification: (diagnosis only)
files_changed: []
