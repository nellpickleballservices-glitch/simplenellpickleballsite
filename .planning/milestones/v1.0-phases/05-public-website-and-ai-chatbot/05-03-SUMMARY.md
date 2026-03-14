---
phase: 05-public-website-and-ai-chatbot
plan: 03
subsystem: ai, ui
tags: [openai, gpt-4o-mini, streaming, sse, chatbot, motion/react]

# Dependency graph
requires:
  - phase: 05-01
    provides: "supabaseAdmin, ContentBlock types, openai package"
  - phase: 05-02
    provides: "marketing layout, WhatsAppBubble, MotionProvider wrapping"
provides:
  - "POST /api/chat streaming route handler with OpenAI gpt-4o-mini"
  - "ChatWidget, ChatBubble, ChatPanel components"
  - "Nelly AI assistant with bilingual prompt-stuffing from content_blocks"
  - "Session-based rate limiting (20 messages/session)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["SSE streaming via ReadableStream", "in-memory rate limiting with TTL", "prompt-stuffing from CMS content_blocks"]

key-files:
  created:
    - app/api/chat/route.ts
    - components/chatbot/ChatBubble.tsx
    - components/chatbot/ChatPanel.tsx
    - components/chatbot/ChatWidget.tsx
  modified:
    - app/[locale]/(marketing)/layout.tsx
    - app/[locale]/page.tsx
    - messages/en.json
    - messages/es.json

key-decisions:
  - "ChatWidget added to both marketing layout and homepage (homepage is outside marketing route group)"
  - "Inline i18n strings in ChatPanel for simplicity (also added to messages/*.json for completeness)"

patterns-established:
  - "SSE streaming: ReadableStream with data: JSON chunks and data: [DONE] terminator"
  - "In-memory rate limiting with Map + TTL cleanup per session"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 05 Plan 03: AI Chatbot Summary

**Streaming AI chatbot (Nelly) with OpenAI gpt-4o-mini, CMS prompt-stuffing, bilingual support, quick-reply chips, and session rate limiting**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T06:06:43Z
- **Completed:** 2026-03-13T06:10:18Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Streaming Route Handler at /api/chat with OpenAI gpt-4o-mini and SSE ReadableStream
- System prompt dynamically stuffed with all content_blocks + upcoming events from Supabase
- Floating chat bubble (bottom-right, z-50) with pickleball paddle icon on all public pages
- Chat panel with Nelly greeting, 4 quick-reply chips, typing indicator, and streaming text display
- In-memory rate limiting at 20 messages per session with friendly redirect message
- Auto-greeting tooltip after 5-8 seconds (once per session via sessionStorage)
- Mobile: full-screen chat overlay; Desktop: 380x520 anchored panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Streaming AI Route Handler** - `a6246ef` (feat)
2. **Task 2: Chat widget components and layout integration** - `377702c` (feat)

## Files Created/Modified
- `app/api/chat/route.ts` - POST streaming route handler with OpenAI, prompt-stuffing, rate limiting
- `components/chatbot/ChatBubble.tsx` - Floating chat trigger button with paddle icon
- `components/chatbot/ChatPanel.tsx` - Chat window with messages, streaming, typing indicator, quick-reply chips
- `components/chatbot/ChatWidget.tsx` - Orchestrator with AnimatePresence, auto-greeting tooltip
- `app/[locale]/(marketing)/layout.tsx` - Added ChatWidget import and render
- `app/[locale]/page.tsx` - Added ChatWidget to homepage (outside marketing route group)
- `messages/en.json` - Added Chatbot namespace with i18n keys
- `messages/es.json` - Added Chatbot namespace with i18n keys

## Decisions Made
- ChatWidget added to both marketing layout AND homepage since homepage lives outside the marketing route group (consistent with WhatsAppBubble pattern)
- Inline i18n strings used in ChatPanel for self-contained component; Chatbot namespace also added to messages files for completeness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added ChatWidget to homepage**
- **Found during:** Task 2 (layout integration)
- **Issue:** Plan only specified marketing layout, but homepage is outside (marketing) route group and would not get the chatbot
- **Fix:** Added ChatWidget import and render to app/[locale]/page.tsx alongside WhatsAppBubble
- **Files modified:** app/[locale]/page.tsx
- **Verification:** npm run build passes, ChatWidget rendered on homepage
- **Committed in:** 377702c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for completeness -- chatbot must be on all public pages including homepage. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration:**
- **OPENAI_API_KEY** environment variable must be set (obtain from https://platform.openai.com/api-keys)
- Without this key, the chat route returns a 500 error with "Nelly is unavailable" message (graceful degradation)

## Next Phase Readiness
- This is the final plan of the final phase -- all 21 plans across 5 phases are now complete
- The full application is ready for end-to-end testing and deployment

---
*Phase: 05-public-website-and-ai-chatbot*
*Completed: 2026-03-13*
