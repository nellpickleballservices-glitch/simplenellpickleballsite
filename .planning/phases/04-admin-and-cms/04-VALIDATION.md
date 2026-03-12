---
phase: 4
slug: admin-and-cms
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | ADMIN-11 | unit | `npx vitest run tests/unit/adminRouteProtection.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | ADMIN-01 | unit | `npx vitest run tests/unit/adminUserSearch.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | ADMIN-03 | unit | `npx vitest run tests/unit/adminUserDisable.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | ADMIN-06 | unit | `npx vitest run tests/unit/adminMaintenance.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | ADMIN-08 | unit | `npx vitest run tests/unit/adminEvents.test.ts` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | CMS-01 | unit | `npx vitest run tests/unit/contentBlocksSeeds.test.ts` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 2 | CMS-03 | unit | `npx vitest run tests/unit/cmsEditor.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/adminRouteProtection.test.ts` — stubs for ADMIN-11 (three-layer auth check)
- [ ] `tests/unit/adminUserSearch.test.ts` — stubs for ADMIN-01 (search across name/email/phone)
- [ ] `tests/unit/adminUserDisable.test.ts` — stubs for ADMIN-03 (disable/enable accounts)
- [ ] `tests/unit/adminMaintenance.test.ts` — stubs for ADMIN-06 (maintenance blocking cascades)
- [ ] `tests/unit/adminEvents.test.ts` — stubs for ADMIN-08 (events CRUD validation)
- [ ] `tests/unit/contentBlocksSeeds.test.ts` — stubs for CMS-01 (seed data completeness)
- [ ] `tests/unit/cmsEditor.test.ts` — stubs for CMS-03 (CMS save produces valid HTML)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin sidebar navigation layout | ADMIN-11 | Visual layout verification | Navigate /admin/* routes, verify sidebar renders on desktop and collapses on mobile |
| Tiptap editor renders correctly | CMS-02 | Rich text editor visual check | Open CMS editor, verify toolbar, type content, check inline preview |
| Stripe dashboard link works | ADMIN-10 | External service redirect | Click Stripe link in admin, verify redirect to Stripe Dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
