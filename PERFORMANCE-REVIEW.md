# Performance Review - ecommerceV1 Branch

**Reviewer:** Claude (claude-sonnet-4-6)
**Date:** 2026-03-15
**Scope:** All unstaged changes relative to HEAD (git diff HEAD)
**Focus:** Database queries, server actions, React rendering, bundle size, Supabase patterns

---

## Findings

---

### [HIGH] getCourtAvailability fires 8 parallel Supabase queries on every page load

**File:** lib/queries/reservations.ts:245-273

getCourtAvailability is called on every member-facing reservation page load. The function issues 8 concurrent PostgREST round-trips via Promise.all:

1. courts (with joined locations)
2. court_config
3. court_pricing
4. reservations
5. app_config - pending_payment_hold_hours
6. session_pricing
7. app_config - default_session_price_cents
8. app_config - tourist_surcharge_pct

Queries 5, 7, and 8 all hit the same small app_config table with a primary-key lookup. They can be collapsed into a single query using .in(key, [...]) - the same pattern already used correctly in adminCreateReservationAction and getSessionPricePreviewAction. This wastes 2 round-trips and 2x connection overhead.

  // CURRENT - 3 separate app_config queries
  supabase.from(app_config).select(*).eq(key, pending_payment_hold_hours).single()
  supabase.from(app_config).select(value).eq(key, default_session_price_cents).maybeSingle()
  supabase.from(app_config).select(value).eq(key, tourist_surcharge_pct).maybeSingle()

  // BETTER - 1 query replaces all three
  supabase.from(app_config).select(key, value)
    .in(key, [pending_payment_hold_hours, default_session_price_cents, tourist_surcharge_pct])

Additionally, court_config is fetched for ALL courts in the database (filtered only by day_type) even when locationId scopes the response to one location. JavaScript discards the irrelevant rows after transfer (line 292-294). Adding a .in(court_id, resolvedIds) filter or restructuring into a join would eliminate this over-fetch as court count grows.

---

### [HIGH] getLocationsWithCourtCounts and getLocationsAction use two sequential queries

**Files:** lib/queries/locations.ts:15-41, app/actions/admin/locations.ts:21-41

Both functions first fetch all locations, then separately fetch all courts, then aggregate in JavaScript. This is 2 sequential round-trips where 1 aggregated SQL query suffices. Both are called on page load.

  // CURRENT - 2 sequential queries, JS join
  const { data: locations } = await supabase.from(locations).select(*).order(name)
  const { data: courts }    = await supabase.from(courts).select(location_id).eq(status, open)
  // ... manual countMap loop

  // BETTER - a Postgres view or RPC returns the aggregate in one round-trip
  // CREATE VIEW locations_with_open_court_count AS
  //   SELECT l.*, COUNT(c.id) AS court_count
  //   FROM locations l LEFT JOIN courts c ON c.location_id = l.id AND c.status = open
  //   GROUP BY l.id

Secondary correctness issue: getLocationsAction (admin) fetches courts WITHOUT a status filter, counting closed and maintenance courts toward courtCount. The public function correctly filters to status = open.

---

### [HIGH] addCourtAction performs a gratuitous read-before-write on the locations table

**File:** app/actions/admin/courts.ts:44-54

When adding a court, the action fetches the selected location lat/lng to copy onto the court row:

  const { data: location } = await supabaseAdmin
    .from(locations).select(lat, lng).eq(id, locationId).single()
  // then uses location?.lat / location?.lng in the INSERT

The admin UI already has the full location list (including lat/lng) via getLocationsAction. Passing coordinates as hidden form fields from the client eliminates this sequential server-side round-trip. Duplicating coordinates from locations into courts also creates a staleness risk if the location is later updated.

---

### [HIGH] getCourtsAction is re-fetched on every filter change in AdminReservationsPage

**File:** app/[locale]/(admin)/admin/reservations/page.tsx:40-62

loadData depends on [dateFrom, dateTo, courtId, isTouristFilter, showHistory, page]. Every filter change triggers both getAllReservationsAction AND getCourtsAction:

  const [reservationData, courtData] = await Promise.all([
    getAllReservationsAction({ ... }),
    getCourtsAction(),   // re-fetched on every filter interaction
  ])

The courts list is static reference data used only to populate the filter dropdown. It should be fetched once on mount in a separate useEffect with [] dependencies. loadData should only re-fetch reservations. This halves the Supabase calls on every filter change.

---

### [MEDIUM] timeToMinutes is called repeatedly inside the slot-generation loop

**File:** lib/queries/reservations.ts:33-64 (getModeForMinute)

getModeForMinute calls timeToMinutes up to 6 times per invocation. For a 15-hour window with 30-minute slots: 30 slots x 6 string-parse calls = 180 redundant operations per court per call. All six boundary values are constant for a given CourtConfig. Pre-parse before the while loop:

  const practiceStartMin  = config.practice_start  ? timeToMinutes(config.practice_start)  : null
  const practiceEndMin    = config.practice_end    ? timeToMinutes(config.practice_end)    : null
  const fullCourtStartMin = config.full_court_start ? timeToMinutes(config.full_court_start) : null
  const fullCourtEndMin   = config.full_court_end   ? timeToMinutes(config.full_court_end)   : null
  const openPlayStartMin  = config.open_play_start  ? timeToMinutes(config.open_play_start)  : null
  const openPlayEndMin    = config.open_play_end    ? timeToMinutes(config.open_play_end)    : null

---

### [MEDIUM] Date objects are allocated inside an O(slots x reservations) inner filter

**File:** lib/queries/reservations.ts:136-142

  const slotReservations = activeReservations.filter((r) => {
    const rStart = new Date(r.starts_at)   // allocation per reservation per slot
    const rEnd   = new Date(r.ends_at)
    const sStart = new Date(startTime)     // same value recreated on every iteration
    const sEnd   = new Date(endTime)
    return rStart < sEnd && rEnd > sStart
  })

sStart/sEnd should be hoisted outside the filter. rStart/rEnd should be pre-parsed as timestamps when building activeReservations:

  const activeReservations = reservations
    .filter(r => r.status !== cancelled && r.status !== expired && !isHoldExpired(r, holdHours))
    .map(r => ({ ...r, _startMs: Date.parse(r.starts_at), _endMs: Date.parse(r.ends_at) }))

  const sStartMs = Date.parse(startTime)  // hoisted above filter
  const sEndMs   = Date.parse(endTime)
  const slotReservations = activeReservations.filter(r => r._startMs < sEndMs && r._endMs > sStartMs)

---

### [MEDIUM] SELECT * on reservations transfers unused columns on the hot availability path

**File:** lib/queries/reservations.ts:232-238

  supabase.from(reservations).select(*)

The slot generation logic only needs ~8 of 15+ columns. Projecting only court_id, starts_at, ends_at, status, booking_mode, spot_number, reservation_user_first_name, created_at reduces wire payload on every court availability load.

---

### [MEDIUM] court_config is fetched for all courts in the database, filtered in JavaScript

**File:** lib/queries/reservations.ts:248-251

  supabase.from(court_config).select(*).eq(day_type, dayType)

When locationId is active, config rows for courts at other locations are fetched then discarded at line 292-294. Adding a .in(court_id, resolvedCourtIds) filter scopes this to only relevant rows.

---

### [MEDIUM] use-places-autocomplete is a production dependency that is never imported

**File:** package.json, components/AddressAutocomplete.tsx

use-places-autocomplete (~15 kB minzipped) was added to dependencies but AddressAutocomplete.tsx does not import it. The component manually injects the Google Maps script and uses the raw google.maps.places.Autocomplete API directly. This package is dead weight in the production bundle. Remove it or move it to devDependencies until it is consumed.

---

### [MEDIUM] Hero video grew from 1.5 MB to 11.2 MB with no lazy-load or format optimization

**File:** public/videos/Hero-video2.mp4

Serving an 11 MB video from the Next.js static origin on every landing page visit will severely impact LCP on mobile connections. Recommended fixes:

1. Re-encode at a lower bitrate: ffmpeg -i Hero-video2.mp4 -vcodec libx264 -crf 28 -preset slow output.mp4 (typical short clips under 3 MB)
2. Serve from a CDN (Supabase Storage, Cloudflare R2) instead of the Next.js origin.
3. Add preload=none or preload=metadata to the video element.
4. Provide a WebM alternative for Chromium browsers.

---

### [MEDIUM] ValueTimeline and LocationCard use bare img tags, bypassing Next.js image optimization

**Files:** components/public/ValueTimeline.tsx:79,108,137 and app/[locale]/(member)/reservations/LocationCard.tsx:22

Four img elements bypass Next.js image optimization (WebP/AVIF conversion, lazy loading, responsive srcset, CLS prevention). Replacing with next/image provides all of these for free. The LocationCard hero image is particularly impactful - it appears above the fold on the member reservation landing page for every card in the grid.

  // CURRENT
  <img src={value.image} alt={value.title} className="mt-4 w-full h-32 object-cover rounded-xl" />

  // BETTER - use next/image with fill for unknown dimensions
  <div className="relative mt-4 w-full h-32 rounded-xl overflow-hidden">
    <Image src={value.image} alt={value.title} fill className="object-cover rounded-xl" />
  </div>

---

### [MEDIUM] AdminReservationsPage: new Date() allocations per row per render

**File:** app/[locale]/(admin)/admin/reservations/page.tsx:302-306

  const isInProgress = r.status === confirmed
    && new Date(r.starts_at) <= now   // allocation per row per render
    && new Date(r.ends_at) > now      // allocation per row per render

With 20 rows per page and frequent renders (loading state changes on every filter), two new Date() allocations per row accumulate. Pre-parsing starts_at/ends_at to numeric timestamps when setReservations is called, and comparing with Date.now(), eliminates per-render allocations.

---

### [MEDIUM] CourtConfigForm fetch has no cancellation guard on rapid court toggling

**File:** app/[locale]/(admin)/admin/courts/CourtConfigForm.tsx:51-76

If an admin rapidly toggles config panels between courts, a slow response for court A can overwrite state after court B has already rendered. Add a cancelled flag guard:

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCourtConfigAction(courtId).then((rows) => {
      if (cancelled) return
      // ... setConfigs, setLoading(false)
    })
    return () => { cancelled = true }
  }, [courtId])

---

### [LOW] getAppConfigs fetches all columns unnecessarily

**File:** lib/queries/reservations.ts:344-352

  supabase.from(app_config).select(*)

The table only has key and value columns today. An explicit select(key, value) projection is defensive hygiene: if columns are added later (e.g. updated_at), they will not be silently included in every payload.

---

### [LOW] AddressAutocomplete polling interval has no failure timeout

**File:** components/AddressAutocomplete.tsx:33-39

The return () => clearInterval(check) cleanup is correct for normal unmount. However, if the Google Maps script loads but the places library is unavailable (wrong library parameter, quota exceeded), the interval runs silently until component unmount with no observable signal. A maximum timeout (e.g. 10 seconds) that clears the interval and logs a warning would make this failure mode detectable in production.

---

### [INFO] practice booking mode may not be protected by the no_double_booking exclusion constraint

**Files:** supabase/migrations/0003_reservations.sql:101-111, supabase/migrations/0013_practice_sessions_and_durations.sql

The GIST exclusion constraint expression:

  int4range(
    CASE WHEN booking_mode = full_court THEN 1 ELSE spot_number END,
    CASE WHEN booking_mode = full_court THEN 5 ELSE spot_number + 1 END
  )

Migration 0013 adds practice as a valid booking_mode and permits spot_number = NULL for practice reservations (chk_spot_required allows NULL for full_court and practice modes). When booking_mode = practice and spot_number IS NULL, the ELSE branch evaluates to int4range(NULL, NULL + 1). A range with NULL bounds is invalid - Postgres may raise an error at INSERT time or silently skip the constraint check, meaning two practice sessions could be double-booked for the same court and time.

Fix: explicitly handle practice mode in the constraint expression:

  int4range(
    CASE WHEN booking_mode IN (full_court, practice) THEN 1 ELSE spot_number END,
    CASE WHEN booking_mode IN (full_court, practice) THEN 5 ELSE spot_number + 1 END
  )

Verify this before enabling practice bookings in production.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 4     | warn   |
| MEDIUM   | 9     | warn   |
| LOW      | 2     | note   |
| INFO     | 1     | note   |

**Verdict: WARNING** - No CRITICAL issues. Four HIGH items should be resolved before significant user load.

**Priority order for HIGH items:**

1. Collapse the 3 redundant app_config queries in getCourtAvailability into one .in() call - single line change, immediate win.
2. Stop getCourtsAction from re-firing on every filter change in AdminReservationsPage - fetch courts once on mount in a separate useEffect.
3. Replace the 2-query sequential pattern in getLocationsWithCourtCounts / getLocationsAction with a Postgres view or RPC.
4. Remove the read-before-write in addCourtAction by passing location coordinates from the client form.

**Priority order for notable MEDIUM items:**

5. Pre-parse timeToMinutes boundary values before the slot-generation loop.
6. Remove or move the unused use-places-autocomplete production dependency.
7. Re-compress the 11 MB hero video and serve from a CDN.
8. Replace bare img tags in ValueTimeline and LocationCard with next/image.

**INFO item to verify before production:**

9. Confirm the no_double_booking GIST exclusion constraint correctly handles practice mode with a NULL spot_number before enabling practice bookings.
