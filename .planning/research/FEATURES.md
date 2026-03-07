# Feature Research

**Domain:** Sports club membership and court reservation platform (pickleball)
**Researched:** 2026-03-07
**Confidence:** MEDIUM — Based on training knowledge of CourtReserve, Mindbody, ClubSpark, Skedda, Pickleheads, DUPR, and general court-booking SaaS patterns. Web tools unavailable for live verification. Core patterns are stable and well-established; specific competitive details flagged where confidence is lower.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features members assume exist. Missing these = members churn or never convert.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Membership signup + online payment** | Every modern club uses recurring billing; writing checks is dead | MEDIUM | Stripe Checkout or embedded form. Must feel instant — no multi-day approval flows |
| **Real-time court availability view** | Members will not call ahead to check; they expect to see availability before deciding to drive | MEDIUM | Time-slot grid (not just calendar month view) is the correct pattern for court sports |
| **Self-service reservation booking** | Members book on their own time (nights, weekends); staff should not be in the loop for standard bookings | MEDIUM | Click court → pick time → confirm. 3 steps max |
| **Reservation confirmation email** | Members need proof of booking + reminder of court/time | LOW | Transactional email via Resend. Must fire immediately (< 30 seconds) |
| **Pre-session reminder notification** | Sports clubs live and die on court utilization; no-shows waste courts | LOW | Email or push 24h + 1h before session. The 10-min "wrap up" reminder in PROJECT.md is unusual but valuable |
| **Self-service cancellation** | Members cancel plans; forcing them to call creates resentment | LOW | Must enforce cancellation window (e.g., 2h before = no penalty; same-day = limited) |
| **Member dashboard: upcoming reservations** | "What did I book?" is the #1 member self-service question | LOW | Simple list: date, court, time, cancel button |
| **Member dashboard: membership status** | "Is my membership active?" is the #2 question | LOW | Show tier, renewal date, Stripe status |
| **Password reset / account recovery** | Standard auth expectation; missing it causes churn immediately | LOW | Email-link flow via Supabase Auth |
| **Mobile-responsive UI** | 70%+ of club members book from phones, especially in LatAm | MEDIUM | Not a native app — but the web UI must be genuinely usable at 375px width |
| **Admin: view and cancel any reservation** | Courts get blocked by bad bookings; admins must have override | LOW | Simple admin table with search + cancel action |
| **Admin: block courts for maintenance** | Courts go offline for resurfacing, equipment failure, events | LOW | Date-range block on a per-court basis |
| **Contact information / WhatsApp access** | In Dominican Republic, WhatsApp is the primary support channel; members expect it | LOW | WhatsApp link in footer + contact page |

### Differentiators (Competitive Advantage)

Features that separate NELL from generic booking tools and from the "call the club" experience members currently have.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Interactive court map with live availability** | Visual, geographic court selection is rare — most platforms show text lists. NELL has multiple courts possibly at multiple locations; a map makes the choice spatial and intuitive | HIGH | Leaflet.js with color-coded markers (green/red/gray). Clicking marker shows time slots inline. This is the signature UX moment of the platform |
| **Bilingual AI chatbot (Spanish + English)** | The DR pickleball community is new to the sport; an AI that answers "What are the rules?" and "How do I cancel my booking?" in Spanish removes friction for non-English speakers | HIGH | Uses site content as RAG context. OpenAI GPT-4o or Anthropic Claude. Spanish must be primary, not an afterthought |
| **Educational pickleball content hub** | Most club platforms are pure transactional (book, pay, done). A learn section builds loyalty, helps new players get comfortable, and establishes NELL as the authoritative DR pickleball brand | MEDIUM | Sport history, rules, scoring, court dimensions, equipment guide. Admin-editable via CMS |
| **Events system (tournaments, training, social)** | Court reservations alone don't build community. Events drive member engagement and recurring reasons to visit | MEDIUM | Admin creates events; members view + RSVP (or just view for v1). Tournaments especially are social glue |
| **VIP vs Basic tier with location enforcement** | Most small clubs offer one flat membership rate. Tiered pricing with location-scoped access is enterprise behavior that signals professionalism and allows NELL to monetize multi-location expansion | MEDIUM | Stripe product/price IDs map to tier. Basic tier has a location_id foreign key on the membership |
| **Admin CMS for all content** | Custom-built platforms typically hardcode marketing copy, forcing a developer every time text changes. A DB-backed content_blocks system lets the founder update messaging herself | MEDIUM | content_blocks table with page + key + value. No external CMS required |
| **Stripe webhook-backed membership gating** | Many custom builds poll Stripe on each request (slow, fragile) or store status only in DB without sync (out of sync). Webhook-driven sync to Supabase gives real-time accuracy | MEDIUM | Critical for preventing expired members from booking. Supabase Edge Function handles webhook verification + status updates |
| **Session wrap-up reminder ("10 minutes left")** | This is uncommon in booking platforms — it's operationally excellent for court utilization and signals to members that NELL runs a tight, professional operation | LOW | Supabase cron or pg_cron at reservation end_time - 10 min |

### Anti-Features (Deliberately Not Building in v1)

Features that seem valuable but introduce disproportionate complexity, cost, or distraction.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **SMS / WhatsApp notifications** | "Everyone is on WhatsApp in DR" — true, but requires Twilio or WhatsApp Business API, adds cost per message, requires phone number verification flows | Doubles notification infrastructure complexity; WhatsApp Business API approval takes weeks; Twilio adds recurring per-SMS cost on a tight launch budget | Email notifications cover confirmations and reminders. WhatsApp contact link on the site is sufficient for v1 support |
| **Member-to-member messaging / chat** | Social features feel like community building | Requires moderation, content policies, storage, real-time infrastructure. Distracts from core reservation loop | Events page + WhatsApp group (managed outside the platform) is the community layer |
| **DUPR / rating integration** | Competitive pickleball players want their skill rating tracked | DUPR API access requires partnership agreement; rating display without context confuses casual players who are NELL's primary audience in v1 | Skill level as a self-reported profile field (dropdown: beginner/intermediate/advanced) is sufficient |
| **Waitlist management** | "What if courts are full?" | Waitlist requires complex state machine (notification → claim → timeout → next in queue). Most courts won't hit full capacity at launch | Show "fully booked" status. Members contact admin via WhatsApp for special arrangements |
| **Guest pass / day-pass purchases** | Non-member bookings, one-time court fees | Requires separate Stripe checkout flow, guest account handling, no-subscription gating logic — doubles the auth complexity | Members can host guests under their own reservation in v1 |
| **Video content hosting** | Instructional videos for pickleball education | Video storage + streaming is expensive (bandwidth costs on Supabase Storage are high for video). YouTube embeds solve this without the cost | Embed YouTube videos in the Learn section — no hosting needed |
| **Native mobile app** | Mobile booking is convenient | App Store/Play Store submission, separate codebase, React Native overhead, $99/yr Apple dev account — all before a single user is acquired | Progressive Web App (PWA) behavior from a responsive Next.js site is the correct v1 mobile strategy |
| **Real-time court occupancy ("X people on court now")** | Operational transparency | Requires hardware sensors or manual check-in; no reliable software-only approach. Creates false expectations if inaccurate | Reservation system provides scheduled occupancy. Actual real-time tracking is a physical ops problem, not a software one |
| **Loyalty points / rewards system** | Gamification to increase retention | Points systems require careful balance design, redemption flows, and member expectation management. Poorly designed points = support burden | Tiered membership (Basic vs VIP) already provides loyalty incentive structure |

---

## Feature Dependencies

```
[Stripe Subscription]
    └──required by──> [Court Reservation Gating]
    └──required by──> [Member Dashboard: Membership Status]
    └──required by──> [VIP vs Basic Location Enforcement]

[User Authentication]
    └──required by──> [Court Reservation Booking]
    └──required by──> [Member Dashboard]
    └──required by──> [Admin Panel]

[Court Reservation Booking]
    └──required by──> [Reservation Confirmation Email]
    └──required by──> [Session Wrap-up Reminder]
    └──required by──> [Admin: View/Cancel Reservations]
    └──required by──> [Interactive Court Map]

[Interactive Court Map]
    └──requires──> [Court Data with GPS Coordinates]
    └──requires──> [Real-time Availability Query]

[Admin Panel: Court Management]
    └──required by──> [Interactive Court Map] (courts must exist before map shows them)
    └──required by──> [Admin: Block Courts for Maintenance]

[Bilingual AI Chatbot]
    └──requires──> [Site Content in Supabase] (knowledge base)
    └──enhanced by──> [Events System] (chatbot can answer event questions)
    └──enhanced by──> [Educational Content] (chatbot can answer rules questions)

[Events System]
    └──independent of──> [Court Reservation System] (events are separate from bookings)

[Admin CMS]
    └──required by──> [Public Website Content Editing]
    └──enhanced by──> [Educational Content Hub]
```

### Dependency Notes

- **Stripe Subscription requires User Authentication:** A user must exist before a subscription can be attached. Supabase Auth → Stripe Customer → Stripe Subscription is the correct creation order.
- **Court Reservation requires Active Subscription:** The booking API must check Stripe subscription status (via Supabase mirror) before allowing a reservation. This is the core business rule.
- **Interactive Court Map requires Court Data:** Admin must create at least one court with GPS coordinates before the map renders any markers. Seed data or an admin-first flow is needed.
- **Session Reminder requires Reservation End Time:** The scheduled notification depends on an `end_time` field on reservations. This must be computed at booking time (start_time + session_duration).
- **AI Chatbot enhanced by Content:** The chatbot's usefulness scales with how much structured content is in the knowledge base. Ship chatbot after educational content exists.

---

## MVP Definition

### Launch With (v1)

These are required to deliver the core value: "sign up, pay, book a court."

- [x] **User authentication (signup + login + password reset)** — zero court bookings without accounts
- [x] **Stripe subscription checkout (VIP + Basic tiers)** — zero revenue without payment
- [x] **Stripe webhook sync to Supabase** — membership gating requires accurate real-time status
- [x] **Court listing with time-slot availability grid** — members must see what's available
- [x] **Self-service reservation booking + cancellation** — core member action
- [x] **Double-booking prevention** — data integrity; without this the product is broken
- [x] **Reservation confirmation email** — members need proof of booking
- [x] **Member dashboard (reservations + membership status)** — members need self-service
- [x] **Interactive court map with color-coded markers** — signature UX differentiator; worth building in v1 because it defines the brand
- [x] **Admin panel: user management, court management, reservation management** — operator cannot run the club without this
- [x] **Admin CMS: basic content blocks** — founder must be able to update copy without developers
- [x] **Public website: Home, About, Learn Pickleball, Events, Contact** — acquisition and brand trust
- [x] **Bilingual support (Spanish primary, English secondary)** — market requirement in DR
- [x] **Row Level Security on all Supabase tables** — non-negotiable for a multi-tenant membership system

### Add After Validation (v1.x)

Add once the core flow is live and members are actively booking.

- [ ] **Session wrap-up reminder (10 min before end)** — operationally valuable but not blocking launch; add when cron infrastructure is stable
- [ ] **Events RSVP (not just viewing)** — viewing events is v1; RSVP adds state management complexity
- [ ] **AI chatbot** — valuable differentiator but requires content to exist first; ship when Learn + Events content is populated
- [ ] **Admin: Stripe payment dashboard view** — founders need revenue visibility; Stripe dashboard itself covers this initially
- [ ] **Profile editing (name, phone)** — good self-service but not blocking core value
- [ ] **SMS notification opt-in** — add when email open rates show gaps in reminder delivery

### Future Consideration (v2+)

Defer until product-market fit and multi-location expansion.

- [ ] **Multi-location map (national expansion)** — architecture supports it (location_id on courts) but building UI for 1 location first is right
- [ ] **Guest pass / day-pass purchase flow** — separate checkout path; defer until member base is established
- [ ] **Member skill level + matchmaking** — requires DUPR partnership or custom rating system
- [ ] **Loyalty/rewards program** — gamification only makes sense with a large member base
- [ ] **Native mobile app (iOS/Android)** — only justified once web traffic shows high mobile conversion intent
- [ ] **WhatsApp Business API integration** — justified once email open rates prove insufficient
- [ ] **Advanced analytics dashboard** — court utilization rates, peak hours, churn predictions

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| User authentication | HIGH | LOW | P1 |
| Stripe subscription checkout | HIGH | MEDIUM | P1 |
| Court time-slot grid + booking | HIGH | MEDIUM | P1 |
| Double-booking prevention | HIGH | LOW | P1 |
| Reservation confirmation email | HIGH | LOW | P1 |
| Member dashboard | HIGH | LOW | P1 |
| Admin panel (core CRUD) | HIGH | MEDIUM | P1 |
| Stripe webhook sync | HIGH | MEDIUM | P1 |
| Mobile-responsive UI | HIGH | LOW | P1 |
| Interactive court map | HIGH | HIGH | P1 |
| Public website (5 pages) | MEDIUM | MEDIUM | P1 |
| Admin CMS (content blocks) | MEDIUM | MEDIUM | P1 |
| Bilingual UI (i18n) | HIGH | MEDIUM | P1 |
| Session wrap-up reminder (cron) | MEDIUM | LOW | P2 |
| AI chatbot | MEDIUM | HIGH | P2 |
| Events system (view + RSVP) | MEDIUM | MEDIUM | P2 |
| Admin: Stripe payment view | MEDIUM | LOW | P2 |
| Profile self-editing | LOW | LOW | P2 |
| Multi-location map | MEDIUM | HIGH | P3 |
| Guest pass checkout | LOW | HIGH | P3 |
| Native mobile app | MEDIUM | HIGH | P3 |
| Loyalty rewards | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when core is validated
- P3: Nice to have, future consideration

---

## Reservation UX Patterns (Deep Dive)

This section documents the correct UX patterns for court reservation systems, based on established platforms (CourtReserve, Skedda, ClubSpark, Pickleheads).

### Time-Slot Grid vs. Calendar Month View

**Calendar month view** (Google Calendar style) is wrong for court booking. It shows days, not availability within a day.

**Time-slot grid** is the correct pattern:
```
         Court 1    Court 2    Court 3
08:00    [OPEN]     [BOOKED]   [OPEN]
09:30    [OPEN]     [OPEN]     [CLOSED]
11:00    [BOOKED]   [OPEN]     [OPEN]
12:30    [OPEN]     [OPEN]     [BOOKED]
```

Members select a **date** first (date picker), then see the **grid** for that day. Clicking an OPEN slot initiates booking.

**Key UX rules for time-slot grids:**
- Show the full day at once (no pagination within a day)
- Color: green = available, red = booked by someone else, gray = closed/blocked
- "Your booking" gets a distinct color (e.g., blue) so members see their own reservations in context
- Session duration should be fixed (60 or 90 min) rather than variable for v1 — variable duration creates collision complexity

### Interactive Map Flow

The map-first flow (unique to NELL) works best as:
1. **Map view** — all courts shown as markers, color-coded by availability *for today* (or selected date)
2. **Marker click** → **side panel / modal** opens showing time slots for that court
3. **Time slot selection** → **confirm modal** (shows: court name, date, time, member name, tier)
4. **Confirm** → booking created → confirmation email fires

This is a 3-step flow from map to confirmed booking. Each step should be visually distinct.

**Pitfall:** Don't make the map the only entry point. Some members will want to search by time first ("I'm free at 3pm — what's available?"). Provide a secondary "search by time" view alongside the map.

### Cancellation UX

The cancellation window (configurable, e.g., 2 hours before) must be:
- **Clearly communicated at booking time** ("You can cancel up to 2 hours before your session")
- **Enforced at the API level, not just UI level** (members will find workarounds)
- **Visible in the dashboard** — show the deadline: "Cancel by 1:00 PM today"

### Notification Timing That Works

Based on industry patterns for sports facility platforms:
- **Immediate** (< 30 sec): Booking confirmation email
- **24 hours before**: Session reminder ("Your court is tomorrow at 3:00 PM")
- **1 hour before**: Final reminder (optional but high-value)
- **10 minutes before end**: Wrap-up notice (NELL-specific, operationally excellent)

The 24h + 1h pattern significantly reduces no-shows. The 10-min wrap-up is NELL's operational differentiator.

---

## Admin Panel Patterns (Deep Dive)

What club management software gets right that custom builds consistently miss:

### What Professional Tools Do

**CourtReserve, Mindbody, and ClubSpark all include:**

1. **Unified member view** — one screen shows a member's: profile, subscription status, full reservation history, payment history, and admin notes. Custom builds often require jumping between 3+ screens.

2. **Bulk operations** — admins need to cancel all reservations for a blocked date (maintenance day), not one-by-one. Build with multi-select from day one.

3. **Audit trail** — who created/cancelled a reservation, and when. Essential for disputes. Store `created_by`, `cancelled_by`, `cancelled_at` on reservations.

4. **Court utilization at a glance** — % occupancy per day/week. Founders need this to make pricing decisions. Simple aggregate query on reservations table.

5. **Configurable business rules in UI, not code** — cancellation window hours, session duration, max reservations per member per week — these should be admin-settable, not hardcoded. Build a `club_settings` table.

### What Custom Builds Always Miss

1. **Timezone handling** — DR is UTC-4 (Atlantic Standard Time, no DST). All reservation times must store as UTC and display in `America/Santo_Domingo`. Hardcoding local times causes double-booking bugs.

2. **The "admin creates reservation for a member" flow** — walk-in members, phone bookings. Admins need to create reservations on behalf of users. Missing this forces phone reservations to be untracked.

3. **Soft delete, not hard delete** — when a reservation is cancelled, don't delete it. Set `status = 'cancelled'`, `cancelled_at`, `cancelled_by`. Membership managers need history for disputes.

4. **Webhook replay handling** — Stripe sends duplicate webhooks. Without idempotency keys, a member's subscription can appear activated twice or, worse, deactivated then re-activated in the wrong order. Store `stripe_event_id` and check before processing.

---

## Competitor Feature Analysis

| Feature | CourtReserve | Skedda | Pickleheads | NELL Approach |
|---------|--------------|--------|-------------|---------------|
| Court booking | Yes (time-slot grid) | Yes (timeline view) | Yes (map + list) | Map-first + time-slot grid |
| Membership tiers | Yes (complex) | No (space booking only) | No (listing platform) | 2 tiers (VIP + Basic) via Stripe |
| Interactive map | No | No | Yes (find courts near me) | Yes (per-club court map) |
| AI chatbot | No | No | No | Yes (bilingual) |
| Educational content | No | No | Basic rules | Full learn section |
| Events management | Yes | No | No | Yes (tournaments, training, social) |
| Admin CMS | Limited | No | N/A | Yes (content_blocks in DB) |
| Bilingual support | No (English only) | No | No | Yes (Spanish primary) |
| Mobile app | Yes | Yes | Yes | Web PWA only (v1) |
| Session reminders | Email only | Email only | None | Email (confirmation + 24h + wrap-up) |

**Note on confidence:** CourtReserve and Skedda feature lists are from training data (MEDIUM confidence). Pickleheads is a court-finding directory, not a club management tool. This table reflects the competitive landscape as of mid-2025.

---

## Sources

- Training knowledge of CourtReserve, Skedda, ClubSpark, Mindbody, Pickleheads, DUPR platforms (MEDIUM confidence — web tools unavailable for live verification)
- NELL Pickleball Club PROJECT.md requirements (HIGH confidence — primary source)
- General court reservation UX patterns derived from industry-standard booking systems (MEDIUM confidence)
- Stripe subscription + webhook patterns (HIGH confidence — well-established)
- Supabase RLS and auth patterns (HIGH confidence — well-established)
- DR timezone (UTC-4, `America/Santo_Domingo`, no DST) — standard timezone data (HIGH confidence)

---

*Feature research for: Sports club membership and court reservation platform (pickleball)*
*Researched: 2026-03-07*
