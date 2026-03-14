# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

**Files:**
- Page components: `page.tsx` (Next.js App Router convention)
- Client components: PascalCase (e.g., `LoginForm.tsx`, `CourtCard.tsx`, `GlowButton.tsx`)
- Server Actions: camelCase verb files (e.g., `auth.ts`, `billing.ts`, `reservations.ts`, `admin.ts`)
- Utility modules: camelCase (e.g., `passwordValidation.ts`, `normalizeName.ts`)
- Type definition files: camelCase (e.g., `reservations.ts`, `admin.ts`) inside `lib/types/`
- i18n message files: lowercase locale code (e.g., `es.json`, `en.json`)

**Functions:**
- Server Actions: `camelCase` + `Action` suffix (e.g., `signUpAction`, `createCheckoutSessionAction`, `cancelReservationAction`)
- Helper/guard functions: `camelCase` without suffix (e.g., `requireAdmin`, `normalizeName`, `determinePlanType`)
- React components: `PascalCase` named exports (e.g., `export function GlowButton()`, `export function Navbar()`)
- Default exports reserved for page components: `export default function LoginForm()`; `export default async function AboutPage()`

**Variables:**
- `camelCase` throughout (e.g., `firstName`, `priceId`, `reservationUserId`)
- Database column names use `snake_case` matching Supabase schema (e.g., `first_name`, `plan_type`, `stripe_customer_id`)
- Environment variables: `UPPER_SNAKE_CASE` with `NEXT_PUBLIC_` prefix for browser-safe vars

**Types:**
- Interfaces and type aliases: `PascalCase` (e.g., `AuthActionResult`, `ReservationStatus`, `CourtWithConfig`)
- Union type literals: `snake_case` strings matching DB enums (e.g., `'full_court' | 'open_play'`, `'pending_payment' | 'paid'`)
- Action return types defined as `type` aliases near the action file (e.g., `AuthActionResult`, `ProfileActionResult`, `ReservationActionState`)

## Code Style

**Formatting:**
- No explicit formatter config (no `.prettierrc`, `.eslintrc`, or `biome.json` present)
- De facto style: 2-space indentation, single quotes for strings, no trailing commas in function params
- Template literals for string interpolation (backticks)

**Linting:**
- `next lint` via `package.json` scripts (Next.js built-in ESLint config)
- No custom ESLint rules configured beyond Next.js defaults

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Non-null assertions (`!`) used for environment variables: `process.env.STRIPE_SECRET_KEY!`
- `as` type assertions for FormData: `formData.get('email') as string`
- Path alias: `@/*` maps to project root

## Import Organization

**Order:**
1. Framework/library imports (`next/*`, `react`, `@supabase/*`, `stripe`, `motion/react`)
2. Internal library imports (`@/lib/*`, `@/i18n/*`)
3. Component imports (`@/components/*`)
4. Relative imports (co-located files like `./actions`)
5. Type-only imports use `import type` syntax (e.g., `import type Stripe from 'stripe'`, `import type { Metadata } from 'next'`)

**Path Aliases:**
- `@/*` maps to project root: use `@/lib/supabase/server`, `@/components/Navbar`, `@/app/actions/auth`
- Always use `@/` alias for cross-directory imports. Never use relative `../../` paths except for co-located files.

## Directive Conventions

**`'use server'`:**
- Required at the top of every Server Action file (`app/actions/*.ts`)
- All exported functions in these files become server-callable actions

**`'use client'`:**
- Required at the top of interactive components (forms, buttons with onClick, motion components)
- Examples: `LoginForm.tsx`, `GlowButton.tsx`, `ChatWidget.tsx`, `LanguageSwitcher.tsx`
- Page components (`page.tsx`) are Server Components by default; never add `'use client'`

## Server Action Patterns

**Signature convention for `useActionState`:**
```typescript
export async function someAction(
  _prevState: ActionResultType,
  formData: FormData,
): Promise<ActionResultType> {
```
- First parameter is always `_prevState` (underscore-prefixed, unused)
- Second parameter is always `FormData`
- Return type is always a `Promise<ActionResultType>`

**Authentication guard pattern:**
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  redirect('/login')
}
```
- Always use `getUser()`, never `getSession()` (security requirement documented in middleware comments)
- Admin actions call `requireAdmin()` from `app/actions/admin.ts` which validates `user.app_metadata?.role === 'admin'`

**Return shape for actions:**
- Success: `{ success: true }` or `{ success: true, reservationId: '...' }`
- Validation errors: `{ errors: Record<string, string> }` (field-level)
- General errors: `{ error: 'error_code_string' }` or `{ message: 'Human readable message' }`
- Use string error codes for client-side i18n mapping (e.g., `'slot_taken'`, `'beyond_booking_window'`, `'pending_payment_block'`)

## Error Handling

**Server Actions:**
- Return error state objects instead of throwing for user-facing errors
- Throw `new Error()` for unexpected/system errors in admin actions
- Use `console.error()` for logging unexpected errors before returning error state
- Fire-and-forget operations (emails) wrapped in `try/catch` with `console.error` — failures do not block the main operation

**Webhook handlers (`lib/stripe/webhookHandlers.ts`):**
- Throw errors to bubble up to the route handler, which returns HTTP 500 so Stripe retries
- Non-critical failures use `console.warn()` instead of throwing

**API routes (`app/api/*/route.ts`):**
- Return `new Response(message, { status: code })` directly
- HTTP status codes: 400 for bad input, 200 for idempotent duplicates, 500 for handler errors

**Database errors:**
- Check specific PostgreSQL error codes (e.g., `'23505'` for unique violation, `'23P01'` for exclusion violation)
- Pattern: `if (error.code === '23505') { /* handle duplicate */ }`

## Supabase Client Usage

**Three client types — use the correct one:**
- `createClient()` from `@/lib/supabase/server` — Server Components and Server Actions (respects RLS)
- `createClient()` from `@/lib/supabase/client` — Client Components (browser-side, respects RLS)
- `supabaseAdmin` from `@/lib/supabase/admin` — Service role, bypasses RLS. Use only in admin actions and webhook handlers. Never import from client code.

## Internationalization (i18n)

**Framework:** next-intl v4

**Server Components:**
```typescript
import { getTranslations, getLocale } from 'next-intl/server'
const t = await getTranslations('Namespace')
// Use: t('key')
```

**Client Components:**
```typescript
import { useTranslations } from 'next-intl'
const t = useTranslations('Namespace')
// Use: t('key')
```

**Rules:**
- All user-facing strings must come from `messages/es.json` and `messages/en.json`
- No hardcoded UI strings in `.tsx` files (enforced by `tests/unit/noHardcodedStrings.test.ts`)
- Default locale is `es` (Spanish); `en` uses `/en/` prefix
- CMS-managed content uses `getContentBlocks()` from `@/lib/content.ts` instead of i18n message files

## Component Patterns

**Server Components (pages):**
- `async function` with `await` for data fetching
- Use `getTranslations()` / `getLocale()` from `next-intl/server`
- Fetch data directly with Supabase client
- Pass data as props to client sub-components

**Client Components (forms, interactive):**
- Marked with `'use client'`
- Use `useActionState()` hook (React 19) for form actions: `const [state, formAction, isPending] = useActionState(action, initialState)`
- Use `useTranslations()` from `next-intl`

**Props typing:**
- Use `interface` for component props (e.g., `interface GlowButtonProps { ... }`)
- Inline types for page `params`: `params: Promise<{ locale: string }>`

## Styling

**Framework:** Tailwind CSS v4 (via `@tailwindcss/postcss`)

**Color palette:** Custom named colors used throughout — `midnight`, `charcoal`, `lime`, `electric`, `sunset`, `turquoise`, `offwhite`

**Patterns:**
- Utility classes applied directly in JSX `className`
- Responsive: mobile-first with `sm:`, `md:` breakpoints
- Conditional classes via template literals: `` className={`base-classes ${condition ? 'active' : 'inactive'}`} ``
- Custom CSS classes for gradients: `gradient-text`, `gradient-text-static`
- Font variables: `font-bebas-neue` for headings, `font-inter` (default) for body

## Comments

**When to Comment:**
- Security-critical decisions: `// CRITICAL: Always call getUser()...` in `middleware.ts`
- Architecture decisions referencing docs: `// LOCKED DECISION (CONTEXT.md): ...`
- Layer explanations: `// Layer 2 admin protection: server-side role check`
- PostgreSQL error codes: `// 23P01 = exclusion_violation from EXCLUDE constraint`
- Step-numbered algorithms in complex server actions (e.g., reservation flow steps 1-13)

**JSDoc/TSDoc:**
- Used on webhook handler functions and utility functions in `lib/`
- Not used on React components or page components
- Format: `/** single-line description */` or multi-line with `@param` omitted (params are self-documenting from types)

## Module Design

**Exports:**
- Named exports for all components, actions, and utilities
- Default exports only for Next.js page/layout components (`export default function Page()`)
- No barrel/index files for components — import directly from file path

**Barrel Files:**
- `lib/stripe/index.ts` exports the Stripe client singleton
- `lib/resend/index.ts` exports the Resend client singleton
- Component directories have no barrel files

---

*Convention analysis: 2026-03-14*
