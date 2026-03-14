---
phase: 3
slug: signup-country-collection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/unit --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | UCLS-01 | unit | `npx vitest run tests/unit/countryData.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | UCLS-01 | unit | `npx vitest run tests/unit/countrySelect.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | UCLS-02 | unit | `npx vitest run tests/unit/signupCountry.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | UCLS-02 | unit | `npx vitest run tests/unit/completeProfileCountry.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | UCLS-03 | unit | `npx vitest run tests/unit/countryClassification.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/countryData.test.ts` — validates country list completeness (249 entries), flag emoji generation, code format
- [ ] `tests/unit/countrySelect.test.ts` — validates search filtering, bilingual matching, DR pinning at top
- [ ] `tests/unit/signupCountry.test.ts` — validates country extraction from FormData, ISO alpha-2 validation
- [ ] `tests/unit/completeProfileCountry.test.ts` — validates OAuth profile action stores ISO code
- [ ] `tests/unit/countryClassification.test.ts` — validates "DO" = local, others = tourist

*Framework install: Already installed (Vitest 4.0.18)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS prevents user country self-update | UCLS-02 | Requires live Supabase instance with RLS | 1. Sign up as user 2. Attempt profile update with different country 3. Verify update rejected |
| Admin can edit user country | UCLS-02 | Requires service_role Supabase client | 1. Log in as admin 2. Edit user country in admin panel 3. Verify country changed |
| Dropdown keyboard navigation | UCLS-01 | Complex interaction testing | 1. Tab to country field 2. Use arrow keys to navigate 3. Enter to select 4. Escape to close |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
