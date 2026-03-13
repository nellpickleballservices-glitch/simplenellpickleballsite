---
status: resolved
phase: 05-public-website-and-ai-chatbot
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-03-13T06:20:00Z
updated: 2026-03-13T23:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `npm run dev`. Server boots without errors. Navigate to http://localhost:3000 — homepage loads with content. No console errors related to missing migrations or broken imports.
result: pass

### 2. Sticky Navbar with Public Page Links
expected: Navbar sticks to top on scroll with backdrop blur. Shows links: About, Learn, Events, Contact. Clicking each navigates to the correct page. Logo/brand links back to homepage.
result: pass

### 3. Footer with Navigation and Social Links
expected: Footer appears at bottom of every public page. Shows 3 columns: brand info, navigation links, and social/contact links. Links navigate correctly.
result: pass

### 4. WhatsApp Floating Bubble
expected: Green WhatsApp bubble appears fixed at bottom-left of screen on all public pages. Clicking opens WhatsApp with a pre-filled bilingual greeting message.
result: issue
reported: "WhatsApp bubble overlaps with AI chatbot bubble. User prefers WhatsApp only on contacts page, not all public pages."
severity: minor

### 5. Mobile Hamburger Navigation
expected: On mobile viewport (< 768px), hamburger icon appears in navbar. Tapping opens a slide-out panel with all navigation links. Tapping a link navigates and closes the panel.
result: issue
reported: "Hamburger menu opens as a slide-out panel to the right instead of dropping down like a regular dropdown menu. User wants a dropdown on smaller screens."
severity: major

### 6. Homepage with CMS Content and Animations
expected: Homepage shows hero section with entrance animation. Scrolling down reveals content sections with fade-in/slide-up animations. Content comes from CMS content_blocks.
result: pass

### 7. About Page with Values Timeline
expected: /about page shows vision and mission sections from CMS. Below, a vertical timeline displays 6 club values with alternating left/right layout. Sections animate in on scroll.
result: pass

### 8. Learn Pickleball Page with Sticky TOC and Court Diagram
expected: /learn-pickleball page shows sticky table of contents on desktop (accordion on mobile). Clicking a TOC item scrolls to that section. Active section highlights in TOC as you scroll. SVG court diagram with labeled dimensions is visible.
result: pass

### 9. Events Page with Event Cards
expected: /events page shows upcoming events in a 2-column card grid. Each card shows event name, date (locale-formatted), type badge (colored), and description. If no upcoming events, an empty state message appears.
result: pass

### 10. Contact Page with WhatsApp CTA
expected: /contact page shows a prominent WhatsApp call-to-action button, phone number, email, social links, and hours of operation. Contact info is readable and links are functional.
result: pass

### 11. Bilingual Language Switching
expected: Switch language (EN/ES) using the language switcher. All public pages update: navbar links, footer text, page content, and SEO metadata reflect the selected language. Both languages display correctly without missing translations.
result: issue
reported: "Language switcher only works sometimes. Have to manually change locale in URL because the switcher isn't refreshing the content."
severity: major

### 12. AI Chatbot Bubble and Panel
expected: A chat bubble with a pickleball paddle icon appears fixed at bottom-right (z-50, above WhatsApp). Clicking opens a chat panel (380x520 on desktop, full-screen on mobile). Panel shows Nelly greeting and 4 quick-reply chips. After 5-8 seconds, an auto-greeting tooltip appears (once per session).
result: pass

### 13. AI Chatbot Conversation
expected: Type a question about the club and send. Nelly responds with streaming text (words appear progressively). Responses are contextual — based on club content from CMS. If OPENAI_API_KEY is not set, a graceful error message appears instead of a crash. (Skip if no API key configured.)
result: skipped
reason: OpenAI account has no credits (insufficient_quota). Not a code bug.

### 14. AI Chatbot Rate Limiting
expected: After sending 20 messages in a session, Nelly responds with a friendly rate-limit message suggesting WhatsApp or email contact instead of answering further questions.
result: skipped
reason: Cannot test without working OpenAI API credits.

## Summary

total: 14
passed: 9
issues: 3
pending: 0
skipped: 2

## Gaps

- truth: "WhatsApp bubble appears on all public pages without overlapping chatbot"
  status: resolved
  reason: "User reported: WhatsApp bubble overlaps with AI chatbot bubble. User prefers WhatsApp only on contacts page, not all public pages."
  severity: minor
  test: 4
  root_cause: "WhatsAppBubble rendered in marketing layout (all pages) and homepage. Contact page already has inline WhatsApp CTA, making floating bubble redundant."
  artifacts:
    - path: "app/[locale]/(marketing)/layout.tsx"
      issue: "Renders WhatsAppBubble on all marketing pages"
    - path: "app/[locale]/page.tsx"
      issue: "Renders WhatsAppBubble on homepage"
  missing:
    - "Remove WhatsAppBubble from marketing layout and homepage"
  debug_session: ".planning/debug/whatsapp-bubble-overlap.md"

- truth: "Mobile hamburger opens as a dropdown menu"
  status: resolved
  reason: "User reported: Hamburger menu opens as a slide-out panel to the right instead of dropping down like a regular dropdown menu. User wants a dropdown on smaller screens."
  severity: major
  test: 5
  root_cause: "MobileNav uses fixed full-height slide-out drawer (x-axis animation, fixed positioning, backdrop overlay, body scroll lock) instead of a simple dropdown."
  artifacts:
    - path: "components/public/MobileNav.tsx"
      issue: "Uses fixed full-height slide-out with x-axis animation, backdrop, and scroll lock"
  missing:
    - "Change to absolute-positioned dropdown with y-axis/opacity animation"
    - "Remove backdrop overlay and body scroll lock"
    - "Convert hamburger to toggle button"
  debug_session: ".planning/debug/mobile-nav-slideout-to-dropdown.md"

- truth: "Language switcher reliably switches all public page content"
  status: resolved
  reason: "User reported: Language switcher only works sometimes. Have to manually change locale in URL because the switcher isn't refreshing the content."
  severity: major
  test: 11
  root_cause: "LanguageSwitcher uses next/link Link which does client-side navigation without re-triggering next-intl middleware. Missing createNavigation(routing) setup from next-intl/navigation."
  artifacts:
    - path: "components/LanguageSwitcher.tsx"
      issue: "Uses next/link instead of next-intl locale-aware Link/useRouter"
  missing:
    - "Create i18n/navigation.ts with createNavigation(routing) exports"
    - "Rewrite LanguageSwitcher to use useRouter from i18n/navigation with router.replace(pathname, { locale })"
  debug_session: ".planning/debug/language-switcher-no-refresh.md"
