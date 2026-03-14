---
phase: 5
slug: public-website-and-ai-chatbot
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit) + Playwright 1.58 (e2e) |
| **Config file** | vitest.config.ts, playwright.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PUB-01 | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "home page"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PUB-02 | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "about page"` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | PUB-03 | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "learn page"` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | PUB-04 | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "events page"` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | PUB-05 | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "contact page"` | ❌ W0 | ⬜ pending |
| 05-01-06 | 01 | 1 | PUB-06 | manual | Manual: edit CMS block, verify public page update | N/A | ⬜ pending |
| 05-02-01 | 02 | 2 | AI-01 | e2e | `npx playwright test tests/e2e/chatbot.spec.ts --grep "chatbot visible"` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | AI-02 | unit | `npx vitest run tests/unit/chat-route.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 2 | AI-03 | unit | `npx vitest run tests/unit/chat-route.test.ts --grep "language"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/chat-route.test.ts` — stubs for AI-02, AI-03
- [ ] `tests/unit/content-blocks.test.ts` — stubs for content block fetching helper
- [ ] `tests/e2e/public-pages.spec.ts` — stubs for PUB-01 through PUB-05
- [ ] `tests/e2e/chatbot.spec.ts` — stubs for AI-01
- [ ] `npm install motion` — animation library for public pages
- [ ] `npm install openai` — OpenAI SDK for chatbot

*Existing vitest and playwright infrastructure from prior phases covers framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CMS-edited content appears on next render (ISR) | PUB-06 | Requires live CMS admin edit + ISR revalidation cycle | 1. Edit content block in admin CMS 2. Reload public page 3. Verify updated content appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
