# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- Page components: `page.tsx` (Next.js App Router convention)
- Layout components: `layout.tsx`
- Client components: PascalCase descriptive names (e.g., `LoginForm.tsx`, `MembershipCard.tsx`, `ReservationForm.tsx`)
- Server Actions: camelCase verb-noun with `Action` suffix (e.g., `createReservationAction`, `cancelReservationAction`)
- Action files: `actions.ts` — either in `app/actions/` (global) or co-located with route (e.g., `app/[locale]/(member)/reservations/actions.ts`)
- API routes: `route.ts` inside `app/api/` directories
- Utility modules: camelCase (e.g., `normalizeName.ts`, `passwordValidation.ts`)
- Type definition files: camelCase noun (e.g., `reservations.ts`, `admin.ts`) inside `lib/types/`
- Test files: camelCase with `.test.ts` suffix for unit tests, camelCase with `.spec.ts` suffix for E2E tests

**Functions:**
- Server Actions: `camelCase` with `Action` suffix (e.g., `createCheckoutSessionAction`, `loginAction`, `requireAdmin`)
- Pure utility functions: `camelCase` verb-noun (e.g., `normalizeName`, `validatePasswordLength`, `generateTimeSlots`)
- Private/internal helpers: `camelCase` without export (e.g., `determinePlanType`, `mapStripeStatus`, `getDayType`)
- React components: `PascalCase` (e.g., `LoginForm`, `Navbar`, `ConfirmDialog`)

**Variables:**
- `camelCase` for local variables and function parameters
- Database column names use `snake_case` in queries (matching PostgreSQL schema)
- Type/interface properties mirror database column names when representing DB rows (`snake_case`)
- UI state variables use `camelCase` (e.g., `isPending`, `isAdmin`, `isMember`)
- Boolean variables prefixed with `is`/`has` (e.g., `isVip`, `isSubscribed`, `hasFullCourt`)

**Types:**
- `PascalCase` for interfaces and type aliases (e.g., `Reservation`, `BookingMode`, `AuthActionResult`)
- Union string literal types for enums (e.g., `type BookingMode = 'full_court' | 'open_play'`)
- No TypeScript `enum` keyword used; prefer string literal union types throughout
- Action return types defined as interfaces (e.g., `ReservationActionState`, `AuthActionResult`)

## Code Style

**Formatting:**
- No Prettier or ESLint config detected; uses `next lint` (built-in ESLint from Next.js)
- 2-space indentation throughout
- Single quotes for string literals
- No semicolons (implicit ASI)
- Trailing commas in multi-line objects and function parameters

**Linting:**
- `next lint` via `npm run lint` (Next.js built-in ESLint config)
- TypeScript strict mode enabled in `tsconfig.json`
- No additional ESLint plugins or custom rules configured

## Import Organization

**Order:**
1. React/Next.js framework imports (`react`, `next/*`, `next-intl/*`)
2. Third-party library imports (`@supabase/*`, `stripe`, `openai`)
3. Internal imports using `@/` path alias (`@/lib/*`, `@/components/*`, `@/app/*`)
4. Relative imports for co-located files (`./MembershipCard`, `./actions`)
5. Type-only imports use `import type` syntax (e.g., `import type Stripe from 'stripe'`, `import type { BookingMode } from '@/lib/types/reservations'`)

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)
- Use `@/lib/supabase/server` for server-side Supabase client
- Use `@/lib/supabase/client` for browser-side Supabase client
- Use `@/lib/supabase/admin` for service-role Supabase client (server-only, bypasses RLS)
- Use `@/app/actions/*` for server action imports

## Error Handling

**Server Actions (form-bound):**
- Return typed result objects with `error?: string` and `success?: boolean` fields
- Use string error codes for i18n-friendly messages (e.g., `'slot_taken'`, `'pending_payment_block'`, `'beyond_booking_window'`)
- Never throw from form-bound actions; always return error state
- Pattern: `if (error) return { error: 'error_code' }`

**Server Actions (non-form):**
- Throw `new Error(message)` for unexpected failures
- Pattern: `if (error) throw new Error(error.message)` or `if (error) throw new Error('descriptive message')`

**Supabase query errors:**
- Check `error` from destructured result: `const { data, error } = await supabase.from(...)`
- Handle specific PostgreSQL error codes inline (e.g., `'23P01'` for exclusion violation, `'23505'` for unique violation)
- Log unexpected errors with `console.error()` before returning error state

**API Routes:**
- Return `new Response(message, { status: code })` directly
- Use try/catch for external service calls (Stripe signature verification)
- Return 200 for duplicate/idempotent operations, 400 for client errors, 500 for server errors

**Fire-and-forget operations:**
- Wrap in try/catch with empty or logging-only catch block
- Pattern: email sending that should not block the main flow
- Example: `try { await sendConfirmationEmail(...) } catch { console.error('Failed to send...') }`

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- `console.error()` for operation failures that are caught but not re-thrown
- `console.warn()` for non-critical failures (e.g., post-payment reservation update)
- No `console.log()` in production code (only error/warn)
- Include context in log messages: `console.error('Reservation insert error:', insertError)`

## Comments

**When to Comment:**
- Numbered steps in complex multi-step server actions (e.g., `// 1. Authenticate user`, `// 2. Fetch user profile`)
- Security-critical decisions (e.g., `// CRITICAL: Always call getUser()`)
- Locked architectural decisions referencing docs (e.g., `// LOCKED DECISION (CONTEXT.md):`)
- PostgreSQL error code explanations (e.g., `// 23P01 = exclusion_violation`)
- Warnings about import restrictions (e.g., `// SERVER-ONLY: Never import from client components`)

**JSDoc/TSDoc:**
- Multi-line `/** */` JSDoc comments on exported functions in `lib/` modules
- Include purpose description and any non-obvious behavior
- No `@param` or `@returns` tags; descriptions are prose-only
- Example in `lib/stripe/webhookHandlers.ts` and `lib/queries/reservations.ts`

## Function Design

**Size:** Functions are moderate length (10-80 lines). Complex server actions (e.g., `createReservationAction`) are longer but broken into numbered steps with comments.

**Parameters:**
- Server Actions for `useActionState`: signature is `(_prevState: unknown | StateType, formData: FormData) => Promise<StateType>`
- Utility functions take typed primitives
- Supabase client passed as parameter to webhook handlers (dependency injection pattern)

**Return Values:**
- Server Actions return typed state objects: `Promise<{ error?: string; success?: boolean }>`
- Query functions return domain objects: `Promise<CourtWithConfig[]>`
- Void functions for redirect-only actions (e.g., `logoutAction`)
- Admin actions return `{ success: boolean }` or `{ success: boolean; cancelledCount: number }`

## Module Design

**Exports:**
- Named exports for all functions and types (no default exports except page/layout components)
- Page components use `export default async function PageName()`
- Client form components use `export default function ComponentName()`
- Shared components use named exports: `export function ComponentName()`

**Barrel Files:**
- `lib/stripe/index.ts` exports the Stripe client instance
- `lib/resend/index.ts` exports the Resend client instance
- No barrel files for components; import directly from component file

## Component Patterns

**Server Components (default):**
- Async functions that fetch data directly via Supabase
- Use `getTranslations()` from `next-intl/server` for i18n
- Auth check pattern: `const { data: { user } } = await supabase.auth.getUser()` followed by redirect if null
- Pass data as props to client components

**Client Components:**
- Marked with `'use client'` directive at top of file
- Use `useTranslations()` from `next-intl` for i18n
- Use `useActionState()` for form submissions with server actions
- Props defined via TypeScript interfaces above the component

**i18n Pattern:**
- All user-facing strings come from `messages/es.json` and `messages/en.json`
- Server components: `const t = await getTranslations('Namespace')`
- Client components: `const t = useTranslations('Namespace')`
- String keys are dot-path accessed: `t('keyName')` or `t('nested.keyName')`
- Default locale is `es` (Spanish); secondary is `en` (English)
- Locale prefix strategy: `as-needed` (no prefix for default `es`, `/en/` prefix for English)

## Styling

**Framework:** Tailwind CSS v4 (via `@tailwindcss/postcss`)

**Patterns:**
- Inline Tailwind classes on JSX elements (no CSS modules or styled-components)
- Design tokens used as CSS custom properties via Tailwind: `bg-midnight`, `text-lime`, `text-offwhite`, `bg-charcoal`, `text-turquoise`, `bg-sunset`
- Responsive: `hidden md:flex` for desktop-only, mobile-first approach
- Interactive states: `hover:text-lime`, `hover:scale-105`, `disabled:opacity-50`
- Dark theme throughout (dark backgrounds: `bg-[#0F172A]`, `bg-[#1E293B]`)

## Supabase Client Usage

**Three client types:**
1. `createClient()` from `@/lib/supabase/server` - Server-side with cookie-based auth, respects RLS
2. `createClient()` from `@/lib/supabase/client` - Browser-side, respects RLS
3. `supabaseAdmin` from `@/lib/supabase/admin` - Service role, bypasses ALL RLS (server-only)

**Rules:**
- Use server client for user-facing data fetches in Server Components and Server Actions
- Use admin client for cross-user queries (admin actions) and operations where the user has no session yet (e.g., profile insert during signup)
- NEVER import admin client in client components
- ALWAYS use `getUser()` not `getSession()` for auth checks (security requirement)

---

*Convention analysis: 2026-03-13*
