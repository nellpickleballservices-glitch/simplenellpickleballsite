# Phase 3: Signup Country Collection - Research

**Researched:** 2026-03-14
**Domain:** Form UX (searchable dropdown), Supabase RLS, next-intl i18n
**Confidence:** HIGH

## Summary

Phase 3 adds a country selector to the signup flow, stores the ISO 3166-1 alpha-2 code on the user's profile, and enforces immutability so users cannot change their country after signup. The admin panel gets country visibility and edit capability.

The existing codebase uses custom-styled HTML inputs with Tailwind (no UI library like Radix or Headless UI), server actions with `useActionState`, and `next-intl` for i18n. The country selector must be a custom React component -- a searchable dropdown with flag emojis, bilingual search, and DR pinned at the top. No external packages are needed.

**Critical finding:** The CONTEXT.md states "profiles table already has country column from Phase 2 migration" but Phase 2 was marked complete without actual execution -- no migration file exists for the country column, session_pricing table, or calculateSessionPrice function. Phase 3 MUST include the database migration to add the `country` column to `profiles`, the `is_tourist_price` column to `reservations`, and the RLS policy preventing user self-update of the country field. The `admin_users_view` must also be updated to include the country column.

**Primary recommendation:** Build a custom `CountrySelect` client component (no external library), use a static TypeScript country data file with both EN/ES names, add the country column via Supabase migration, and enforce immutability via RLS policy (not trigger).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Searchable dropdown (custom component), not native HTML select
- Flag emojis (Unicode) displayed next to each country name
- Country names displayed in user's current locale (Spanish or English via next-intl)
- Search matches country names in both languages regardless of current locale
- Styled to match existing signup form inputs (bg-charcoal, border, turquoise focus)
- Dominican Republic pre-selected as default value
- When dropdown opens: DR pinned at top with a separator, then all countries alphabetical
- No explanation or helper text about why country is collected
- Country field is required -- blocks form submission if cleared
- Same searchable country selector on complete-profile page (identical component, DR pre-selected)
- Country field placed after phone field on complete-profile page
- Existing users (signed up before country field): migration sets all to "DO"
- Admins can view AND edit a user's country in the admin panel
- Admin edit bypasses the immutability rule (users cannot change their own, but admins can)
- Immutability enforced via RLS policy (not trigger) -- allows admin override with service_role
- Label: "Country" (en) / "Pais" (es) -- simple, matches existing label style
- Placement on signup form: after phone field, before password fields
- Full-width field (not sharing a row)
- Placement on complete-profile: after phone field

### Claude's Discretion
- Exact searchable dropdown implementation approach (custom component vs lightweight library)
- Country list data source (static JSON vs API)
- Dropdown animation and max-height
- Keyboard navigation within the dropdown
- Mobile touch behavior for the searchable dropdown

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UCLS-01 | User can select their country from a bilingual dropdown during signup | CountrySelect component with static data, bilingual search, flag emojis |
| UCLS-02 | Country field stores ISO 3166-1 alpha-2 code on user profile | Migration adds `country CHAR(2)` to profiles; server actions pass country to insert/upsert |
| UCLS-03 | Users with country "DO" are classified as local; all others as tourist | Simple equality check `country === 'DO'` -- no code needed now, but column must exist for Phase 5 |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.4 | Component framework | Already installed |
| Next.js 16 | 16.1.6 | App router, server actions | Already installed |
| next-intl | 4.8.3 | i18n for country labels | Already installed |
| @supabase/supabase-js | 2.98.0 | DB client | Already installed |
| Tailwind CSS | 4.2.1 | Styling | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | Zero new packages needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom dropdown | Headless UI Combobox | Adds ~15KB, project has no UI library pattern |
| Custom dropdown | react-select | Adds ~40KB, heavy for single use case |
| Static country data | i18n-iso-countries npm | Adds dependency for data that never changes |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
components/
  CountrySelect.tsx          # Reusable searchable country dropdown
lib/
  data/
    countries.ts             # Static country data: code, flag, nameEn, nameEs
app/[locale]/(auth)/signup/
  SignupForm.tsx             # Modified: add CountrySelect after phone
app/[locale]/(auth)/signup/complete-profile/
  CompleteProfileForm.tsx    # Modified: add CountrySelect after phone
  actions.ts                 # Modified: read country from FormData
app/actions/auth.ts          # Modified: read country, pass to profile insert
app/actions/admin/users.ts   # Modified: add updateUserCountryAction
app/[locale]/(admin)/admin/users/
  UserSlideOut.tsx           # Modified: show country, add edit dropdown
messages/en.json             # Modified: add Auth.signup.country key
messages/es.json             # Modified: add Auth.signup.pais key
supabase/migrations/
  0008_country_column.sql    # New: ALTER TABLE profiles ADD country
```

### Pattern 1: CountrySelect Component
**What:** Custom searchable dropdown that integrates with HTML forms via hidden input
**When to use:** On SignupForm and CompleteProfileForm
**Example:**
```typescript
// components/CountrySelect.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { countries, type Country } from '@/lib/data/countries'

interface CountrySelectProps {
  name: string           // form field name (e.g. "country")
  label: string          // translated label
  locale: 'en' | 'es'   // for display names
  defaultValue?: string  // ISO code, defaults to 'DO'
}

export function CountrySelect({ name, label, locale, defaultValue = 'DO' }: CountrySelectProps) {
  const [selected, setSelected] = useState<string>(defaultValue)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  // Filter countries: match search in BOTH languages regardless of locale
  const filtered = countries.filter(c =>
    c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
    c.nameEs.toLowerCase().includes(search.toLowerCase())
  )

  // Sort: DR pinned first, then alphabetical in current locale
  const sorted = [
    countries.find(c => c.code === 'DO')!,
    ...filtered.filter(c => c.code !== 'DO').sort((a, b) =>
      (locale === 'es' ? a.nameEs : a.nameEn).localeCompare(
        locale === 'es' ? b.nameEs : b.nameEn
      )
    ),
  ]

  // Hidden input carries value to server action FormData
  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      {/* ... trigger button, search input, dropdown list */}
    </div>
  )
}
```

### Pattern 2: RLS Policy for Country Immutability
**What:** Postgres RLS policy that prevents authenticated users from updating the country column
**When to use:** On profiles table
**Example:**
```sql
-- Drop the existing permissive update policy
DROP POLICY "Users can update own profile" ON profiles;

-- Recreate with column restriction: users can update everything EXCEPT country
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (country IS NOT DISTINCT FROM (SELECT country FROM profiles WHERE id = (SELECT auth.uid())))
  );
```

### Pattern 3: Server Action Integration
**What:** Read country from FormData, pass to Supabase insert
**When to use:** In signUpAction and completeOAuthProfileAction
**Example:**
```typescript
// In signUpAction (app/actions/auth.ts)
const country = (formData.get('country') as string)?.toUpperCase() || 'DO'

// Validate: must be exactly 2 uppercase letters
if (!/^[A-Z]{2}$/.test(country)) {
  return { errors: { country: 'Invalid country code' } }
}

// Insert profile with country
const { error: profileError } = await supabaseAdmin.from('profiles').insert({
  id: data.user.id,
  first_name: firstName,
  last_name: lastName,
  phone: phone || null,
  locale_pref: 'es',
  country,
})
```

### Anti-Patterns to Avoid
- **Fetching country list from API at runtime:** Data is static (249 countries), never changes. Use a static TypeScript file.
- **Using a trigger for immutability:** RLS is the right approach -- triggers run for ALL roles including service_role, which would block admin edits.
- **Storing country as full name:** Always store ISO 3166-1 alpha-2 codes. Display names come from the static data file.
- **Making country nullable:** The field is required. Use NOT NULL DEFAULT 'DO' in the migration to handle existing users.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Country data (codes, flags, names) | Manual typing of 249 countries | Generate from ISO standard list | Typos, missing countries |
| Flag emoji rendering | Complex SVG flags | Unicode flag emojis (two regional indicator chars) | Works everywhere, zero bytes |
| Click-outside-to-close | Manual document event listeners | `useEffect` with `mousedown` listener on document | Standard pattern, but must clean up |

**Key insight:** Unicode flag emojis are formed from two Regional Indicator Symbol characters. For example, "DO" becomes the flag emoji by converting each letter: D -> U+1F1E9, O -> U+1F1F4. This can be computed from the ISO code: `String.fromCodePoint(...code.split('').map(c => 0x1F1E5 + c.charCodeAt(0) - 64))`.

## Common Pitfalls

### Pitfall 1: RLS Policy Blocks Admin Country Edit
**What goes wrong:** If the RLS policy is too restrictive, even service_role admin updates fail
**Why it happens:** Misunderstanding of Supabase roles -- service_role BYPASSES RLS entirely
**How to avoid:** Use RLS (not triggers) for immutability. Admin actions already use `supabaseAdmin` which is service_role.
**Warning signs:** Admin country edit returns permission error

### Pitfall 2: Dropdown Closes When Clicking Search Input
**What goes wrong:** Event bubbling causes the dropdown to toggle closed when user clicks the search field
**Why it happens:** Click handler on the wrapper toggles open/closed
**How to avoid:** Use `onMouseDown` with `e.stopPropagation()` on the search input; separate the trigger button from the dropdown content
**Warning signs:** Users cannot type in search field

### Pitfall 3: Form Submission Without Country Value
**What goes wrong:** If the hidden input is not properly synced with component state, FormData has empty country
**Why it happens:** React state and hidden input out of sync, or component unmounts
**How to avoid:** Always render the hidden input with `value={selected}`, validate server-side that country is present
**Warning signs:** Country stored as null or empty string

### Pitfall 4: Keyboard Accessibility Missing
**What goes wrong:** Dropdown is not navigable via keyboard (Tab, Enter, Escape, Arrow keys)
**Why it happens:** Custom dropdown implementations often skip keyboard handling
**How to avoid:** Add `onKeyDown` handlers: Escape closes, Enter selects, Arrow keys navigate list items, Tab moves focus naturally
**Warning signs:** Cannot use dropdown without a mouse

### Pitfall 5: Existing User Migration Fails
**What goes wrong:** ALTER TABLE fails because column has NOT NULL but no DEFAULT
**Why it happens:** Adding NOT NULL column without DEFAULT to table with existing rows
**How to avoid:** Use `ALTER TABLE profiles ADD COLUMN country CHAR(2) NOT NULL DEFAULT 'DO'` -- the DEFAULT handles existing rows
**Warning signs:** Migration error on production

### Pitfall 6: Bilingual Search Shows Duplicate DR
**What goes wrong:** DR appears both as the pinned item and in the filtered results
**Why it happens:** Filter includes DR in results, and pinning adds it again
**How to avoid:** Always filter out DR from the alphabetical list: `filtered.filter(c => c.code !== 'DO')`
**Warning signs:** Two Dominican Republic entries in dropdown

## Code Examples

### Country Data File
```typescript
// lib/data/countries.ts
export interface Country {
  code: string   // ISO 3166-1 alpha-2
  nameEn: string
  nameEs: string
  flag: string   // Unicode flag emoji
}

// Helper: ISO alpha-2 code to flag emoji
function codeToFlag(code: string): string {
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E5 + c.charCodeAt(0) - 64)
  )
}

// Full list of 249 countries (abbreviated here)
export const countries: Country[] = [
  { code: 'AF', nameEn: 'Afghanistan', nameEs: 'Afganistan', flag: codeToFlag('AF') },
  // ... all 249 ISO countries
  { code: 'DO', nameEn: 'Dominican Republic', nameEs: 'Republica Dominicana', flag: codeToFlag('DO') },
  // ...
]

// Lookup map for O(1) access by code
export const countryByCode = new Map(countries.map(c => [c.code, c]))
```

### Database Migration
```sql
-- 0008_country_column.sql
-- Add country column to profiles and is_tourist_price to reservations
-- Also update admin_users_view to include country

-- 1. Add country column with default 'DO' for existing users
ALTER TABLE profiles ADD COLUMN country CHAR(2) NOT NULL DEFAULT 'DO';

-- 2. Add is_tourist_price flag to reservations (for Phase 5)
ALTER TABLE reservations ADD COLUMN is_tourist_price BOOLEAN DEFAULT false;

-- 3. Drop and recreate the update policy to prevent country self-modification
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND country IS NOT DISTINCT FROM (SELECT p.country FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

-- 4. Update admin_users_view to include country
CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.country,
  p.created_at,
  u.email,
  u.last_sign_in_at,
  u.banned_until,
  u.raw_app_meta_data->>'role' AS role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;
```

### Admin Country Edit Action
```typescript
// In app/actions/admin/users.ts
export async function updateUserCountryAction(userId: string, country: string) {
  await requireAdmin()

  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Invalid country code')

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ country })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  return { success: true }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native `<select>` for country | Custom searchable dropdown | Standard practice | Better UX with 249 options |
| Country name storage | ISO 3166-1 alpha-2 codes | Always standard | Locale-independent, 2 bytes |
| DB trigger for immutability | RLS policy with column check | Supabase pattern | service_role can override |

**Deprecated/outdated:**
- None relevant for this phase

## Open Questions

1. **Phase 2 not actually executed**
   - What we know: Phase 2 is marked complete in ROADMAP.md but no migration exists for `country`, `session_pricing`, `app_config` tourist surcharge, or `calculateSessionPrice()`
   - What's unclear: Whether Phase 2 should be re-executed first or Phase 3 should absorb the country migration
   - Recommendation: Phase 3 should include the country column migration itself. The pricing tables and function are not needed until Phase 4/5. This keeps Phase 3 self-contained.

2. **Country data source for 249 entries**
   - What we know: Need code, English name, Spanish name for all ISO 3166-1 countries
   - What's unclear: Best source for accurate Spanish translations
   - Recommendation: Generate from a well-known source (Wikipedia ISO 3166-1 table or CLDR data). The static file will be ~15KB, loaded once.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/unit --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UCLS-01 | Country dropdown renders with bilingual search | unit | `npx vitest run tests/unit/countrySelect.test.ts -x` | No - Wave 0 |
| UCLS-02 | signUpAction stores ISO alpha-2 code | unit | `npx vitest run tests/unit/signupCountry.test.ts -x` | No - Wave 0 |
| UCLS-02 | completeOAuthProfileAction stores ISO code | unit | `npx vitest run tests/unit/completeProfileCountry.test.ts -x` | No - Wave 0 |
| UCLS-03 | Country "DO" classifies as local | unit | `npx vitest run tests/unit/countryClassification.test.ts -x` | No - Wave 0 |
| UCLS-01 | Country data has all 249 ISO countries | unit | `npx vitest run tests/unit/countryData.test.ts -x` | No - Wave 0 |
| N/A | RLS prevents user country self-update | manual-only | Requires Supabase instance | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/countryData.test.ts` -- validates country list completeness, flag emoji generation
- [ ] `tests/unit/countrySelect.test.ts` -- validates search filtering, bilingual matching, DR pinning
- [ ] `tests/unit/signupCountry.test.ts` -- validates country extraction from FormData, ISO validation
- [ ] Framework install: Already installed (Vitest 4.0.18)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `app/[locale]/(auth)/signup/SignupForm.tsx` -- existing form structure and styling
- Codebase inspection: `app/actions/auth.ts` -- signUpAction pattern with supabaseAdmin profile insert
- Codebase inspection: `supabase/migrations/0001_initial_schema.sql` -- profiles table and RLS policies
- Codebase inspection: `supabase/migrations/0007_admin_view_rpc_ratelimit_index.sql` -- admin_users_view structure
- Codebase inspection: `messages/en.json`, `messages/es.json` -- i18n key structure
- Codebase inspection: `app/[locale]/(auth)/signup/complete-profile/` -- OAuth flow pattern

### Secondary (MEDIUM confidence)
- ISO 3166-1 standard for alpha-2 country codes (well-established standard)
- Unicode Regional Indicator Symbols for flag emoji generation (Unicode 6.0+, universal support)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new packages, all existing
- Architecture: HIGH -- directly extends existing patterns (forms, server actions, RLS)
- Pitfalls: HIGH -- common dropdown UX issues, well-documented RLS patterns
- Migration: MEDIUM -- Phase 2 incomplete state requires Phase 3 to absorb country migration

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- no fast-moving dependencies)
