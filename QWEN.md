# NELL Pickleball Club — Project Context

## Project Overview

This is a **Next.js 16** web application for the **NELL Pickleball Club** — a full-stack platform managing pickleball club operations including court reservations, location management, admin tools, membership, and e-commerce (Stripe integration). The app supports **internationalization (i18n)** with English and Spanish locales.

### Key Technologies

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (SSR) |
| Payments | Stripe |
| Email | Resend |
| Rich Text Editor | Tiptap |
| i18n | next-intl v4 |
| Animations | Motion (Framer Motion) |
| Testing | Vitest (unit), Playwright (E2E) |
| AI Chat | OpenAI API |

### Architecture

- **App Router** with locale-based routing: `app/[locale]/` with route groups `(admin)`, `(auth)`, `(member)`, `(marketing)`
- **Server Actions** for all data mutations (admin courts, locations, reservations, pricing, users)
- **Supabase** for database (PostgreSQL with RLS) and authentication
- **Server-side rendering** with next-intl for i18n
- **Security headers** configured in `next.config.ts` (HSTS, X-Frame-Options, CSP, etc.)

## Directory Structure

```
app/
├── [locale]/           # i18n route group
│   ├── (admin)/        # Admin-only pages (courts, locations, reservations, pricing)
│   ├── (auth)/         # Auth-related pages
│   ├── (member)/       # Member-facing pages (reservations, etc.)
│   └── (marketing)/    # Public marketing pages
├── actions/            # Server actions (admin mutations)
├── api/                # API routes (chat, webhooks)
└── auth/               # Auth utilities

components/             # React components (admin, public, shared)
i18n/                   # next-intl configuration
lib/
├── chat/               # OpenAI chat integration
├── data/               # Static data
├── middleware/           # Auth/admin middleware
├── queries/            # Supabase query functions (read operations)
├── resend/             # Email sending utilities
├── supabase/           # Supabase client setup
├── types/              # TypeScript type definitions
└── utils/              # Utility functions (pricing, formatting)
messages/               # i18n translation files (en.json, es.json)
supabase/
├── migrations/         # Database migrations (SQL)
└── functions/          # Supabase Edge Functions
tests/
├── unit/               # Vitest unit tests
├── auth/               # Auth-related tests
└── i18n/               # i18n tests
```

## Building and Running

### Prerequisites

- Node.js (ES2017+ compatible)
- Supabase project (database + auth)
- Stripe account
- Resend account (email)
- OpenAI API key (for chat feature)
- Google Maps API key (for address autocomplete)

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Additional env vars needed (not in example file):
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all unit tests (Vitest) |
| `npm run test:unit` | Run unit tests only |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Development Conventions

### Code Style

- **TypeScript strict mode** enabled — no `any`, proper type checking
- **ES modules** (`"type": "module"` in package.json)
- **Path aliases**: `@/*` maps to project root (e.g., `@/lib/queries/reservations`)
- **React 19** with JSX transform, Server Components by default

### Patterns

- **Server Actions** in `app/actions/` for all data mutations (prefixed by role: `admin*`, `member*`)
- **Query functions** in `lib/queries/` for read operations (Supabase client calls)
- **Role-based access**: `requireAdmin()` middleware checks `user.app_metadata.role`
- **i18n**: All user-facing strings go through `next-intl` (`useTranslations` hook)
- **Security headers**: Applied globally via `next.config.ts` headers()

### Testing

- **Unit tests**: Vitest with `tests/unit/**/*.test.ts`, runs in Node environment
- **E2E tests**: Playwright
- **Test coverage gaps** (from quality review): locations feature, practice mode, CourtConfigForm, admin export guard

### Database

- **Supabase/PostgreSQL** with Row Level Security (RLS) enabled on all tables
- **Migrations** in `supabase/migrations/` (sequential numbered SQL files)
- **Key tables**: `courts`, `court_config`, `court_pricing`, `reservations`, `locations`, `app_config`, `session_pricing`
- **Exclusion constraints** prevent double-booking (GIST constraint on `int4range`)

### Internationalization

- **Locales**: `es` (default), `en`
- **Routing**: `as-needed` prefix (`/dashboard` for Spanish, `/en/dashboard` for English)
- **Session cookies** for locale preference
- Translation files in `messages/en.json` and `messages/es.json`

## Known Issues & Review Documents

Three comprehensive review documents exist with actionable findings:

| Document | Status | Key Findings |
|----------|--------|-------------|
| `PERFORMANCE-REVIEW.md` | WARN | 4 HIGH, 9 MEDIUM issues (redundant queries, large hero video, dead dependencies) |
| `QUALITY-REVIEW.md` | BLOCK | 7 HIGH issues (silent error handling, uncaught promises, keyboard submission bugs) |
| `SECURITY-REVIEW.md` | WARN | 1 CRITICAL (real credentials in `.env.local`), 3 HIGH (no timestamp validation, XSS via CMS, URL validation) |

**Top priority fixes from reviews:**
1. Add error handling + atomicity to `addCourtAction` (court_config/court_pricing inserts)
2. Fix empty catch blocks in admin pages (no user feedback on errors)
3. Fix uncaught promise in `CourtConfigForm` (stuck loading state)
4. Move form submission logic from button `onClick` to form `onSubmit` (keyboard accessibility)
5. Rotate all credentials found in `.env.local` and ensure it's gitignored
6. Add input validation to admin server actions (timestamps, URLs, string lengths)
7. Collapse redundant `app_config` queries into single `.in()` call
8. Sanitize CMS HTML before rendering with `dangerouslySetInnerHTML`

## Image Configuration

Images from these domains are allowed in `next.config.ts`:
- `*.supabase.co` / `*.supabase.in` (Supabase Storage)
- `*.googleusercontent.com`
- `img.youtube.com` / `i.ytimg.com` (YouTube thumbnails)
