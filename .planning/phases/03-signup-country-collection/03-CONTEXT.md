# Phase 3: Signup Country Collection - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a country field to the signup flow so the platform can classify users as local (Dominican) or tourist for pricing purposes. Covers regular signup form, OAuth complete-profile flow, existing user migration, and admin country visibility. Does NOT include pricing display, reservation flow changes, or admin pricing configuration.

</domain>

<decisions>
## Implementation Decisions

### Country selector UX
- Searchable dropdown (custom component), not native HTML select
- Flag emojis (Unicode) displayed next to each country name
- Country names displayed in user's current locale (Spanish or English via next-intl)
- Search matches country names in both languages regardless of current locale (typing "Alemania" or "Germany" both find Germany)
- Styled to match existing signup form inputs (bg-charcoal, border, turquoise focus)

### DR prominence & defaults
- Dominican Republic pre-selected as default value
- When dropdown opens: DR pinned at top with a separator, then all countries alphabetical
- No explanation or helper text about why country is collected
- Country field is required — blocks form submission if cleared

### OAuth signup flow
- Same searchable country selector on complete-profile page (identical component, DR pre-selected)
- Country field placed after phone field on complete-profile page
- Existing users (signed up before country field): migration sets all to "DO" — current members are almost certainly local

### Admin country management
- Admins can view AND edit a user's country in the admin panel
- Admin edit bypasses the immutability rule (users cannot change their own, but admins can)
- Immutability enforced via RLS policy (not trigger) — allows admin override with service_role

### Form placement & labeling
- Label: "Country" (en) / "Pais" (es) — simple, matches existing label style
- Placement on signup form: after phone field, before password fields
- Full-width field (not sharing a row)
- Placement on complete-profile: after phone field

### Claude's Discretion
- Exact searchable dropdown implementation approach (custom component vs lightweight library)
- Country list data source (static JSON vs API)
- Dropdown animation and max-height
- Keyboard navigation within the dropdown
- Mobile touch behavior for the searchable dropdown

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SignupForm.tsx`: Client component with useActionState, custom styled inputs — country selector goes here
- `complete-profile/page.tsx` + `actions.ts`: OAuth flow — needs country field added
- `app/actions/auth.ts` `signUpAction()`: Server action inserting profile — needs country param
- `app/actions/profile.ts` `updateProfileAction()`: Could be extended for admin country edit
- i18n keys in `messages/en.json` and `messages/es.json` under `Auth.signup` — add country keys

### Established Patterns
- Custom HTML inputs with Tailwind (no UI library): `bg-charcoal text-offwhite border border-[#1E293B] focus:border-turquoise rounded-lg px-4 py-2.5`
- Server Actions with `_prevState` + `FormData` signature
- Action return shape: `{ success: true }` or `{ error: 'code' }`
- `useTranslations('Auth.signup')` for form labels
- `normalizeName()` / `validateName()` pattern for input validation

### Integration Points
- `profiles` table already has `country` column (ISO alpha-2) from Phase 2 migration
- `signUpAction()` in `app/actions/auth.ts` — add country to profile insert
- `completeOAuthProfileAction()` in `complete-profile/actions.ts` — add country to upsert
- Admin user detail view — add country display and edit capability
- RLS policies on `profiles` table — add policy preventing user self-update of country column

</code_context>

<specifics>
## Specific Ideas

No specific references — standard patterns apply. Key points:
- The dropdown should feel native to the existing dark-themed signup form
- DR pre-selection means most local users won't interact with the field at all
- Bilingual search (both languages) is important since the DR audience is bilingual

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-signup-country-collection*
*Context gathered: 2026-03-14*
