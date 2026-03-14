# Phase 1: Foundation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth, i18n, database schema, and security — everything every subsequent phase depends on. This phase establishes correct SSR auth, bilingual routing, all database tables with RLS, and admin role assignment. No member-facing features beyond signup/login are built here.

</domain>

<decisions>
## Implementation Decisions

### Signup flow structure
- Single page — all fields on one page: first name, last name, email, phone, password, and optional plan selection
- Plan selection displayed as two side-by-side cards with price + feature bullets (VIP $50/mo all locations, Basic $35/mo one location)
- Plan selection is optional — user can create account without selecting a plan, no prompt or reminder shown
- After signup: redirect to home page, already signed in
- Welcome notification: full-width banner at top of page with name greeting, fades out after 3 seconds with CSS transition

### Auth methods
- Email + password AND Google OAuth (both on signup and login pages)
- Google signup flow: auto-fill name/email from Google, land on a short profile completion step to add phone number before account is created
- Login page offers: email/password form + "Sign in with Google" button + "Forgot password?" link

### Auth page design
- Full NELL branding on login and signup pages — not a minimal form
- Brand identity (see Brand Style section below)

### Member gating
- Unsubscribed users who try to access /member/* are redirected to a pricing/subscription page
- Dashboard with upgrade prompt is NOT used — redirect is the pattern

### Validation UX
- Name validation errors shown inline below each field (not on submit, not toast)
- Error appears on blur or on submit attempt

### Locale URL behavior
- Spanish (default) uses bare URLs: /dashboard, /reservas
- English uses /en/ prefix: /en/dashboard, /en/reservations
- Visiting / with no locale always defaults to Spanish — no browser language detection

### i18n language switching
- Globe/flag icon in the navigation bar — clicking reveals ES / EN options
- Switches locale and redirects to the same page in the other language
- Language preference persisted: saved to user profile for logged-in users, cookie for guests

### Database schema extras (for future phases)
- `profiles` table must include `avatar_url` column (avatar upload UI is Phase 3)
- `memberships` table must support day pass type and cash payment status, not just Stripe subscriptions (day pass purchase flow and cash payment UI are Phase 2)
- `courts` and `locations` tables must include GPS coordinate columns (map features are Phase 3)

### Claude's Discretion
- Exact loading skeleton and error state designs
- Specific spacing, typography scale, and component-level layout
- Password reset email template content
- RLS policy implementation details
- Admin role assignment implementation (privileged server-side only)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Next.js 15+ App Router with route groups: `(marketing)` / `(auth)` / `(member)` / `(admin)`
- Supabase SSR via `@supabase/ssr` — server client in `lib/supabase/server.ts`, browser client in `lib/supabase/client.ts`
- Auth middleware: `proxy.ts` using `getUser()` (not `getSession()`) for server-side JWT verification
- next-intl for i18n with `app/[locale]/` route segment

### Integration Points
- All subsequent phases depend on this phase's auth, schema, and middleware
- Stripe (Phase 2) will write to the `memberships` table created here
- Reservations (Phase 3) will write to `reservations`, `courts`, `locations` tables created here
- Admin (Phase 4) will use the admin role set up in `app_metadata` here

</code_context>

<specifics>
## Specific Ideas

### Brand Identity
The platform should feel energetic, modern, and urban — a community sports movement, not a typical club website.

**Vibe:** Street-sport energy + Caribbean vibrancy + modern athletic branding + clean tech startup UI. Think Nike Training Club meets Caribbean coastal culture.

**Color palette:**
- Electric Lime Green `#39FF14` — primary energy color, sport
- Deep Midnight Blue `#0B1D3A` — contrast, modern urban feel
- Caribbean Turquoise `#1ED6C3` — tropical energy accent
- Sunset Orange `#FF6B2C` — CTA buttons and highlights
- Off White `#F7F9FC` — background
- Charcoal Gray `#2A2A2A` — neutral balance

**Typography:**
- Headings: Bebas Neue (bold, athletic, strong presence) — alternative: Oswald
- Body: Inter (clean, readable, modern SaaS standard)
- Accent (quotes/highlights): Poppins

**Buttons:** Rounded, bold, high contrast — primary uses Electric Lime background with dark text. Hover: glow or scale animation.

**Cards:** Rounded corners, soft shadows, hover lift animation. Used for events, courts, memberships.

**Motion:** Scroll reveal animations, smooth page transitions, hover interactions. Cards lift and glow on hover. Buttons scale on hover.

**Hero (public pages):** Full-width image or video of people playing pickleball, midnight blue → transparent overlay gradient, large bold headline, two CTAs (Join the Club, Reserve a Court).

**Imagery:** Community, movement, competition, fun. Young players, groups, outdoor courts, Caribbean sunshine. No generic stock photos.

**Mobile-first:** Most users arrive on phones — mobile layout must be excellent.

</specifics>

<deferred>
## Deferred Ideas

- **Nearest courts by location search** — User types their current location to find nearest open courts. Belongs in Phase 3 (Map phase, MAP-01 through MAP-05 already planned). Note: Phase 3 should add distance/proximity search on top of the existing marker map.
- **Day pass purchase flow** — Phase 2 (Billing). Schema support added in Phase 1.
- **Cash payment UI and tracking** — Phase 2 (Billing). Schema support added in Phase 1.
- **Avatar upload UI** — Phase 3 (Dashboard, DASH-04). Schema support (`avatar_url`) added in Phase 1.
- **Account management section** (cancel reservations, manage plan, avatar) — Phase 3 Dashboard (DASH-01 through DASH-05 already planned).

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-07*
