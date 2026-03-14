# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

**Files:**
- Components: PascalCase `.tsx` (e.g., `components/admin/StatCard.tsx`, `components/public/EventCard.tsx`)
- Server actions: camelCase `.ts` (e.g., `app/actions/auth.ts`, `app/actions/billing.ts`, `app/actions/reservations.ts`)
- Utility modules: camelCase `.ts` (e.g., `lib/utils/normalizeName.ts`, `lib/utils/passwordValidation.ts`)
- Type definition files: camelCase `.ts` (e.g., `lib/types/admin.ts`, `lib/types/reservations.ts`)
- i18n config: camelCase `.ts` (e.g., `i18n/routing.ts`, `i18n/request.ts`)
- Page files: `page.tsx` (Next.js App Router convention)
- Layout files: `layout.tsx`
- Route handlers: `route.ts`

**Functions:**
- Use camelCase for all functions: `signUpAction`, `createClient`, `normalizeName`, `checkRateLimit`
- Server action functions end with `Action`: `signUpAction`, `loginAction`, `createCheckoutSessionAction`, `cancelReservationAction`
- Handler functions start with `handle`: `handleCheckoutCompleted`, `handleSubscriptionUpdated`, `handleInvoicePaymentFailed`
- Validation functions start with `validate`: `validateName`, `validatePasswordLength`, `validatePasswordMatch`
- Boolean-returning helpers start with `is`/`needs`: `isProtectedRoute`, `isAuthRedirectRoute`, `needsAuthCheck`
- React components use PascalCase: `StatCard`, `EventCard`, `Navbar`, `ChatWidget`

**Variables:**
- Use camelCase: `supabaseResponse`, `firstName`, `planType`, `priceCents`
- Constants use UPPER_SNAKE_CASE: `SESSION_LIMIT`, `WINDOW_MS`, `PROTECTED_PREFIXES`, `TTL_MS`
- Database column names use snake_case in queries: `user_id`, `plan_type`, `stripe_customer_id`

**Types:**
- Interfaces use PascalCase: `MembershipCache`, `AuthActionResult`, `ReservationActionState`, `CourtWithConfig`
- Type aliases use PascalCase: `BookingMode`, `PaymentStatus`, `EventType`, `AppConfigKey`
- Use `type` imports where possible: `import type Stripe from 'stripe'`, `import type { SupabaseClient } from '@supabase/supabase-js'`
- Component props interfaces named `{Component}Props`: `StatCardProps`, `EventCardProps`

## Code Style

**Formatting:**
- No Prettier or ESLint config files detected; uses `next lint` (built-in Next.js ESLint)
- 2-space indentation throughout
- Single quotes for strings
- No semicolons (relies on ASI)
- Trailing commas in multi-line structures

**Linting:**
- `next lint` via `package.json` scripts
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- No additional ESLint plugins configured

**TypeScript:**
- Strict mode enabled
- Non-null assertions (`!`) used for env vars: `process.env.STRIPE_SECRET_KEY!`, `process.env.NEXT_PUBLIC_SUPABASE_URL!`
- Form data values cast with `as string`: `formData.get('email') as string`
- `as any` used sparingly for test mock objects

## Import Organization

**Order:**
1. Framework/runtime imports: `next`, `react`, `next-intl`
2. Third-party packages: `@supabase/ssr`, `stripe`, `openai`
3. Internal absolute imports using `@/` alias: `@/lib/supabase/server`, `@/components/admin/StatCard`
4. Relative imports (rare, used within same module): `'./auth'`, `'./LoginForm'`

**Path Aliases:**
- `@/*` maps to project root `"./*"` (configured in `tsconfig.json`)
- Use `@/lib/` for shared library code
- Use `@/components/` for React components
- Use `@/app/actions/` for server actions
- Use `@/i18n/` for internationalization config

## Error Handling

**Server Actions Pattern:**
- Return typed result objects instead of throwing: `{ errors?: Record<string, string>; message?: string }`
- Use error code strings for machine-readable errors: `'slot_taken'`, `'pending_payment_block'`, `'not_found'`, `'unauthorized'`
- Redirect with `redirect()` for auth failures (unauthenticated users go to `/login`)
- Validation errors collected into an object, returned early if non-empty:
```typescript
const errors: Record<string, string> = {}
if (firstNameError) errors.firstName = firstNameError
if (lastNameError) errors.lastName = lastNameError
if (Object.keys(errors).length > 0) return { errors }
```

**API Route Pattern:**
- Return `new Response(message, { status: code })` for non-JSON responses
- Return `NextResponse.json({ error: 'code', message: 'Human text' }, { status: code })` for JSON APIs
- Use HTTP status codes correctly: 400 for bad input, 429 for rate limiting, 500 for server errors
- Webhook route returns 200 for duplicates (idempotency), 500 for handler errors (triggers Stripe retry)

**Webhook Handlers Pattern:**
- `throw new Error(message)` for critical failures (propagates to route, returns 500)
- `console.warn()` for non-critical failures (e.g., reservation update after payment)
- Early return for non-applicable events (e.g., one-time invoices)

**Try/Catch Pattern:**
- Empty `catch` blocks used intentionally for fire-and-forget operations (email sending, cookie setting in Server Components)
- `catch` with logging for operations that should not block the main flow:
```typescript
try {
  await sendConfirmationEmail(...)
} catch {
  console.error('Failed to send confirmation email')
}
```

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- `console.error()` for unexpected failures: `console.error('Reservation insert error:', insertError)`
- `console.warn()` for non-critical issues: `console.warn('Failed to update reservation...')`
- `console.error('[chat] prefix:')` for namespaced logging in the chat API route
- No structured logging or log levels beyond console methods

## Comments

**When to Comment:**
- Decision rationale comments explain WHY, not WHAT: `// CRITICAL: Always call getUser() -- validates JWT with Supabase auth server.`
- Architecture decision references: `// LOCKED DECISION (CONTEXT.md): Reservation routes are open to ALL authenticated users.`
- Security warnings: `// SERVER-ONLY: Never import from client components. SUPABASE_SERVICE_ROLE_KEY bypasses RLS.`
- API quirks documented: `// In API 2026-02-25.clover, current_period_end moved to subscription items`
- Error code documentation: `// 23P01 = exclusion_violation from EXCLUDE constraint`, `// 23505 = unique_violation`
- `// MUST` prefix for critical implementation notes: `// MUST await -- Next.js 16 async Request APIs`

**JSDoc/TSDoc:**
- Used on exported library functions with `/** */` block comments
- Describes purpose and notable behavior, not parameter types (TypeScript handles that)
- Example: `lib/stripe/webhookHandlers.ts`, `lib/content.ts`, `lib/chat/rate-limit.ts`

## Function Design

**Server Actions:**
- Signature follows `useActionState` convention: `(prevState: State, formData: FormData) => Promise<State>`
- First param `_prevState` prefixed with underscore when unused
- Always authenticate first with `supabase.auth.getUser()`, redirect if no user
- Numbered step comments for complex flows (see `app/actions/reservations.ts`)

**Utility Functions:**
- Pure functions for validation: return `string | null` (error message or null for valid)
- Small, single-purpose: `validatePasswordLength`, `validatePasswordMatch`, `normalizeName`, `validateName`
- No side effects in utility modules

**Components:**
- Server Components by default (no `'use client'` unless needed)
- `'use client'` directive only when client interactivity is required (e.g., `EventCard.tsx`, `MobileNav.tsx`)
- Async Server Components use `await` for data fetching directly in the component
- Props interface defined immediately above the component function

## Module Design

**Exports:**
- Named exports preferred over default exports for utilities and components: `export function StatCard`, `export async function createClient`
- Default exports used for Next.js pages/layouts: `export default async function AdminDashboardPage`
- Barrel files (re-export files) used for admin actions: `app/actions/admin.ts` re-exports from `app/actions/admin/*.ts`

**Supabase Client Pattern (three clients):**
- `lib/supabase/server.ts` - Server Components/Actions (uses cookies, respects RLS)
- `lib/supabase/client.ts` - Client Components (browser client, respects RLS)
- `lib/supabase/admin.ts` - Webhooks/background tasks (service role, bypasses RLS)
- Always use `getUser()` not `getSession()` for auth validation (security requirement)

**Internationalization:**
- All UI strings come from `messages/es.json` and `messages/en.json` via `next-intl`
- Server Components: `const t = await getTranslations('Namespace')`
- No hardcoded UI strings in `.tsx` files (enforced by unit test `tests/unit/noHardcodedStrings.test.ts`)
- Locale detection in server actions via referer header: `referer.includes('/en/')`
- Default locale is `es` (Spanish); `en` uses `/en/` prefix

## Design System / Styling

**Framework:** Tailwind CSS v4 (via `@tailwindcss/postcss`)

**Color Palette (custom tokens):**
- `midnight` - dark backgrounds
- `charcoal` - card backgrounds
- `offwhite` - text color
- `lime` - primary accent / CTA
- `turquoise` - secondary accent
- `sunset` - tertiary accent (tournaments)

**Typography (Google Fonts):**
- `font-bungee` - brand/headings (Bungee)
- `font-bebas-neue` - section headings (Bebas Neue)
- `font-poppins` - body text (Poppins, default)

**Component Styling:**
- Inline Tailwind classes directly on elements (no CSS modules, no styled-components)
- Responsive: mobile-first with `md:` and `lg:` breakpoints
- Dark theme only (no light mode)

---

*Convention analysis: 2026-03-14*
