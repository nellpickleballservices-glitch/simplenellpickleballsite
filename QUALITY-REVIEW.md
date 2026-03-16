# Quality Review — NELL Pickleball Club

**Branch:** ecommerceV1 | **Date:** 2026-03-15

---

## [HIGH] Silent failure of `court_config` and `court_pricing` inserts in `addCourtAction`

**File:** `app/actions/admin/courts.ts` lines 67–104

After court insert succeeds, follow-up inserts for `court_config` and `court_pricing` are never checked for errors. Returns `{ success: true }` even if they fail, leaving the court in a broken state (no schedule, no pricing).

**Fix:** Check errors on both inserts. Ideally wrap all three in a Postgres transaction via RPC for atomicity.

---

## [HIGH] Court-count query error silently masked in `getLocationsAction`

**File:** `app/actions/admin/locations.ts` lines 29–36

Error from courts count query is never destructured. If it fails, `courts` is `undefined`, `countMap` is empty, and all locations show `courtCount: 0` — which bypasses the delete guard.

**Fix:** Destructure and check the error.

---

## [HIGH] Three admin pages swallow data-load errors with no user feedback

**Files:** `admin/courts/page.tsx`, `admin/reservations/page.tsx`, `admin/locations/page.tsx`

All use empty `catch` blocks. When server actions throw, UI shows an empty list with no error message or retry mechanism.

**Fix:** Add error state and render it to the user.

---

## [HIGH] `CourtConfigForm` useEffect: uncaught rejection leaves component stuck loading

**File:** `app/[locale]/(admin)/admin/courts/CourtConfigForm.tsx` lines 51–76

No `.catch()` on the promise. If `getCourtConfigAction` throws, `setLoading(false)` never fires — component shows loading spinner forever.

**Fix:** Add `.catch()` handler.

---

## [HIGH] `AdminReservationForm`: keyboard submission bypasses hidden field population

**File:** `app/[locale]/(admin)/admin/reservations/AdminReservationForm.tsx` lines 284–334

`startsAt`/`endsAt` populated via button `onClick`. Pressing Enter from any input submits the form without triggering `onClick`, so hidden fields remain empty — functional regression for keyboard users.

**Fix:** Move logic to `onSubmit` on the `<form>` element.

---

## [HIGH] `updateTouristSurchargeAction`: double type-cast defeats TypeScript

**File:** `app/actions/admin/pricing.ts` line 118

`pct as unknown as Record<string, unknown>` silences TypeScript instead of fixing the type mismatch. Supabase `Json` column accepts numbers natively.

**Fix:** Remove the cast. Regenerate Supabase types if needed.

---

## [HIGH] `AdminLocationsPage` uses native `alert()`/`confirm()` instead of `ConfirmDialog`

**File:** `app/[locale]/(admin)/admin/locations/page.tsx` lines 37–43

Rest of admin UI uses custom `ConfirmDialog`. Native dialogs are unstyled, block the main thread, and may be suppressed.

**Fix:** Use `<ConfirmDialog>` following the pattern in `MaintenanceForm.tsx`.

---

## [MEDIUM] Hardcoded `'DO'` in `AdminReservationForm` diverges from `isTourist()` utility

**File:** `AdminReservationForm.tsx` line 170

Hardcodes `country === 'DO'` instead of using the shared `isTourist()` from `lib/utils/pricing.ts`. Two sources of truth.

**Fix:** Import and use the shared utility.

---

## [MEDIUM] `formatTime` duplicated in `TimeSlotGrid` and `CourtDiagram`

**Files:** `TimeSlotGrid.tsx` lines 29–37, `CourtDiagram.tsx` lines 18–27

Identical function. Any change must be made in two places.

**Fix:** Extract to `lib/utils/formatTime.ts`.

---

## [MEDIUM] `AppConfigKey` type is missing keys that are actively used

**File:** `lib/types/reservations.ts` lines 66–73

Missing `'default_session_price_cents'` and `'tourist_surcharge_pct'`. The listed `'session_price_default'` doesn't match any actual DB key.

**Fix:** Align the union with actual DB keys.

---

## [MEDIUM] `AddressAutocomplete`: polling interval has no maximum retry limit

**File:** `components/AddressAutocomplete.tsx` lines 33–39

If Google Maps script never loads, the interval runs indefinitely with no error surfaced.

**Fix:** Add a max attempt count (~50 × 100ms = 5s), then clear and optionally set error state.

---

## [MEDIUM] `LocationCard` uses `<img>` instead of Next.js `<Image>`

**Files:** `LocationCard.tsx` line 22, `admin/locations/page.tsx` line 86

Raw `<img>` bypasses Next.js image optimization.

**Fix:** Use `next/image` with `fill` layout or explicit dimensions.

---

## [MEDIUM] No test coverage for new locations feature and practice mode

Missing tests for: locations server actions, locations query, `[locationId]` page, practice mode slots, `CourtConfigForm`, and admin export guard.

**Minimum:** Unit tests for `generateTimeSlots` with practice mode, `addLocationAction` validation, and update `adminExports.test.ts`.

---

## [LOW] `adminExports.test.ts` does not guard new action exports

**File:** `tests/unit/adminExports.test.ts`

`expectedFunctions` array omits all new exports from this changeset.

---

## [LOW] Hardcoded English error strings in `catch` blocks — not i18n'd

**Files:** `MaintenanceForm.tsx`, `admin/reservations/page.tsx`

Strings like `'Error setting maintenance'` are not passed through `t()`. Spanish-locale admins see English.

---

## [LOW] Missing accessible label on `LocationCard` button

**File:** `LocationCard.tsx` line 16

No `aria-label`. Screen readers announce full card body as button label.

---

## [LOW] `CourtConfigForm` tab strip does not implement ARIA `tablist` pattern

**File:** `CourtConfigForm.tsx` lines 124–146

Plain `<button>` elements without `role="tablist"`, `role="tab"`, `aria-selected`. Keyboard tab navigation is suboptimal.

---

## [LOW] `locations_name_unique` migration has a misleading comment

**File:** `supabase/migrations/0011_locations_name_unique.sql`

Comment says the constraint enables `ON CONFLICT (name)` in `addCourtAction`, but no such upsert exists in the code.

---

## [INFO] `DAY_NAMES_ES` exported but never imported — dead code

**File:** `lib/types/pricing.ts` line 21

---

## [INFO] `getCourtAvailability` fetches all `court_pricing` rows without court filter

**File:** `lib/queries/reservations.ts` line 252

Fetches pricing for all courts even when filtered by location. Unnecessary data transfer as court count grows.

---

## i18n Parity Check

**Result: Structurally in parity.** All English keys exist in Spanish.

**Bug:** Duplicate `Admin.saveChanges` key in both `en.json` and `es.json` (lines 339 and 364). JSON parsers silently use the last value.

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 7     |
| MEDIUM   | 6     |
| LOW      | 5     |
| INFO     | 2     |

**Verdict: BLOCK** — 7 HIGH issues must be resolved before merge.

**Top priorities:**
1. `addCourtAction` insert error handling + atomicity
2. `getLocationsAction` court-count error masking
3. Admin page empty catch blocks
4. `CourtConfigForm` uncaught promise
5. Keyboard form submission fix in `AdminReservationForm`
