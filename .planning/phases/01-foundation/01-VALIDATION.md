---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (e2e) + Vitest (unit) |
| **Config file** | `playwright.config.ts` / `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx playwright test && npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx playwright test && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-05, SEC-02, SEC-05 | unit | `npx vitest run tests/unit/proxyUsesGetUser.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | SEC-02 | unit | `npx vitest run tests/unit/proxyUsesGetUser.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | I18N-01 | e2e | `npx playwright test tests/i18n/locale-routing.spec.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | SEC-01, SEC-03 | unit | `npx vitest run tests/unit/rls-policies.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | AUTH-07 | unit | `npx vitest run tests/unit/adminRole.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | AUTH-01 | e2e | `npx playwright test tests/auth/signup.spec.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | AUTH-02 | unit | `npx vitest run tests/unit/normalizeName.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 2 | AUTH-03 | unit | `npx vitest run tests/unit/passwordValidation.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-04 | 03 | 2 | AUTH-04 | e2e | `npx playwright test tests/auth/login.spec.ts` | ❌ W0 | ⬜ pending |
| 1-03-05 | 03 | 2 | AUTH-05 | e2e | `npx playwright test tests/auth/session-persist.spec.ts` | ❌ W0 | ⬜ pending |
| 1-03-06 | 03 | 2 | AUTH-06 | e2e | `npx playwright test tests/auth/password-reset.spec.ts` | ❌ W0 | ⬜ pending |
| 1-03-07 | 03 | 2 | SEC-05 | e2e | `npx playwright test tests/auth/route-protection.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 3 | I18N-01 | e2e | `npx playwright test tests/i18n/locale-routing.spec.ts` | ❌ W0 | ⬜ pending |
| 1-04-02 | 04 | 3 | I18N-02 | unit | `npx vitest run tests/unit/noHardcodedStrings.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/normalizeName.test.ts` — stubs for AUTH-02
- [ ] `tests/unit/passwordValidation.test.ts` — stubs for AUTH-03
- [ ] `tests/unit/adminRole.test.ts` — stubs for AUTH-07
- [ ] `tests/unit/rls-policies.test.ts` — stubs for SEC-01, SEC-03
- [ ] `tests/unit/proxyUsesGetUser.test.ts` — stubs for SEC-02
- [ ] `tests/unit/noHardcodedStrings.test.ts` — stubs for I18N-02
- [ ] `tests/auth/signup.spec.ts` — stubs for AUTH-01
- [ ] `tests/auth/login.spec.ts` — stubs for AUTH-04
- [ ] `tests/auth/session-persist.spec.ts` — stubs for AUTH-05
- [ ] `tests/auth/password-reset.spec.ts` — stubs for AUTH-06
- [ ] `tests/i18n/locale-routing.spec.ts` — stubs for I18N-01
- [ ] `tests/auth/route-protection.spec.ts` — stubs for SEC-05
- [ ] `playwright.config.ts` — Playwright configuration
- [ ] `vitest.config.ts` — Vitest configuration
- [ ] Framework install: `npm install -D vitest @vitest/ui && npm install -D @playwright/test && npx playwright install`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login rate limiting active | SEC-04 | Supabase dashboard config — no API to assert it programmatically | Open Supabase dashboard → Auth → Rate Limits; verify limits are enabled |
| Google OAuth sign-in flow | AUTH-01 (partial) | Requires Google OAuth consent screen interaction | Manual test: click "Sign in with Google", authorize, verify redirect to profile completion step |
| Password reset email received | AUTH-06 (partial) | Requires real email delivery in CI | Manual test: request reset for test email, check inbox for link, click link, set new password |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
