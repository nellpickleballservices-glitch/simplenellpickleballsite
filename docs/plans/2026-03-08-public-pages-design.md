# NELL Pickleball Club — Public Marketing Pages Design
**Date:** 2026-03-08
**Scope:** Home page enhancements + About, Events, Contact pages
**Status:** Approved

---

## Overview

Enhance the existing home page with 4 new sections and build 3 new public marketing pages (About, Events, Contact). All pages use Server Components for SEO with thin `'use client'` Framer Motion wrappers for animations. Court Reservations is excluded — planned for Phase 3.

---

## Architecture

### Rendering Model
- All pages: `async` Server Components (SEO-friendly RSC)
- Animations: thin `'use client'` wrapper components receiving content as props
- No page-level client boundaries

### Animation Components (new)
```
components/animations/
  FadeInView.tsx        — whileInView fade+slide for sections
  StaggerChildren.tsx   — staggered card grid entrance
  ParallaxHero.tsx      — useScroll+useTransform parallax backgrounds
```

### Routing
- `app/[locale]/about/page.tsx`
- `app/[locale]/events/page.tsx`
- `app/[locale]/contact/page.tsx`
- Home enhancements: `app/[locale]/page.tsx` (existing)

### i18n
All copy in `messages/en.json` + `messages/es.json`. New namespaces: `About.*`, `Events.*`, `Contact.*`. Home additions under `Home.*`.

### Dependencies
- `framer-motion` — install via `npm install framer-motion`

---

## Animation System

| Effect | Implementation | Applied to |
|--------|---------------|------------|
| Parallax hero | `useScroll` → `useTransform(scrollY, [0,500], [0,-150])` on bg layer | All page heroes |
| Fade + slide up | `initial={{ opacity:0, y:40 }}` → `whileInView={{ opacity:1, y:0 }}` | Most sections |
| Stagger grid | `staggerChildren: 0.08` on container | Cards, values, equipment |
| Spring pop | `type:"spring", stiffness:300, damping:20` | Values cards |
| Tab indicator | `layoutId="tab-indicator"` | Events filter |
| Slide alternate | Even: slide left, Odd: slide right | About sections |

All animations respect `prefers-reduced-motion` via `useReducedMotion()`.

---

## Page 1: Home (Enhanced)

New sections injected between existing sections:

### New Sections

**What is Pickleball** (after hero)
- 3-column grid: Paddle / Ball / Court icons (inline SVG)
- Brief copy: sport combines tennis, badminton, ping-pong; easy to learn, social, all ages
- Animation: stagger fade-in cards

**Mission** (after What is Pickleball)
- Full-width dark panel, large Bebas Neue statement
- "Promote mental, physical, and social wellbeing through accessible pickleball facilities, training programs, and community events."
- Animation: parallax background accent, fade up

**Vision** (after Mission)
- Split layout: text left, decorative right (geometric CSS shapes)
- "To become the epicenter of pickleball in Bávaro and throughout the Dominican Republic"
- Animation: slide in from left

**Values** (after Vision)
- 6 cards: Love & Passion, Accessibility, Discipline, Respect, Social Commitment, Integrity
- Each with inline SVG icon and short descriptor
- Animation: stagger spring pop-in

**Events Preview** (before existing CTA Banner)
- 3 placeholder event cards (tournament, training, social)
- "View all events" link → /events
- Animation: stagger fade

### Final Home Section Order
1. Hero (existing)
2. What is Pickleball (new)
3. Mission (new)
4. Vision (new)
5. Values (new)
6. Features / Why NELL (existing)
7. Membership Plans (existing)
8. Events Preview (new)
9. CTA Banner (existing)

---

## Page 2: About

### Sections

| # | Section | Content | Animation |
|---|---------|---------|-----------|
| 1 | Page Hero | "About NELL" — lime accent, parallax background | ParallaxHero |
| 2 | Club Intro | What NELL is; courts installed in gyms, sports centers, plazas, recreational spaces | Fade up |
| 3 | Origin of Pickleball | 1965 timeline: Joel Pritchard, Bill Bell, Barney McCallum; plastic ball + wooden paddles | Horizontal stagger timeline |
| 4 | How It's Played | Singles vs Doubles; objective: hit ball over net; split card layout | Fade left/right alternate |
| 5 | Court Diagram | CSS-drawn court top-down view; 20×44ft labeled; Kitchen (7ft) highlighted in lime | Draw-in on scroll |
| 6 | Scoring | 3 rules as numbered cards: serving team only, first to 11, win by 2 | Stagger |
| 7 | Equipment | 4 cards: Paddles, Balls, Athletic clothing, Court shoes; each with icon | Stagger grid |
| 8 | Leadership | Founder card: María Nelly Mercedes Carrasco, CEO of NELL Pickleball Club | Fade up |

---

## Page 3: Events

### Sections

| # | Section | Content | Animation |
|---|---------|---------|-----------|
| 1 | Page Hero | "Events & Tournaments" | ParallaxHero |
| 2 | Filter Tabs | All / Tournaments / Training / Social — client component | Framer layoutId tab indicator |
| 3 | Event Cards Grid | 6 placeholder cards (2 per category): title, date, location, description, Register button | Stagger, re-animate on filter |
| 4 | Empty State | "No events in this category" message when filter returns 0 | Fade |

### Placeholder Events (in messages files)
- Tournament 1: "NELL Open Tournament" — April 15, 2026 — Bávaro
- Tournament 2: "Doubles Championship" — May 3, 2026 — Bávaro
- Training 1: "Beginner Clinic" — March 20, 2026 — Bávaro
- Training 2: "Advanced Drills" — March 27, 2026 — Bávaro
- Social 1: "Friday Night Pickleball" — March 14, 2026 — Bávaro
- Social 2: "Community Mixer" — March 28, 2026 — Bávaro

---

## Page 4: Contact

### Sections

| # | Section | Content | Animation |
|---|---------|---------|-----------|
| 1 | Page Hero | "Get in Touch" | ParallaxHero |
| 2 | Contact Info Cards | Phone: (829)-655-4777 / Email: nellpickleballclub@gmail.com | Stagger fade |
| 3 | Contact Form | Name, Email, Message, Submit (client component — no backend, logs to console) | Fade up |
| 4 | WhatsApp CTA | Large lime pill → `https://wa.me/18296554777` | Pulse animation |
| 5 | Social | Icon row — placeholder handles | Fade |

---

## Navbar Updates

Add links for About, Events, Contact to `components/Navbar.tsx`. Add corresponding `Nav.*` keys to both message files.

---

## i18n Keys Required

### New namespaces
- `About.*` — all About page copy
- `Events.*` — all Events page copy
- `Contact.*` — all Contact page copy

### Home additions
- `Home.whatIsPickleballHeading`, `Home.whatIsPickleballDesc`
- `Home.missionHeading`, `Home.missionStatement`
- `Home.visionHeading`, `Home.visionStatement`
- `Home.valuesHeading` + 6x `Home.value{N}Title`, `Home.value{N}Desc`
- `Home.eventsPreviewHeading`, `Home.viewAllEvents`

### Nav additions
- `Nav.about`, `Nav.events`, `Nav.contact`

---

## Real Content

- **Phone:** (829)-655-4777
- **Email:** nellpickleballclub@gmail.com
- **WhatsApp:** wa.me/18296554777
- **Founder:** María Nelly Mercedes Carrasco, CEO of NELL Pickleball Club
- **Location:** Bávaro, República Dominicana
