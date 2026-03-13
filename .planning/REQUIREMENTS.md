# Requirements: NELL Pickleball Club

**Defined:** 2026-03-07
**Core Value:** Members can sign up, pay via Stripe, and immediately reserve pickleball courts

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with first name, last name, email, phone number, password, and membership plan selection
- [x] **AUTH-02**: First and last name fields validated separately — no numbers allowed, whitespace trimmed, capitalization normalized (e.g., jose urizar → Jose Urizar)
- [x] **AUTH-03**: Password requires minimum 8 characters with confirmation match
- [x] **AUTH-04**: User can log in with email and password
- [x] **AUTH-05**: User session persists across browser refresh (SSR cookie-based, using `@supabase/ssr`)
- [x] **AUTH-06**: User can request password reset via email link and set a new confirmed password
- [x] **AUTH-07**: Admin role stored in `app_metadata` (not `user_metadata`) — cannot be self-assigned

### Memberships & Billing

- [x] **BILL-01**: User selects membership plan during signup: VIP Nell-Picker ($50/mo, all locations) or Basic Nell-Picker ($35/mo, one location)
- [x] **BILL-02**: Stripe Checkout creates a recurring subscription tied to the user's Supabase ID (`client_reference_id`)
- [x] **BILL-03**: Stripe webhook handles all subscription lifecycle events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [x] **BILL-04**: Webhook events are deduplicated via `stripe_event_id` before processing (idempotency)
- [x] **BILL-05**: Webhook endpoint verifies Stripe signature using raw request body (`request.text()`)
- [x] **BILL-06**: Membership status synced in Supabase `memberships` table in real-time via webhooks
- [x] **BILL-07**: User can upgrade or downgrade their plan (Stripe handles proration)
- [x] **BILL-08**: User can cancel their subscription (access remains until period end)
- [x] **BILL-09**: Cancelled/past-due members cannot reserve courts (enforced at API and RLS level)

### Court Reservation System

- [x] **RESV-01**: Active members can view available courts as a time-slot grid (date selected → courts × time-slots matrix)
- [x] **RESV-02**: Members can reserve a time slot (session length: default 60–90 min, admin-configurable)
- [x] **RESV-03**: System prevents double-booking via Postgres exclusion constraint on `(court_id, tstzrange)` using `btree_gist`
- [x] **RESV-04**: All reservation timestamps stored as UTC; displayed in `America/Santo_Domingo` (UTC-4, no DST)
- [x] **RESV-05**: Reservations store snapshot of `reservation_user_first_name` and `reservation_user_last_name` at booking time
- [x] **RESV-06**: Members can cancel their own reservation within a configurable cancellation window (e.g., 2 hours before session)
- [x] **RESV-07**: Basic tier members can only reserve courts at their assigned location (enforced at API level)
- [x] **RESV-08**: Admin can create a reservation on behalf of any active member (walk-in / phone bookings)
- [x] **RESV-09**: Admin can cancel any reservation

### Interactive Court Map

- [x] **MAP-01**: Reservation page displays an interactive map (Leaflet, `dynamic({ ssr: false })`) with court markers
- [x] **MAP-02**: Markers are color-coded: green (available slots today), red (fully booked), gray (closed/maintenance)
- [x] **MAP-03**: Clicking a marker displays available time slots for that court in a side panel
- [x] **MAP-04**: Admin can set GPS coordinates for each court from the admin panel
- [x] **MAP-05**: Leaflet marker icon paths configured explicitly (prevents broken default icon bug)

### Reservation Notifications

- [x] **NOTIF-01**: Confirmation email sent immediately when a reservation is made (via Resend)
- [x] **NOTIF-02**: Session end reminder triggered 10 minutes before session ends via Supabase Edge Function + pg_cron
- [x] **NOTIF-03**: Reminder message (bilingual): "Your pickleball session ends in 10 minutes. Please prepare to exit the court so the next group can begin."
- [x] **NOTIF-04**: Reminder system tracks `reminder_sent` boolean per reservation to prevent duplicates

### Member Dashboard

- [x] **DASH-01**: Member can view current membership status (plan, renewal date, status)
- [x] **DASH-02**: Member can view upcoming reservations with court, date, time, and cancellation option
- [x] **DASH-03**: Member can cancel a reservation (if within cancellation window)
- [x] **DASH-04**: Member can update profile: first name, last name, phone number
- [x] **DASH-05**: Member can change password: enter current password, new password, confirm new password

### Public Website

- [ ] **PUB-01**: Home page: hero section, CTA to join, pickleball overview, community messaging — all copy from CMS
- [ ] **PUB-02**: About page: club description, vision, mission, values (Love & Passion, Accessibility, Discipline, Respect, Social Commitment, Integrity) — copy from CMS
- [ ] **PUB-03**: Learn Pickleball page: sport origin (1965, Bainbridge Island, Joel Pritchard / Bill Bell / Barney McCallum), rules, scoring, court dimensions, equipment — copy from CMS
- [ ] **PUB-04**: Events page: lists tournaments, training sessions, social events (admin-controlled, from database)
- [ ] **PUB-05**: Contact page: contact form, WhatsApp link, social handles
- [x] **PUB-06**: All page copy editable via Admin CMS (no hardcoded marketing text)

### Admin Panel

- [x] **ADMIN-01**: Admin can search users by first name, last name, email, or phone number
- [x] **ADMIN-02**: Admin can view any user's membership status and reservation history
- [x] **ADMIN-03**: Admin can disable/enable user accounts
- [x] **ADMIN-04**: Admin can trigger password reset for any user
- [x] **ADMIN-05**: Admin can add court locations with name, GPS coordinates, and capacity
- [x] **ADMIN-06**: Admin can block courts for maintenance (sets court status to closed)
- [x] **ADMIN-07**: Admin can view all reservations and cancel any reservation
- [x] **ADMIN-08**: Admin can create, edit, and delete events (tournaments, training, social)
- [x] **ADMIN-09**: Admin can view Stripe payment data (via embedded Stripe dashboard or webhook-synced table)
- [x] **ADMIN-10**: Admin CMS: edit content blocks for Home, About, Learn Pickleball, and FAQ pages (bilingual: `content_es`, `content_en`)
- [x] **ADMIN-11**: Admin routes protected at three layers: middleware (proxy.ts), layout, and API/Server Action level

### Content Management System

- [x] **CMS-01**: `content_blocks` table stores: `block_key`, `block_type`, `content_es`, `content_en`, `sort_order`
- [x] **CMS-02**: Public pages fetch content blocks from Supabase at render time (ISR for performance)
- [x] **CMS-03**: Admin can update any content block via rich text or plain text editor in admin panel

### Security & Infrastructure

- [x] **SEC-01**: Row Level Security enabled on all tables: `profiles`, `memberships`, `reservations`, `courts`, `locations`, `content_blocks`, `events`
- [x] **SEC-02**: Supabase `proxy.ts` (middleware) uses `getUser()` — not `getSession()` — for server-side JWT verification
- [x] **SEC-03**: Members can only read/write their own data; admin service role bypasses RLS only in webhook handler
- [x] **SEC-04**: Login attempt rate limiting (Supabase Auth built-in + optional custom rate limiter)
- [x] **SEC-05**: Protected routes enforce auth at middleware level for `/dashboard/*` and `/admin/*`

### AI Chatbot

- [ ] **AI-01**: AI assistant embedded on the platform (bilingual: Spanish/English)
- [ ] **AI-02**: Chatbot answers questions about pickleball rules, membership options, reservations, events, and locations using site content as context
- [ ] **AI-03**: Friendly, helpful tone; detects language from user input and responds in kind

### Internationalization

- [x] **I18N-01**: Platform supports Spanish (primary) and English via `next-intl` with `[locale]` route segment
- [x] **I18N-02**: All UI strings externalized to locale files from Phase 1 (not retrofitted later)

## v2 Requirements

Deferred to future release.

### Notifications

- **NOTIF-V2-01**: Optional SMS confirmation via Twilio when reservation is made
- **NOTIF-V2-02**: WhatsApp notification integration

### Social & Community

- **SOCIAL-01**: Member profile pages visible to other members
- **SOCIAL-02**: Member-to-member messaging or chat

### Mobile

- **MOBILE-01**: Progressive Web App (PWA) installable on mobile
- **MOBILE-02**: Native mobile app (React Native)

### Advanced Reservations

- **RESV-V2-01**: Guest passes — members can invite non-members for a session
- **RESV-V2-02**: Group reservations (multiple courts blocked for a single event)
- **RESV-V2-03**: Waitlist for fully booked courts

### Analytics

- **ANALYTICS-01**: Admin dashboard showing court utilization rates, peak hours, revenue metrics

## Out of Scope

| Feature | Reason |
|---------|--------|
| SMS notifications (Twilio) | Optional per spec; adds complexity and cost for v1; deferred to v2 |
| Native mobile app | Web-first; mobile app is a separate product milestone |
| Real-time chat between members | Not core to club value; high complexity |
| Video content hosting | Storage/bandwidth costs; defer to future milestone |
| Multi-currency payments | USD only for v1; DR market uses USD for club memberships |
| OAuth login (Google, GitHub) | Email/password + Supabase Auth sufficient for v1 |
| Video-on-demand pickleball lessons | Content complexity; defer to v2 |
| pgvector RAG for chatbot | Prompt-stuffing with content_blocks sufficient at v1 content volume |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01–07 | Phase 1 | Pending |
| I18N-01–02 | Phase 1 | Pending |
| SEC-01–05 | Phase 1 | Pending |
| BILL-01–09 | Phase 2 | Pending |
| RESV-01–09 | Phase 3 | Pending |
| MAP-01–05 | Phase 3 | Pending |
| NOTIF-01–04 | Phase 3 | Pending |
| DASH-01–05 | Phase 3 | Pending |
| ADMIN-01–11 | Phase 4 | Pending |
| CMS-01–03 | Phase 4 | Pending |
| PUB-01–06 | Phase 5 | Pending |
| AI-01–03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 69 total
- Mapped to phases: 69
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 — traceability updated after roadmap creation*
