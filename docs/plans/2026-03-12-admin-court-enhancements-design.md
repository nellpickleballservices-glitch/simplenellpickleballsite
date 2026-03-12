# Admin Court Enhancements Design

## Summary

Extend the admin courts page to support per-day operating hours (Mon-Sun), activity blocks (one-off and recurring), and inline editing of court config and pricing. Activity blocks let admins reserve court time for club activities (training, league play, special events, tournaments) that members can see but not book over. Activities are included in membership/session pass — no additional cost.

## Database Schema Changes

### court_config migration

Replace `day_type` enum (`weekday`/`weekend`) with `day_of_week` (SMALLINT 0-6, Monday=0 through Sunday=6).

- Migrate existing weekday rows into 5 rows (Mon-Fri), weekend rows into 2 rows (Sat-Sun)
- Update UNIQUE constraint to `(court_id, day_of_week)`
- Columns unchanged: `open_time`, `close_time`, `full_court_start`, `full_court_end`, `open_play_start`, `open_play_end`

### New activity_blocks table

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
court_id        UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE
name            TEXT NOT NULL
description     TEXT
activity_type   TEXT NOT NULL CHECK (activity_type IN ('training', 'league', 'special_event', 'tournament', 'custom'))
is_recurring    BOOLEAN NOT NULL DEFAULT false
-- One-off fields (null if recurring):
start_time      TIMESTAMPTZ
end_time        TIMESTAMPTZ
-- Recurring fields (null if one-off):
day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6)
recur_start     TIME
recur_end       TIME
-- Metadata:
cancelled_dates TIMESTAMPTZ[] DEFAULT '{}'
created_at      TIMESTAMPTZ DEFAULT now()
```

Constraints:
- One-off blocks require `start_time` and `end_time`
- Recurring blocks require `day_of_week`, `recur_start`, and `recur_end`
- Recurring blocks run indefinitely until deleted; individual dates can be skipped via `cancelled_dates`

## Admin UI

### Courts page — per-court expandable edit panel with 3 tabs

**Tab 1: Hours**
- 7-row table (Mon-Sun), each row: open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end
- Time inputs as dropdowns (30-min increments)
- "Copy to all days" shortcut button
- Save per court

**Tab 2: Activities**
- List of existing activity blocks (name, type, schedule, delete button)
- "Add Activity" form: name, type dropdown, one-off/recurring toggle
  - One-off: date picker + start/end time
  - Recurring: day-of-week picker + start/end time
- Recurring activities: expandable upcoming occurrences list with "Cancel this date" buttons

**Tab 3: Pricing**
- Two rows: full_court and open_play with editable price fields (dollars, stored as cents)
- Save per court

## Server Actions

### New actions in app/actions/admin.ts

- `updateCourtHoursAction(courtId, configs[])` — upserts all 7 day rows in court_config
- `updateCourtPricingAction(courtId, fullCourtPrice, openPlayPrice)` — updates court_pricing
- `addActivityBlockAction(courtId, { name, type, isRecurring, ... })` — inserts into activity_blocks
- `deleteActivityBlockAction(blockId)` — deletes an activity block
- `cancelActivityOccurrenceAction(blockId, date)` — appends date to cancelled_dates array
- `getActivityBlocksAction(courtId)` — fetches blocks for a court

## Reservation Logic Updates

### Conflict check in app/actions/reservations.ts

Before creating a reservation, check activity_blocks for overlap:
1. One-off: `start_time < booking_end AND end_time > booking_start`
2. Recurring: `day_of_week = booking_day AND recur_start < booking_end_time AND recur_end > booking_start_time AND booking_date NOT IN cancelled_dates`

Reject with: "This time slot is reserved for {activity_name}"

### Member-facing time slots in lib/queries/reservations.ts

When generating time slots for a court/date, fetch matching activity blocks and mark those slots as blocked with the activity name. Render with muted styling and activity label — not clickable.

## Decisions

- Approach A chosen: extend existing tables rather than calendar-event rewrite
- Per-day schedules (Mon-Sun) instead of weekday/weekend split
- Recurring blocks run indefinitely, cancelled per-occurrence via cancelled_dates array
- Activity blocks are free — included in membership/session pass
- No new activity-specific pricing
