# Phase 3: Reservations - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Core member value loop: court booking with two modes (full court and open play), interactive court cards with Google Maps thumbnails, per-session payment for non-members (Stripe or cash), email notifications (confirmation + 10-min reminder), and dashboard enhancements (upcoming reservations, profile editing, password change). All users (members and non-members) can reserve — login required but active subscription is NOT required.

</domain>

<decisions>
## Implementation Decisions

### Booking flow & access
- ALL logged-in users can make reservations — not just active members
- Members with active subscriptions book free (instant confirmation, no payment step)
- Non-members reserve first → then choose payment: Stripe ($10 per session) or cash at location
- Cash reservations have "pending payment" status with an expiring hold (admin-configurable window before session start; default 2 hours). If not confirmed by admin before window, slot opens back up
- Stripe per-session payment: after reserving, user clicks "Pay with Stripe" → Stripe Checkout → payment completes → reservation status changes from "pending payment" to "paid"
- Users with any pending payment reservation are BLOCKED from making new bookings until they pay or admin clears it
- proxy.ts membership gate does NOT apply to reservation routes — everyone with an account can access

### Advance booking windows
- Members can book further in advance than non-members (admin-configurable, e.g., 48-72hrs for members)
- Non-members limited to 24 hours advance booking
- Admin sets both windows

### Pricing
- Variable pricing: admin sets per-session prices per court or per mode (full court vs open play)
- Admin panel has price configuration fields — stored in database
- Members always play free (included in subscription)

### VIP membership perks
- VIP ($50/mo) can bring guest(s) — guest plays free, doesn't need an account
- VIP member enters guest's full name when booking — admin sees who to expect at entrance
- Guest limit is admin-configurable (default 1)
- Guest perk applies in both full-court and open-play modes
- Non-VIP guests arriving alone (or not with a VIP) pay $10 fee

### Court modes
- Two reservation modes: full court rental and open play (individual spots)
- Admin configures per court: open time, close time, and which hour ranges are full-court vs open-play
- Schedule supports weekday vs weekend variation (two schedule configs per court)
- 1-hour fixed time slots generated from configured hours
- 4 spots per slot per court (always)

### Full court mode
- One person books the entire court (all 4 spots) for their group
- Active members book free; non-members pay $10
- System doesn't track individual players on the court — just the booker
- VIP members can add guest name(s) to the booking

### Open play mode
- Each person books their own individual spot (up to 4 per court per slot)
- Court card shows a court diagram with 4 quadrants — green nodes for available spots, filled/red for taken
- Users see at a glance: "This court has 2/4 spots taken at 6PM"
- VIP guest perk works the same — VIP can claim a spot for their guest

### Visual distinction between modes
- Full-court time slots show a single "Book Court" button
- Open-play time slots show the court diagram with 4 quadrant spots
- Clear visual distinction between the two modes in the time grid

### Court cards (reservation page)
- 3 court cards displayed on the reservation page (one per court)
- Each card shows: court name, location/address, today's operating hours, pricing info ($10 non-member / free for members), current mode indicator (full court or open play)
- Google Maps thumbnail with pin on court location (click opens Google Maps for directions)
- Time slot table showing availability with horizontal tab strip: Today, Tomorrow, +2 days, +3 days
- Only courts with available spots displayed for each time slot
- Bottom of card: button opens modal with court diagram and active/available reservations per time slot
- User selects day → time slot → clicks "Reserve Spot" on the court card

### Court diagram (modal)
- Visual representation of a pickleball court with 4 quadrants
- Green nodes = available spots, red/filled nodes = taken spots
- Per time slot — user can browse time slots and see occupancy for each
- Claude's discretion on whether to use realistic doubles positions or abstract quadrant layout (brand colors: Electric Lime for available)

### Dashboard — upcoming reservations
- Simple table: Date | Time | Court | Status | Cancel
- Sorted by date, minimal and scannable
- Cancel button with confirmation dialog ("Are you sure?" modal with reservation details)

### Dashboard — profile & settings
- Separate `/dashboard/settings` page with sections: Personal Info (name, phone) and Password Change
- Save button per section

### Email notifications
- Simple text emails (no HTML template) via Resend
- Confirmation email sent immediately on reservation
- Reminder email 10 minutes before session ends: "Your pickleball session ends in 10 minutes. Please prepare to exit the court so the next group can begin."
- Reminder fires exactly once per reservation (reminder_sent flag)

### Cancellation
- Configurable cancellation window (e.g., 2 hours before session)
- Confirmation dialog before cancelling
- Outside window: informative error message

### Claude's Discretion
- Court diagram design (realistic doubles positions vs abstract 2x2 quadrants)
- Google Maps implementation (static image API vs embedded mini-map — considering 3 cards on one page)
- Post-reserve payment flow UX (inline panel vs confirmation page)
- Exact admin config UI for court hours, mode schedule, pricing, booking windows
- Re-subscription flow for lapsed members wanting to book
- Expiring hold implementation (cron job vs on-demand check)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `proxy.ts`: Currently gates `/member/` routes by membership status — needs to NOT gate reservation routes
- `lib/stripe/index.ts`: Stripe singleton — reuse for per-session Stripe Checkout
- `app/actions/billing.ts`: Server Actions pattern for Stripe — per-session checkout follows same pattern
- `lib/stripe/webhookHandlers.ts`: Webhook handlers — may need new handler for one-time payment events
- `lib/supabase/admin.ts`: `supabaseAdmin` for service-role DB operations (Edge Functions, admin actions)
- `lib/supabase/server.ts`: Server-side Supabase client for auth-aware queries
- `lib/supabase/client.ts`: Browser Supabase client — Realtime if needed
- `components/Navbar.tsx`: Add reservations link
- `messages/en.json` / `messages/es.json`: i18n message files — add Reservations namespace

### Established Patterns
- Next.js App Router with route groups: `(marketing)`, `(auth)`, `(member)`, `(admin)`
- Server Actions for mutations (auth.ts, billing.ts patterns)
- `@supabase/ssr` for SSR auth with cookie handling
- `next-intl` for i18n with `[locale]` route segment
- Brand: Electric Lime `#39FF14`, Midnight Blue `#0B1D3A`, Caribbean Turquoise `#1ED6C3`, Sunset Orange `#FF6B2C`
- Typography: Bebas Neue (headings), Inter (body), Poppins (accent)
- `test.skip()` for test stubs (Vitest)
- Stripe API version 2026-02-25.clover

### Integration Points
- Reservation page in `(member)` route group — but proxy.ts must allow non-subscribers through
- Dashboard enhancements in `(member)/dashboard` — settings page at `(member)/dashboard/settings`
- Stripe per-session webhook events need handling in existing webhook route
- `reservations` table already exists in schema (Phase 1 migration)
- `courts` and `locations` tables already exist in schema
- Supabase Edge Function for reminder cron (new deployment)
- Resend for email delivery (new integration)

</code_context>

<specifics>
## Specific Ideas

- Court cards with Google Maps thumbnails — not a full interactive Leaflet map. Practical for 3 courts.
- Court diagram with 4 quadrants and colored nodes is the signature UI element — should feel intuitive and branded
- Tab strip for date selection (Today, Tomorrow, +2, +3) — quick switching, no calendar picker
- Pending payment status visible on user's dashboard and admin panel
- VIP guest name field only appears for VIP members during booking

</specifics>

<deferred>
## Deferred Ideas

- **Admin UI for court configuration** (hours, modes, pricing, booking windows) — Phase 4 (Admin & CMS). Phase 3 stores config in database; admin sets via Supabase dashboard or seed data for v1.
- **Cash payment tracking admin UI** — Phase 4. Admin marks cash payments as received and clears pending status.
- **Admin creates reservation on behalf of walk-in** — Phase 4 (RESV-08). Walk-in doesn't need an account; admin handles.
- **Admin cancels any reservation** — Phase 4 (RESV-09).
- **Day pass purchase flow** — Future milestone.
- **Guest passes for non-VIP members** — v2.

</deferred>

---

*Phase: 03-reservations*
*Context gathered: 2026-03-08*
