# Milestones

## v1.0 MVP (Shipped: 2026-03-14)

**Phases completed:** 5 phases, 23 plans
**Timeline:** 7 days (2026-03-07 → 2026-03-13)
**Lines of code:** 21,548 TypeScript
**Commits:** 126

**Key accomplishments:**
- Supabase Auth with SSR — cookie-based auth, signup/login/OAuth, password reset, admin role via app_metadata
- Stripe Billing — recurring subscriptions (VIP/Basic), webhook lifecycle sync, per-session payments, idempotency guard
- Court Reservation System — time-slot grid, double-booking prevention via Postgres btree_gist exclusion constraints, confirmation emails, session reminders via Edge Function + pg_cron
- Admin Panel & CMS — three-layer route protection, user/court/reservation/event management, Tiptap rich text editor with bilingual content blocks
- Bilingual Public Website — 5 CMS-driven pages with motion animations, AI chatbot "Nelly" with OpenAI prompt-stuffing
- Full i18n — Spanish/English via next-intl with all UI strings externalized from Phase 1

---

