---
phase: 1
slug: fix-critical-performance-issues
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | Middleware routing | unit | `npx vitest run tests/unit/middlewareRouting.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | Cookie signing | unit | `npx vitest run tests/unit/cookieSigning.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | Rate limit logic | unit | `npx vitest run tests/unit/chatRateLimit.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 0 | Admin exports | unit | `npx vitest run tests/unit/adminExports.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | Public route skip | unit | `npx vitest run tests/unit/middlewareRouting.test.ts -t "public routes"` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | Membership cache | unit | `npx vitest run tests/unit/cookieSigning.test.ts -t "TTL"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | View query | unit | `npx vitest run tests/unit/adminUsers.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 1 | Batch reorder | unit | `npx vitest run tests/unit/adminCms.test.ts -t "reorder"` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 1 | Rate limit DB | unit | `npx vitest run tests/unit/chatRateLimit.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/middlewareRouting.test.ts` — validates route classification logic (public vs protected vs auth-redirect)
- [ ] `tests/unit/cookieSigning.test.ts` — validates HMAC sign/verify and 5-minute TTL expiry
- [ ] `tests/unit/chatRateLimit.test.ts` — validates rate limit check, increment, window expiry, and retryAfter calculation
- [ ] `tests/unit/adminExports.test.ts` — validates all admin actions are still importable after file split

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Middleware skips DB on public pages | Route optimization | Requires real Supabase + browser | Visit /, /about, /events — verify no getUser() call in server logs |
| Cookie persists across page navigation | Membership cache | Requires browser cookies | Log in as member, navigate /member/* pages, verify single DB query in 5-min window |
| Admin pagination UI works | 25 per page | UI interaction | Open admin users panel, verify page controls and correct page size |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
