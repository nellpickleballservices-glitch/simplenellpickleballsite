# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-14
**Phases:** 5 | **Plans:** 23 | **Commits:** 126

### What Was Built
- Full auth system with SSR cookies, signup/login/OAuth, password reset, admin roles
- Stripe billing with recurring subscriptions, webhook lifecycle sync, per-session payments
- Court reservation system with btree_gist double-booking prevention, confirmation emails, pg_cron session reminders
- Admin panel with three-layer protection, user/court/reservation/event management, Tiptap CMS
- Bilingual public website (5 pages) with motion animations and AI chatbot "Nelly"
- Complete i18n (Spanish/English) with all strings externalized from Phase 1

### What Worked
- Strict phase dependency order prevented rework — each phase built cleanly on the previous
- Externalized all i18n strings in Phase 1 — zero retrofitting needed in later phases
- Database-level constraints (btree_gist exclusion, RLS) provided correctness guarantees without application-level complexity
- Three-layer admin protection (middleware + layout + handler) caught issues at design time, not runtime
- UAT after Phase 5 caught 3 real issues (WhatsApp overlap, MobileNav drawer, language switcher) that were fixed before milestone close

### What Was Inefficient
- 22 test stubs (test.skip/test.todo) accumulated across phases — never backfilled with real tests
- Nyquist validation remained in draft for all 5 phases — validation framework set up but never completed
- Phase 5 required 2 gap closure plans (05-04, 05-05) after UAT — issues could have been caught earlier with more incremental testing
- sendReminderEmail helper created in Phase 3 was immediately superseded by Edge Function direct implementation — dead code from day one

### Patterns Established
- Server Action signature: `(_prevState, formData)` for React 19 useActionState compatibility
- Content blocks grouped by page prefix (home_, about_, learn_, faq_) on server side
- Brand namespace in i18n for reusable brand strings (NELL, Pickleball Club)
- `(SELECT auth.uid())` wrapper in all RLS policies for Postgres query planner caching
- motion/react imports (not framer-motion) for motion v12 compatibility

### Key Lessons
1. ISR revalidation scope matters — `revalidatePath('/')` only invalidates one page, not all pages using the same CMS data
2. Stripe API version (clover) restructured subscription and invoice objects — always check current API docs, not cached knowledge
3. next-intl 4 supports both RSC and Client Component usage of useTranslations — no 'use client' needed in page.tsx
4. WhatsApp floating bubble UX competes with chatbot widget — pick one floating element per page
5. Edge Functions with Deno types are incompatible with Node tsconfig — exclude from compilation

### Cost Observations
- Model mix: balanced profile used throughout
- Timeline: 7 days (2026-03-07 → 2026-03-13)
- Notable: Average plan execution was 3 minutes — high velocity across all phases

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 126 | 5 | Initial process — strict dependency order, UAT after final phase |

### Cumulative Quality

| Milestone | Test Stubs | LOC | Tech Debt Items |
|-----------|-----------|-----|-----------------|
| v1.0 | 22 skipped | 21,548 | 6 (all low/info) |

### Top Lessons (Verified Across Milestones)

1. Database-level constraints (RLS, exclusion) are more reliable than application-level validation
2. Externalize i18n strings from the start — retrofitting is exponentially harder
