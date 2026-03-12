# Phase 4: Admin and CMS - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Club operator tools and content management for all platform content. Admin can manage users, courts, reservations, events, and edit bilingual content blocks — with every admin action protected at middleware, layout, and API handler level. Phase 5 public pages will consume the CMS content created here.

</domain>

<decisions>
## Implementation Decisions

### Admin panel layout
- Fixed left sidebar navigation with icon+label links: Dashboard (home), Users, Courts, Reservations, Events, CMS, Stripe
- Sidebar collapses behind hamburger icon on mobile (slide-in overlay)
- Same brand colors as member-facing site (Midnight Blue sidebar, Electric Lime accents)
- Dashboard landing page with summary stat cards (total users, active members, today's reservations, upcoming events)
- Bilingual admin panel (ES/EN) — same switching as rest of platform
- "Admin" link in main Navbar visible only when user has admin role in app_metadata
- All destructive admin actions require confirmation dialogs (modal: "Are you sure?" with Cancel/Confirm)

### Admin route protection (three layers)
- Layer 1: proxy.ts middleware — non-admin users accessing /admin/* redirected (already handles unauthenticated redirect; needs admin role check)
- Layer 2: Admin layout — server-side role check in (admin) layout.tsx, renders 403 or redirects if not admin
- Layer 3: Server Actions / API handlers — each admin action verifies admin role before executing

### User management
- Single search bar that searches across first name, last name, email, and phone simultaneously
- Paginated table (20 users per page) showing name, email, plan, status
- Click user row → slide-out right panel with profile details, membership status, reservation history, and action buttons
- Actions: Disable account (blocks login + auto-cancels all future reservations), Enable account, Trigger password reset
- Admin can re-enable disabled accounts

### Court management
- Admin can add court locations with name, GPS coordinates, and capacity
- Maintenance blocking with date range (start/end date-time) — court auto-reopens after end date
- Existing reservations during maintenance block are cancelled with notification
- Admin can edit court configuration (operating hours, mode schedule, pricing, booking windows — deferred from Phase 3)

### Reservation management
- Filterable table of all reservations: date range filter, court filter, status filter (confirmed/pending/cancelled)
- Columns: User, Court, Date, Time, Status, Actions (Cancel)
- Admin can cancel any reservation (with confirmation dialog)
- Admin can create reservation on behalf of any user — search for registered user OR enter guest name for walk-ins without accounts
- Guest reservations tracked by name only (not linked to user_id)
- Admin can mark cash payments as received (clears "pending payment" status — deferred from Phase 2/3)

### Events management
- Three fixed event types: Tournament, Training Session, Social Event — stored as event_type column
- Schema additions needed: event_type, start_time, end_time (or duration), optional image_url
- Table list display: Title | Type | Date | Location | Actions (Edit/Delete)
- Past/Upcoming tab filter — sorted by date
- Bilingual fields for title and description (title_es/en, description_es/en) — consistent with CMS approach
- Past events auto-hidden from public Events page (event_date < today)
- Admin can still view past events in admin list
- Events linked to location only (not specific courts)

### CMS content blocks
- Basic formatting: bold, italic, headings, bullet/numbered lists, links (lightweight editor like Tiptap)
- Bilingual editing approach — Claude's discretion (side-by-side or tab switching)
- Inline preview below editor showing rendered HTML as it would appear on public page
- Blocks grouped by page: Home, About, Learn Pickleball, FAQ
- Blocks are reorderable within a page (sort_order column, up/down arrows or drag-and-drop)
- Edit pre-seeded blocks only — admin cannot create or delete blocks (prevents accidental structure changes)
- All Phase 5 public pages covered: Home hero, Home overview, About (vision/mission/values), Learn Pickleball (origin/rules/scoring/equipment), FAQ
- New blocks added by developer when pages change

### Stripe payment view
- Claude's discretion: link to external Stripe Dashboard, embedded dashboard, or webhook-synced summary table

### Claude's Discretion
- Stripe view implementation approach
- Bilingual editor layout (side-by-side vs tab switching)
- Dashboard stat card design and metrics
- Admin search debounce and result ranking
- Exact Tiptap editor configuration and toolbar items
- Court configuration form layout (hours, modes, pricing, booking windows)
- Guest reservation form design
- Maintenance notification email template

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/admin.ts`: `supabaseAdmin` client + `assignAdminRole()` — admin actions use service-role client
- `proxy.ts`: Already redirects unauthenticated /admin/* to /login — needs admin role check addition
- `app/actions/auth.ts`, `billing.ts`, `reservations.ts`, `profile.ts`, `sessionPayment.ts`: Server Actions pattern established
- `components/Navbar.tsx`: Exists — add conditional "Admin" link
- `components/LanguageSwitcher.tsx`: i18n switching — reuse in admin panel
- `app/[locale]/(admin)/admin/page.tsx`: Placeholder page exists
- `messages/en.json` / `messages/es.json`: i18n message files — add Admin namespace

### Established Patterns
- Next.js App Router with route groups: `(marketing)`, `(auth)`, `(member)`, `(admin)`
- Server Actions for mutations (auth.ts, billing.ts, reservations.ts patterns)
- `@supabase/ssr` for SSR auth with cookie handling
- `next-intl` for i18n with `[locale]` route segment
- Brand: Electric Lime `#39FF14`, Midnight Blue `#0B1D3A`, Caribbean Turquoise `#1ED6C3`, Sunset Orange `#FF6B2C`
- Typography: Bebas Neue (headings), Inter (body), Poppins (accent)
- Confirmation dialogs pattern from Phase 3 (CancelDialog.tsx in dashboard)
- Stripe API version 2026-02-25.clover

### Integration Points
- Admin layout at `app/[locale]/(admin)/admin/layout.tsx` — sidebar + role check
- Sub-pages: `/admin/users`, `/admin/courts`, `/admin/reservations`, `/admin/events`, `/admin/cms`, `/admin/stripe`
- `events` table already exists (Phase 1 migration) — needs migration for event_type, start_time, end_time, image_url columns
- `content_blocks` table already exists (Phase 1 migration) — ready for CMS UI
- `profiles`, `memberships`, `reservations`, `courts`, `locations` tables all exist — admin reads/writes via service-role client
- Phase 5 public pages will consume content_blocks data created/edited here
- Seed data needed for content_blocks (pre-seeded block_keys for all pages)

</code_context>

<specifics>
## Specific Ideas

- Sidebar with Midnight Blue background and Electric Lime active-state indicator — matches brand energy
- Dashboard landing gives admin a quick pulse check before diving into operations
- Slide-out panel for user details keeps the list visible — admin can quickly switch between users
- Guest bookings (walk-ins without accounts) tracked by name only, supporting the cash payment flow from Phase 3
- Content blocks pre-seeded by developer ensures page structure integrity — admin focuses on content, not structure
- CMS inline preview builds confidence that edits look correct before visiting the public page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-admin-and-cms*
*Context gathered: 2026-03-11*
