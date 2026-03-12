# Admin Court Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-day operating hours editing, activity blocks (one-off + recurring), and pricing editing to the admin courts page; update reservation logic to respect activity blocks.

**Architecture:** New migration replaces `court_config.day_type` with `day_of_week` (0-6) and adds `activity_blocks` table. Admin courts page gets expandable edit panel with 3 tabs (Hours, Activities, Pricing). Reservation creation checks activity_blocks for conflicts. Member-facing time slots show blocked activities.

**Tech Stack:** Next.js 15, React 19, Supabase (service_role for admin), Tailwind CSS, next-intl

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/0006_court_hours_activities.sql`

**Step 1: Write the migration**

```sql
-- NELL Pickleball Club — Per-day court hours + activity blocks
-- Run in: Supabase Dashboard -> SQL Editor (after 0005)

-- ============================================================
-- 1. Migrate court_config from day_type to day_of_week
-- ============================================================

-- Add new column
ALTER TABLE court_config ADD COLUMN day_of_week SMALLINT;

-- Expand weekday rows (day_type='weekday') into Mon-Fri (0-4)
-- Keep original row as Monday (0)
UPDATE court_config SET day_of_week = 0 WHERE day_type = 'weekday';

-- Insert Tue-Fri copies from weekday rows
INSERT INTO court_config (court_id, day_of_week, open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end)
SELECT court_id, d.dow, open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end
FROM court_config
CROSS JOIN (VALUES (1),(2),(3),(4)) AS d(dow)
WHERE day_type = 'weekday';

-- Expand weekend rows into Sat(5) and Sun(6)
-- Keep original as Saturday (5)
UPDATE court_config SET day_of_week = 5 WHERE day_type = 'weekend';

-- Insert Sunday copy
INSERT INTO court_config (court_id, day_of_week, open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end)
SELECT court_id, 6, open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end
FROM court_config
WHERE day_type = 'weekend';

-- Drop old constraint and column
ALTER TABLE court_config DROP CONSTRAINT court_config_court_id_day_type_key;
ALTER TABLE court_config DROP CONSTRAINT court_config_day_type_check;
ALTER TABLE court_config DROP COLUMN day_type;

-- Add NOT NULL and new unique constraint
ALTER TABLE court_config ALTER COLUMN day_of_week SET NOT NULL;
ALTER TABLE court_config ADD CONSTRAINT court_config_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6);
ALTER TABLE court_config ADD CONSTRAINT court_config_court_id_day_of_week_key UNIQUE (court_id, day_of_week);

-- ============================================================
-- 2. Create activity_blocks table
-- ============================================================
CREATE TABLE activity_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id        UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  activity_type   TEXT NOT NULL CHECK (activity_type IN ('training', 'league', 'special_event', 'tournament', 'custom')),
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  recur_start     TIME,
  recur_end       TIME,
  cancelled_dates TIMESTAMPTZ[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Constraints: one-off requires start_time+end_time, recurring requires day_of_week+recur_start+recur_end
ALTER TABLE activity_blocks ADD CONSTRAINT activity_block_oneoff_check
  CHECK (is_recurring = true OR (start_time IS NOT NULL AND end_time IS NOT NULL));
ALTER TABLE activity_blocks ADD CONSTRAINT activity_block_recurring_check
  CHECK (is_recurring = false OR (day_of_week IS NOT NULL AND recur_start IS NOT NULL AND recur_end IS NOT NULL));

-- RLS
ALTER TABLE activity_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read activity_blocks" ON activity_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on activity_blocks" ON activity_blocks FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Step 2: Commit**

```bash
git add supabase/migrations/0006_court_hours_activities.sql
git commit -m "feat: add per-day court hours migration and activity_blocks table"
```

---

### Task 2: Update Types

**Files:**
- Modify: `lib/types/reservations.ts`

**Step 1: Update CourtConfig type and add ActivityBlock type**

In `lib/types/reservations.ts`, replace `DayType` and `CourtConfig` and add `ActivityBlock`:

```typescript
// Replace:
// export type DayType = 'weekday' | 'weekend'
// With:
export type DayType = 'weekday' | 'weekend' // kept for backwards compat
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

// Replace CourtConfig interface:
export interface CourtConfig {
  id: string
  court_id: string
  day_of_week: DayOfWeek
  open_time: string
  close_time: string
  full_court_start: string | null
  full_court_end: string | null
  open_play_start: string | null
  open_play_end: string | null
}

// Add after CourtPricing:
export type ActivityType = 'training' | 'league' | 'special_event' | 'tournament' | 'custom'

export interface ActivityBlock {
  id: string
  court_id: string
  name: string
  description: string | null
  activity_type: ActivityType
  is_recurring: boolean
  start_time: string | null
  end_time: string | null
  day_of_week: DayOfWeek | null
  recur_start: string | null
  recur_end: string | null
  cancelled_dates: string[]
  created_at: string
}
```

Also update the `TimeSlot` interface to support activity blocks:

```typescript
export interface TimeSlot {
  startTime: string
  endTime: string
  mode: BookingMode
  spots: SpotInfo[]
  activityBlock?: { name: string; activityType: ActivityType } | null
}
```

**Step 2: Commit**

```bash
git add lib/types/reservations.ts
git commit -m "feat: update types for per-day court config and activity blocks"
```

---

### Task 3: Update Reservation Queries

**Files:**
- Modify: `lib/queries/reservations.ts`

**Step 1: Update getDayType to return day_of_week number**

Add a new function `getDayOfWeek` that returns 0-6 (Monday=0). Update `getCourtAvailability` to use `day_of_week` column instead of `day_type`. Also update `generateTimeSlots` to accept activity blocks and mark slots.

Key changes in `lib/queries/reservations.ts`:

1. Add `getDayOfWeek(date: string): number` — maps JS getDay() (Sun=0) to our schema (Mon=0):
```typescript
function getDayOfWeek(date: string): number {
  const d = new Date(date + 'T00:00:00')
  const jsDay = d.getDay() // 0=Sun, 1=Mon, ...
  return jsDay === 0 ? 6 : jsDay - 1 // 0=Mon, 6=Sun
}
```

2. In `getCourtAvailability`, replace `.eq('day_type', dayType)` with `.eq('day_of_week', dayOfWeek)`. Add a parallel query for `activity_blocks` matching the court's day. Pass activity blocks to `generateTimeSlots`.

3. In `generateTimeSlots`, accept an additional `activityBlocks` parameter. For each hour slot, check if any activity block covers that hour. If so, set `activityBlock` on the TimeSlot and mark all spots as unavailable.

Activity block matching logic for a given date+hour:
- **One-off:** `block.start_time <= slotStart AND block.end_time > slotStart`
- **Recurring:** `block.day_of_week === dayOfWeek AND block.recur_start <= hourTime AND block.recur_end > hourTime AND date NOT IN block.cancelled_dates`

**Step 2: Commit**

```bash
git add lib/queries/reservations.ts
git commit -m "feat: update availability queries for per-day config and activity blocks"
```

---

### Task 4: Update Reservation Conflict Check

**Files:**
- Modify: `app/actions/reservations.ts`

**Step 1: Add activity block conflict check**

In `createReservationAction`, after step 9 (determine price) and before step 10 (pre-insert conflict check), add a new check:

```typescript
// 9.5. Activity block conflict check
const startsAtDate = date // YYYY-MM-DD string from form
const dayOfWeek = new Date(startsAtDate + 'T00:00:00').getDay()
const schemaDow = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Mon=0, Sun=6
const slotStartTime = startTime.split('T')[1]?.substring(0, 5) || startTime.substring(11, 16)
const slotEndTime = endTime.split('T')[1]?.substring(0, 5) || endTime.substring(11, 16)

// Check one-off blocks
const { data: oneOffBlocks } = await supabase
  .from('activity_blocks')
  .select('id, name')
  .eq('court_id', courtId)
  .eq('is_recurring', false)
  .lt('start_time', endsAt.toISOString())
  .gt('end_time', startsAt.toISOString())

if (oneOffBlocks && oneOffBlocks.length > 0) {
  return { error: `activity_blocked:${oneOffBlocks[0].name}` }
}

// Check recurring blocks
const { data: recurringBlocks } = await supabase
  .from('activity_blocks')
  .select('id, name, recur_start, recur_end, cancelled_dates')
  .eq('court_id', courtId)
  .eq('is_recurring', true)
  .eq('day_of_week', schemaDow)

if (recurringBlocks) {
  for (const block of recurringBlocks) {
    // Check time overlap
    if (block.recur_start && block.recur_end) {
      if (slotStartTime < block.recur_end && slotEndTime > block.recur_start) {
        // Check if this date is cancelled
        const dateStr = startsAt.toISOString().split('T')[0]
        const isCancelled = (block.cancelled_dates ?? []).some(
          (d: string) => d.startsWith(dateStr)
        )
        if (!isCancelled) {
          return { error: `activity_blocked:${block.name}` }
        }
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add app/actions/reservations.ts
git commit -m "feat: add activity block conflict check to reservation creation"
```

---

### Task 5: Admin Server Actions

**Files:**
- Modify: `app/actions/admin.ts`

**Step 1: Add court config and activity block actions**

Append these server actions to `app/actions/admin.ts`:

```typescript
// ---------------------------------------------------------------------------
// Court Config Actions (Hours & Pricing)
// ---------------------------------------------------------------------------

export async function getCourtConfigAction(courtId: string) {
  await requireAdmin()

  const [configResult, pricingResult] = await Promise.all([
    supabaseAdmin
      .from('court_config')
      .select('*')
      .eq('court_id', courtId)
      .order('day_of_week'),
    supabaseAdmin
      .from('court_pricing')
      .select('*')
      .eq('court_id', courtId),
  ])

  return {
    configs: configResult.data ?? [],
    pricing: pricingResult.data ?? [],
  }
}

export async function updateCourtHoursAction(
  courtId: string,
  configs: {
    day_of_week: number
    open_time: string
    close_time: string
    full_court_start: string | null
    full_court_end: string | null
    open_play_start: string | null
    open_play_end: string | null
  }[]
): Promise<{ success: boolean }> {
  await requireAdmin()

  for (const config of configs) {
    const { error } = await supabaseAdmin
      .from('court_config')
      .upsert(
        {
          court_id: courtId,
          day_of_week: config.day_of_week,
          open_time: config.open_time,
          close_time: config.close_time,
          full_court_start: config.full_court_start,
          full_court_end: config.full_court_end,
          open_play_start: config.open_play_start,
          open_play_end: config.open_play_end,
        },
        { onConflict: 'court_id,day_of_week' }
      )
    if (error) throw new Error(error.message)
  }

  return { success: true }
}

export async function updateCourtPricingAction(
  courtId: string,
  fullCourtPriceCents: number,
  openPlayPriceCents: number
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error: e1 } = await supabaseAdmin
    .from('court_pricing')
    .upsert(
      { court_id: courtId, mode: 'full_court', price_cents: fullCourtPriceCents },
      { onConflict: 'court_id,mode' }
    )
  if (e1) throw new Error(e1.message)

  const { error: e2 } = await supabaseAdmin
    .from('court_pricing')
    .upsert(
      { court_id: courtId, mode: 'open_play', price_cents: openPlayPriceCents },
      { onConflict: 'court_id,mode' }
    )
  if (e2) throw new Error(e2.message)

  return { success: true }
}

// ---------------------------------------------------------------------------
// Activity Block Actions
// ---------------------------------------------------------------------------

export async function getActivityBlocksAction(courtId: string) {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('activity_blocks')
    .select('*')
    .eq('court_id', courtId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addActivityBlockAction(
  courtId: string,
  block: {
    name: string
    description?: string
    activity_type: string
    is_recurring: boolean
    start_time?: string
    end_time?: string
    day_of_week?: number
    recur_start?: string
    recur_end?: string
  }
): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!block.name) throw new Error('Activity name is required')
  if (!['training', 'league', 'special_event', 'tournament', 'custom'].includes(block.activity_type)) {
    throw new Error('Invalid activity type')
  }

  const { error } = await supabaseAdmin.from('activity_blocks').insert({
    court_id: courtId,
    name: block.name,
    description: block.description || null,
    activity_type: block.activity_type,
    is_recurring: block.is_recurring,
    start_time: block.is_recurring ? null : block.start_time,
    end_time: block.is_recurring ? null : block.end_time,
    day_of_week: block.is_recurring ? block.day_of_week : null,
    recur_start: block.is_recurring ? block.recur_start : null,
    recur_end: block.is_recurring ? block.recur_end : null,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function deleteActivityBlockAction(
  blockId: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('activity_blocks')
    .delete()
    .eq('id', blockId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function cancelActivityOccurrenceAction(
  blockId: string,
  date: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  // Fetch current cancelled_dates
  const { data: block, error: fetchError } = await supabaseAdmin
    .from('activity_blocks')
    .select('cancelled_dates')
    .eq('id', blockId)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const current = block?.cancelled_dates ?? []
  const updated = [...current, date]

  const { error } = await supabaseAdmin
    .from('activity_blocks')
    .update({ cancelled_dates: updated })
    .eq('id', blockId)

  if (error) throw new Error(error.message)
  return { success: true }
}
```

Also update `addCourtAction` to create 7 per-day configs instead of 2 weekday/weekend rows. Replace the existing `court_config` insert block (lines 337-358) with:

```typescript
  // Create default court_config (7 days: Mon-Sun)
  const defaultConfigs = Array.from({ length: 7 }, (_, i) => ({
    court_id: courtData.id,
    day_of_week: i,
    open_time: '07:00',
    close_time: '22:00',
    full_court_start: i < 5 ? '07:00' : '07:00',  // weekday/weekend same default
    full_court_end: i < 5 ? '17:00' : '15:00',
    open_play_start: i < 5 ? '17:00' : '15:00',
    open_play_end: '22:00',
  }))
  await supabaseAdmin.from('court_config').insert(defaultConfigs)
```

**Step 2: Commit**

```bash
git add app/actions/admin.ts
git commit -m "feat: add court config, pricing, and activity block admin actions"
```

---

### Task 6: Court Edit Panel — Hours Tab

**Files:**
- Create: `app/[locale]/(admin)/admin/courts/CourtEditPanel.tsx`

**Step 1: Build the tabbed edit panel with Hours tab**

Create `CourtEditPanel.tsx` — a client component that takes `courtId` and `courtName` props. It has 3 tabs: Hours, Activities, Pricing.

The **Hours tab** shows a 7-row table (Mon-Sun). Each row has 6 time dropdowns (30-min increments from 00:00-23:30): open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end. Has a "Copy Monday to all" button and a Save button.

On mount, calls `getCourtConfigAction(courtId)` to populate the form. On save, calls `updateCourtHoursAction(courtId, configs)`.

Day labels: `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']`

Time dropdown helper: generate options from `'00:00'` to `'23:30'` in 30-min steps.

Style: use the project's dark theme (`bg-[#111b2e]`, `text-offwhite`, `text-gray-400`, `bg-lime` for buttons). Use `useTranslations('Admin')` for i18n keys.

**Step 2: Commit**

```bash
git add app/[locale]/(admin)/admin/courts/CourtEditPanel.tsx
git commit -m "feat: add court edit panel with hours tab"
```

---

### Task 7: Court Edit Panel — Activities Tab

**Files:**
- Modify: `app/[locale]/(admin)/admin/courts/CourtEditPanel.tsx`

**Step 1: Add Activities tab content**

The Activities tab shows:
1. List of existing activity blocks for this court (fetched via `getActivityBlocksAction`). Each shows: name, type badge, schedule description (e.g., "Every Tuesday 18:00-20:00" or "Mar 15, 2026 10:00-12:00"), and a delete button (with ConfirmDialog).
2. For recurring blocks: an "Upcoming" expandable section showing next 4 occurrences with "Skip this date" button for each (calls `cancelActivityOccurrenceAction`).
3. "Add Activity" form at bottom:
   - Name (text input)
   - Type (select: training, league, special_event, tournament, custom)
   - Toggle: One-off / Recurring
   - One-off fields: date (date input), start time (time select), end time (time select)
   - Recurring fields: day of week (select Mon-Sun), start time (time select), end time (time select)
   - Submit button calls `addActivityBlockAction`

Day labels for recurring: `['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']`

To compute upcoming occurrences for a recurring block: start from today, find next 4 dates matching `block.day_of_week`, filter out `cancelled_dates`.

**Step 2: Commit**

```bash
git add app/[locale]/(admin)/admin/courts/CourtEditPanel.tsx
git commit -m "feat: add activities tab to court edit panel"
```

---

### Task 8: Court Edit Panel — Pricing Tab

**Files:**
- Modify: `app/[locale]/(admin)/admin/courts/CourtEditPanel.tsx`

**Step 1: Add Pricing tab content**

The Pricing tab shows two rows:
- Full Court: dollar input (displayed as dollars, stored as cents)
- Open Play: dollar input

Pre-populated from `getCourtConfigAction` pricing data. Save button calls `updateCourtPricingAction(courtId, fullCourtCents, openPlayCents)`.

Dollar/cents conversion: display `(price_cents / 100).toFixed(2)`, save `Math.round(parseFloat(input) * 100)`.

**Step 2: Commit**

```bash
git add app/[locale]/(admin)/admin/courts/CourtEditPanel.tsx
git commit -m "feat: add pricing tab to court edit panel"
```

---

### Task 9: Integrate Edit Panel into Courts Page

**Files:**
- Modify: `app/[locale]/(admin)/admin/courts/page.tsx`

**Step 1: Add edit toggle per court**

Add an "Edit" button next to each court's "Maintenance Mode" button. When clicked, toggle the `CourtEditPanel` component below that court card (similar to how `MaintenanceForm` toggles). Track `editCourtId` state alongside `maintenanceCourtId`.

Import `CourtEditPanel` from `./CourtEditPanel`.

**Step 2: Commit**

```bash
git add app/[locale]/(admin)/admin/courts/page.tsx
git commit -m "feat: integrate court edit panel into admin courts page"
```

---

### Task 10: Add i18n Keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Step 1: Add new Admin i18n keys to both locale files**

Add these keys under the `"Admin"` section:

```json
{
  "editCourt": "Edit",
  "hours": "Hours",
  "activities": "Activities",
  "pricing": "Pricing",
  "monday": "Mon",
  "tuesday": "Tue",
  "wednesday": "Wed",
  "thursday": "Thu",
  "friday": "Fri",
  "saturday": "Sat",
  "sunday": "Sun",
  "openTime": "Open",
  "closeTime": "Close",
  "fullCourtStart": "Full Court Start",
  "fullCourtEnd": "Full Court End",
  "openPlayStart": "Open Play Start",
  "openPlayEnd": "Open Play End",
  "copyToAll": "Copy Mon to all",
  "hoursSaved": "Hours saved",
  "pricingSaved": "Pricing saved",
  "fullCourtPrice": "Full Court (per session)",
  "openPlayPrice": "Open Play (per session)",
  "addActivity": "Add Activity",
  "activityName": "Activity Name",
  "activityType": "Activity Type",
  "league": "League",
  "specialEvent": "Special Event",
  "custom": "Custom",
  "oneOff": "One-off",
  "recurring": "Recurring",
  "dayOfWeek": "Day of Week",
  "deleteActivity": "Delete Activity",
  "confirmDeleteActivity": "Delete this activity block?",
  "confirmDeleteActivityMessage": "This will remove the activity from the schedule. Existing reservations are not affected.",
  "activityAdded": "Activity added",
  "activityDeleted": "Activity deleted",
  "skipDate": "Skip",
  "dateCancelled": "Date skipped",
  "upcomingOccurrences": "Upcoming",
  "noActivities": "No activities scheduled",
  "activityBlocked": "Reserved for {name}"
}
```

Spanish equivalents in `messages/es.json`:

```json
{
  "editCourt": "Editar",
  "hours": "Horarios",
  "activities": "Actividades",
  "pricing": "Precios",
  "monday": "Lun",
  "tuesday": "Mar",
  "wednesday": "Mié",
  "thursday": "Jue",
  "friday": "Vie",
  "saturday": "Sáb",
  "sunday": "Dom",
  "openTime": "Apertura",
  "closeTime": "Cierre",
  "fullCourtStart": "Cancha Completa Inicio",
  "fullCourtEnd": "Cancha Completa Fin",
  "openPlayStart": "Juego Abierto Inicio",
  "openPlayEnd": "Juego Abierto Fin",
  "copyToAll": "Copiar Lun a todos",
  "hoursSaved": "Horarios guardados",
  "pricingSaved": "Precios guardados",
  "fullCourtPrice": "Cancha Completa (por sesión)",
  "openPlayPrice": "Juego Abierto (por sesión)",
  "addActivity": "Agregar Actividad",
  "activityName": "Nombre de Actividad",
  "activityType": "Tipo de Actividad",
  "league": "Liga",
  "specialEvent": "Evento Especial",
  "custom": "Personalizado",
  "oneOff": "Única vez",
  "recurring": "Recurrente",
  "dayOfWeek": "Día de la Semana",
  "deleteActivity": "Eliminar Actividad",
  "confirmDeleteActivity": "¿Eliminar esta actividad?",
  "confirmDeleteActivityMessage": "Esto eliminará la actividad del horario. Las reservas existentes no se verán afectadas.",
  "activityAdded": "Actividad agregada",
  "activityDeleted": "Actividad eliminada",
  "skipDate": "Omitir",
  "dateCancelled": "Fecha omitida",
  "upcomingOccurrences": "Próximos",
  "noActivities": "No hay actividades programadas",
  "activityBlocked": "Reservado para {name}"
}
```

**Step 2: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat: add i18n keys for court hours, activities, and pricing"
```

---

### Task 11: Update Member-Facing Time Slot Display

**Files:**
- Modify: the component that renders time slots on the member reservation page (look for `TimeSlotGrid` or similar in `app/[locale]/(member)/` or `components/`)

**Step 1: Show activity blocks in time slot grid**

When a `TimeSlot` has `activityBlock` set (from Task 3 changes), render it differently:
- Muted background (e.g., `bg-gray-800/50`)
- Show activity name and type label
- Not clickable (no onClick handler)
- Distinct from "booked" slots — activity blocks are club-scheduled, not user-reserved

**Step 2: Commit**

```bash
git add <modified-files>
git commit -m "feat: show activity blocks in member-facing time slot grid"
```
