# NELL Pickleball Club Platform

## What This Is

A production-ready web platform for NELL Pickleball Club — a sports club introducing pickleball in the Dominican Republic, starting in Bávaro with plans for national expansion. The platform enables members to join via Stripe subscriptions, reserve courts, learn about pickleball, and connect with the community. Admins control all content, court management, events, and user oversight through a full-featured admin panel.

## Core Value

Members can sign up, pay their monthly subscription via Stripe, and immediately reserve pickleball courts — everything else supports this primary flow.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication & Accounts**
- [ ] User can sign up with first name, last name, email, phone, password, and membership plan selection
- [ ] First/last names validated: no numbers, whitespace trimmed, capitalization normalized (jose urizar → Jose Urizar)
- [ ] User can log in with email and password
- [ ] User can recover account via Supabase password reset flow (email link → new password)
- [ ] User session persists across browser refresh

**Memberships & Stripe**
- [ ] Two membership tiers: VIP Nell-Picker ($50/mo, all locations) and Basic Nell-Picker ($35/mo, one location)
- [ ] Stripe handles recurring subscriptions, cancellations, upgrades/downgrades
- [ ] Stripe webhooks sync membership status to Supabase in real-time
- [ ] Only members with active subscriptions can reserve courts

**Court Reservation System**
- [ ] Members can view available courts and time slots
- [ ] Members can reserve a session (default 60–90 min configurable)
- [ ] System prevents double-booking
- [ ] Members can cancel reservations within a configurable cutoff window
- [ ] Reservations store snapshot of user first/last name at time of booking

**Interactive Court Map**
- [ ] Reservation page shows map with court location markers
- [ ] Markers color-coded: green (available), red (fully booked), gray (closed)
- [ ] Clicking a marker shows available time slots for that court
- [ ] Admin can set/update GPS coordinates for courts

**Reservation Notifications**
- [ ] Immediate email confirmation sent on reservation
- [ ] Session reminder triggered 10 minutes before session ends (via Supabase Edge Function or cron)
- [ ] Reminder message: "Your pickleball session ends in 10 minutes. Please prepare to exit the court so the next group can begin."

**User Dashboard**
- [ ] Members can view their membership status
- [ ] Members can view upcoming reservations
- [ ] Members can cancel reservations (within allowed window)
- [ ] Members can update profile: first name, last name, phone number
- [ ] Members can change password: current → new → confirm

**Public Website**
- [ ] Home page: hero section, CTA to join, pickleball overview, community messaging
- [ ] About page: club description, vision, mission, values (Love & Passion, Accessibility, Discipline, Respect, Social Commitment, Integrity)
- [ ] Learn Pickleball page: sport origin (1965, Bainbridge Island), rules, scoring, court dimensions, equipment
- [ ] Events page: tournaments, training sessions, social events (admin-controlled)
- [ ] Contact page: contact form, WhatsApp link, social handles
- [ ] All page content editable via Admin CMS (no hardcoded copy)

**Admin Panel**
- [ ] Admin can manage users: search by name/email/phone, view membership status, view reservation history, reset passwords, disable accounts
- [ ] Admin can manage courts: add locations with GPS coordinates, block courts for maintenance
- [ ] Admin can manage reservations: view all, cancel any
- [ ] Admin can manage events: create/edit/delete tournaments, training sessions, social events
- [ ] Admin can view Stripe payment dashboard
- [ ] Admin CMS: edit About page, Rules page, FAQ, Homepage text content blocks

**AI Chatbot**
- [ ] Bilingual AI assistant (Spanish/English) answers questions about pickleball, memberships, reservations, events, and locations
- [ ] Uses site content as knowledge base
- [ ] Friendly, helpful tone

**Security**
- [ ] Row Level Security on all Supabase tables
- [ ] Protected routes for members-only and admin-only areas
- [ ] Admin role enforcement via Supabase
- [ ] Stripe webhook signature verification
- [ ] Login rate limiting

### Out of Scope

- SMS notifications (Twilio) — optional, deferred to post-launch to reduce complexity
- Native mobile app — web-first, mobile later
- Real-time chat between members — not core to club value
- Video content hosting — defer to future milestone
- Multi-currency payments — USD only for v1

## Context

- **Location**: Bávaro, Dominican Republic (national expansion planned)
- **Founder**: María Nelly Mercedes Carrasco (CEO)
- **Contact**: (829)-655-4777 / nellpickleballclub@gmail.com
- **Audience**: Sports enthusiasts in the Dominican Republic, particularly those new to pickleball
- **Language**: Bilingual platform (Spanish primary, English supported)
- **Deployment**: Vercel (frontend), Supabase (backend), Stripe (payments)

## Constraints

- **Tech Stack**: Next.js App Router + TypeScript + TailwindCSS + Framer Motion — mandatory
- **Backend**: Supabase only (Postgres, Auth, Edge Functions, Storage, RLS)
- **Payments**: Stripe only — no alternative payment processors
- **Deployment**: Vercel — no other hosting
- **Email**: Resend or Supabase email for transactional messages
- **Maps**: Leaflet or Google Maps for court location display
- **AI**: OpenAI or Anthropic API for chatbot
- **Scalability**: Architecture must support multiple locations and courts across DR

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth over NextAuth | Native integration with Supabase RLS and database | — Pending |
| Stripe Subscriptions over one-time | Recurring membership model matches business needs | — Pending |
| App Router over Pages Router | Modern Next.js pattern, better for streaming/RSC | — Pending |
| Content blocks in DB (not CMS) | Admin CMS via Supabase content_blocks table, no external CMS needed | — Pending |
| Snapshot names in reservations | Prevents identity mismatch if users update profile | — Pending |

---
*Last updated: 2026-03-07 after initialization*
