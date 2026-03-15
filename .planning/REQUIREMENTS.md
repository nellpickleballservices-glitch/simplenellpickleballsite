# Requirements: NELL Pickleball Club

**Defined:** 2026-03-14
**Core Value:** Members can sign up, pay via Stripe, and immediately reserve pickleball courts

## v1.1 Requirements

Requirements for local vs tourist differential pricing. Each maps to roadmap phases.

### User Classification

- [x] **UCLS-01**: User can select their country from a bilingual dropdown during signup
- [x] **UCLS-02**: Country field stores ISO 3166-1 alpha-2 code on user profile
- [x] **UCLS-03**: Users with country "DO" are classified as local; all others as tourist

### Pricing

- [x] **PRIC-01**: Admin can set base session price per day of week per court
- [ ] **PRIC-02**: Days without specific pricing fall back to a default base price
- [x] **PRIC-03**: Admin can set a global tourist surcharge percentage
- [ ] **PRIC-04**: Tourist session price is calculated as base price x (1 + surcharge%)
- [ ] **PRIC-05**: All price calculations happen server-side only

### Reservations

- [x] **RESV-01**: User sees correct calculated price before confirming a reservation
- [x] **RESV-02**: Reservation stores the calculated price at booking time (snapshot)
- [x] **RESV-03**: Walk-in reservations created by admin include local/tourist designation
- [x] **RESV-04**: Walk-in reservations use correct pricing instead of hardcoded $0

### Admin

- [x] **ADMN-01**: Admin can manage day-of-week session prices per court via pricing panel
- [x] **ADMN-02**: Admin can edit the global tourist surcharge percentage
- [ ] **ADMN-03**: Admin walk-in form includes local/tourist toggle that affects price

## Future Requirements

### Differentiators (deferred)

- **DIFF-01**: Price breakdown showing base + surcharge on checkout
- **DIFF-02**: Price preview tooltips on time-slot grid
- **DIFF-03**: Price included in confirmation email
- **DIFF-04**: Visual pricing calendar for admin
- **DIFF-05**: Pricing audit log (who changed what, when)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Separate price tables for locals vs tourists | Surcharge-on-base is simpler, one change propagates everywhere |
| User self-classification checkbox | Gameable -- country field is harder to fake |
| Per-court surcharge percentages | Over-engineering for single-club use; global surcharge sufficient |
| IP-based geolocation | Unreliable (VPNs, hotel WiFi), privacy concerns, external dependency |
| Hourly peak/off-peak pricing | Day-of-week covers immediate needs; hourly is v2+ |
| Promotional pricing with date ranges | Day-of-week specials cover immediate need; admin can manually adjust |
| Multi-currency payments | USD only per PROJECT.md constraints |
| Tourist membership pricing | Tourists unlikely to subscribe; per-session only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UCLS-01 | Phase 3 | Complete |
| UCLS-02 | Phase 3 | Complete |
| UCLS-03 | Phase 3 | Complete |
| PRIC-01 | Phase 4 | Complete |
| PRIC-02 | Phase 2 | Pending |
| PRIC-03 | Phase 4 | Complete |
| PRIC-04 | Phase 2 | Pending |
| PRIC-05 | Phase 2 | Pending |
| RESV-01 | Phase 5 | Complete |
| RESV-02 | Phase 5 | Complete |
| RESV-03 | Phase 5 | Complete |
| RESV-04 | Phase 5 | Complete |
| ADMN-01 | Phase 4 | Complete |
| ADMN-02 | Phase 4 | Complete |
| ADMN-03 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation*
