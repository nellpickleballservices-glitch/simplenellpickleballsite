# Phase 4: Admin and CMS - Research

**Researched:** 2026-03-11
**Domain:** Admin panel (CRUD), CMS rich text editing, route protection, Supabase service-role operations
**Confidence:** HIGH

## Summary

Phase 4 builds the club operator dashboard: user management, court/reservation management, events CRUD, a CMS for bilingual content blocks, and a Stripe payment view. The entire admin panel lives under the existing `(admin)` route group at `app/[locale]/(admin)/admin/` and uses the `supabaseAdmin` service-role client for all data operations (bypasses RLS). Route protection requires adding an admin role check to proxy.ts (Layer 1), a server-side role check in the admin layout (Layer 2), and per-action role verification in every Server Action (Layer 3).

The CMS uses Tiptap v3 as the rich text editor -- a headless ProseMirror-based editor that runs as a `'use client'` component with `immediatelyRender: false` for Next.js SSR compatibility. StarterKit v3 includes bold, italic, headings, lists, links, and other formatting out of the box. Content blocks are pre-seeded in the `content_blocks` table (already exists from Phase 1 migration) and admin edits them -- no create/delete from admin UI.

**Primary recommendation:** Use `supabaseAdmin` (service-role) for all admin data operations, Tiptap StarterKit for CMS editing, and a simple Stripe Dashboard link (not embedded components) for payment viewing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fixed left sidebar navigation with icon+label links: Dashboard, Users, Courts, Reservations, Events, CMS, Stripe
- Sidebar collapses behind hamburger icon on mobile (slide-in overlay)
- Same brand colors (Midnight Blue sidebar, Electric Lime accents)
- Dashboard landing page with summary stat cards
- Bilingual admin panel (ES/EN) via next-intl
- "Admin" link in main Navbar visible only for admin role users
- All destructive actions require confirmation dialogs
- Three-layer admin route protection: proxy.ts, layout, Server Action
- Single search bar searching across first name, last name, email, phone
- Paginated user table (20 per page) with slide-out right panel for details
- User actions: disable account, enable account, trigger password reset
- Court management: add locations with GPS, maintenance blocking with date range, auto-cancel reservations during maintenance
- Reservation management: filterable table, admin cancel, admin create on behalf (registered user or guest walk-in)
- Guest reservations tracked by name only (not linked to user_id)
- Admin can mark cash payments as received
- Events: three fixed types (Tournament, Training Session, Social Event), bilingual title/description
- Events migration needs: event_type, start_time, end_time, optional image_url columns
- CMS: Tiptap editor, blocks grouped by page, reorderable with sort_order, edit-only (no create/delete)
- CMS inline preview below editor
- Pre-seeded blocks for: Home hero, Home overview, About, Learn Pickleball, FAQ

### Claude's Discretion
- Stripe view implementation approach
- Bilingual editor layout (side-by-side vs tab switching)
- Dashboard stat card design and metrics
- Admin search debounce and result ranking
- Exact Tiptap editor configuration and toolbar items
- Court configuration form layout
- Guest reservation form design
- Maintenance notification email template

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMIN-01 | Admin can search users by first name, last name, email, or phone | supabaseAdmin `ilike` queries across profiles + auth.users; debounced search with 300ms delay |
| ADMIN-02 | Admin can view user membership status and reservation history | Join profiles + memberships + reservations via service-role client; slide-out panel pattern |
| ADMIN-03 | Admin can disable/enable user accounts | `supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' or '876000h' })` |
| ADMIN-04 | Admin can trigger password reset for any user | `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })` or Resend with custom reset |
| ADMIN-05 | Admin can add court locations with GPS coordinates | Insert into `locations` + `courts` tables via service-role; GPS as lat/lng decimal fields |
| ADMIN-06 | Admin can block courts for maintenance | Update court status to 'maintenance' + cancel overlapping reservations; needs maintenance_start/end columns or separate table |
| ADMIN-07 | Admin can view all reservations and cancel any | Service-role query (bypasses RLS owner filter); update status to 'cancelled' |
| ADMIN-08 | Admin can create, edit, delete events | CRUD on events table; migration adds event_type, start_time, end_time, image_url columns |
| ADMIN-09 | Admin can view Stripe payment data | Link to Stripe Dashboard (simplest, most secure, always current) |
| ADMIN-10 | Admin CMS: edit content blocks for all pages (bilingual) | Tiptap editor with StarterKit; content_blocks table already exists |
| ADMIN-11 | Admin routes protected at three layers | proxy.ts admin check, layout role gate, Server Action role verification |
| CMS-01 | content_blocks table stores block_key, block_type, content_es, content_en, sort_order | Table already exists in 0001 migration; needs seed data for all page blocks |
| CMS-02 | Public pages fetch content blocks at render time (ISR) | Next.js `revalidateTag` + `revalidatePath` on CMS save; Phase 5 consumes this |
| CMS-03 | Admin can update content blocks via rich text or plain text editor | Tiptap for rich_text blocks, textarea for plain_text blocks |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | ^3.x | Rich text editor React bindings | Headless, ProseMirror-based, full control over UI |
| @tiptap/pm | ^3.x | ProseMirror core dependency | Required peer dependency for Tiptap |
| @tiptap/starter-kit | ^3.x | Bundle of common extensions | Includes bold, italic, heading, lists, link, code, blockquote |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.98.0 | Service-role admin client | All admin CRUD operations |
| next-intl | ^4.8.3 | i18n for admin panel | Admin namespace in messages files |
| resend | ^6.9.3 | Email for maintenance notifications | Cancellation emails when maintenance blocks reservations |
| stripe | ^20.4.1 | Stripe API (if needed for data view) | Only if building webhook-synced table approach |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap | Lexical (Meta) | Lexical is newer but Tiptap has better docs, more extensions, and user already chose it |
| Stripe Dashboard link | Embedded Stripe components | Embedded components require Stripe Connect (multi-merchant); this is a single club -- link to dashboard is simpler and always current |
| Custom admin auth | next-auth admin | Already have Supabase auth with app_metadata roles; no reason to add another auth layer |

**Installation:**
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

## Architecture Patterns

### Recommended Project Structure
```
app/[locale]/(admin)/admin/
  layout.tsx            # Sidebar + admin role gate (Layer 2)
  page.tsx              # Dashboard with stat cards
  users/
    page.tsx            # User search + paginated table
    UserSlideOut.tsx     # Right panel with details + actions
  courts/
    page.tsx            # Court/location management
  reservations/
    page.tsx            # Filterable reservation table
  events/
    page.tsx            # Events CRUD table
    EventForm.tsx       # Create/edit form (bilingual fields)
  cms/
    page.tsx            # Content blocks grouped by page
    ContentEditor.tsx   # Tiptap rich text editor component
  stripe/
    page.tsx            # Link to Stripe Dashboard
app/actions/
  admin.ts              # All admin Server Actions (single file or split)
components/admin/
  AdminSidebar.tsx      # Fixed left sidebar navigation
  ConfirmDialog.tsx     # Reusable confirmation modal
  AdminSearchBar.tsx    # Debounced search input
  AdminTable.tsx        # Reusable paginated table component
  StatCard.tsx          # Dashboard stat card
supabase/migrations/
  0005_admin_events_cms.sql  # Events columns + content_blocks seed data + maintenance table
```

### Pattern 1: Admin Server Actions with Role Verification (Layer 3)
**What:** Every admin Server Action verifies the caller has admin role before executing
**When to use:** All admin mutations
**Example:**
```typescript
// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) redirect('/')
  return user
}

export async function searchUsersAction(query: string, page: number = 1) {
  await requireAdmin()
  const pageSize = 20
  const offset = (page - 1) * pageSize

  // Use service-role to access all profiles
  const { data, count } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, phone, created_at', { count: 'exact' })
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .range(offset, offset + pageSize - 1)
    .order('created_at', { ascending: false })

  return { users: data, total: count }
}
```

### Pattern 2: Admin Layout with Role Gate (Layer 2)
**What:** Server-side admin role check in the (admin) layout
**When to use:** Wraps all /admin/* pages
**Example:**
```typescript
// app/[locale]/(admin)/admin/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-[#0a1628] p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

### Pattern 3: Proxy Middleware Admin Check (Layer 1)
**What:** Add admin role check to existing proxy.ts for /admin/* routes
**When to use:** Before intl middleware composition
**Example:**
```typescript
// In proxy.ts, after the existing unauthenticated redirect:
if (user && pathname.includes('/admin')) {
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
}
```

### Pattern 4: Tiptap Rich Text Editor (CMS)
**What:** Headless rich text editor for bilingual content blocks
**When to use:** CMS content editing
**Example:**
```typescript
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface ContentEditorProps {
  content: string
  onChange: (html: string) => void
}

export default function ContentEditor({ content, onChange }: ContentEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false, // Required for Next.js SSR
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b border-gray-700 bg-[#111b2e]">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor?.isActive('bold') ? 'text-lime' : 'text-gray-400'}
        >
          B
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor?.isActive('italic') ? 'text-lime' : 'text-gray-400'}
        >
          I
        </button>
        {/* ... heading, list, link buttons */}
      </div>
      <EditorContent editor={editor} className="prose prose-invert p-4 min-h-[200px]" />
    </div>
  )
}
```

### Pattern 5: User Account Disable via Supabase Admin API
**What:** Ban/unban users using the admin auth API
**When to use:** Admin disabling/enabling user accounts
**Example:**
```typescript
// Disable user (ban for 100 years = effectively permanent)
export async function disableUserAction(userId: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h' // ~100 years
  })
  if (error) throw error

  // Auto-cancel future reservations
  const now = new Date().toISOString()
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .gt('starts_at', now)
    .in('status', ['confirmed', 'pending_payment'])
}

// Enable user (remove ban)
export async function enableUserAction(userId: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none'
  })
  if (error) throw error
}
```

### Anti-Patterns to Avoid
- **Using the user-scoped Supabase client for admin reads:** RLS will filter results to only the admin's own data. Always use `supabaseAdmin` (service-role) for admin operations.
- **Checking admin role only in the layout:** All three layers (proxy, layout, Server Action) must independently verify admin role. A direct API call could bypass layout checks.
- **Storing HTML in content_es/content_en without sanitization:** Tiptap output is trusted (generated client-side by admin), but if ever displayed with `dangerouslySetInnerHTML`, ensure it comes from the content_blocks table only.
- **Creating a separate admin auth system:** The project uses Supabase Auth with `app_metadata.role` -- do not introduce a second auth mechanism.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable wrapper | Tiptap + StarterKit | Cursor management, list indentation, paste handling are extremely complex |
| User search across multiple fields | Custom full-text search | Supabase `.or()` with `ilike` patterns | Simple enough for this scale; PostgreSQL handles it natively |
| Debounced search | Manual setTimeout/clearTimeout | `useDeferredValue` (React 19) or simple custom hook | Built-in React primitive handles concurrent rendering correctly |
| Confirmation dialogs | Alert/confirm browser dialogs | Custom modal component (already have CancelDialog pattern) | Consistent with existing brand UI |
| Admin email for user search | Custom email lookup | `supabaseAdmin.auth.admin.listUsers()` with filter | Auth user emails are in auth.users, not profiles table |
| Stripe payment data display | Custom webhook-synced payment table | Link to Stripe Dashboard | Dashboard is always current, supports search/filter/refunds, zero maintenance |

**Key insight:** Admin panels are mostly CRUD + authorization. The complexity is in getting the three-layer auth right and handling edge cases (cancellation cascades, maintenance blocking). The CRUD itself should be straightforward service-role Supabase operations.

## Common Pitfalls

### Pitfall 1: Email Search Requires Auth Admin API
**What goes wrong:** Searching users by email via `profiles` table returns nothing -- email is stored in `auth.users`, not `profiles`.
**Why it happens:** The signup flow stores first_name, last_name, phone in profiles but email lives in Supabase Auth.
**How to avoid:** Use `supabaseAdmin.auth.admin.listUsers()` for email search, or use `supabaseAdmin.rpc()` to query `auth.users` directly. Combine with profiles data for the full picture.
**Warning signs:** "No results" when searching by a known email address.

### Pitfall 2: Admin Ban Duration Format
**What goes wrong:** Passing an invalid ban_duration format causes silent failures.
**Why it happens:** Supabase expects Go duration format (e.g., '876000h' not '100y' or a number).
**How to avoid:** Use `'876000h'` for permanent ban, `'none'` to unban. Test with a non-admin test user.
**Warning signs:** User can still log in after being "disabled".

### Pitfall 3: Tiptap SSR Hydration Mismatch
**What goes wrong:** React hydration error when Tiptap renders differently on server vs client.
**Why it happens:** Tiptap is a browser-only editor; server rendering produces different output.
**How to avoid:** Set `immediatelyRender: false` in `useEditor` options. Use `'use client'` directive.
**Warning signs:** Console warnings about hydration mismatches on admin CMS pages.

### Pitfall 4: Content Blocks Missing Seed Data
**What goes wrong:** CMS page shows empty list -- no blocks to edit.
**Why it happens:** The `content_blocks` table exists but has no rows. Admin cannot create blocks (by design).
**How to avoid:** Migration must seed all block_keys: `home_hero`, `home_overview`, `about_vision`, `about_mission`, `about_values`, `learn_origin`, `learn_rules`, `learn_scoring`, `learn_equipment`, `faq_*`, etc.
**Warning signs:** Empty CMS page after deployment.

### Pitfall 5: Maintenance Blocking Without Cascading Cancellations
**What goes wrong:** Court is marked as maintenance but existing reservations during that period remain confirmed.
**Why it happens:** Simply updating court status doesn't touch the reservations table.
**How to avoid:** When maintenance is set, query reservations overlapping the maintenance period and cancel them. Send notification emails to affected users.
**Warning signs:** Users show up at a court under maintenance expecting to play.

### Pitfall 6: Guest Reservations Without user_id
**What goes wrong:** Foreign key constraint on `reservations.user_id` prevents inserting a row without a user.
**Why it happens:** The reservations table has `user_id UUID NOT NULL REFERENCES profiles(id)`.
**How to avoid:** Two options: (a) make user_id nullable for guest reservations, or (b) use the admin's user_id with a `guest_name` field and `is_guest: true` flag. Option (b) is cleaner -- the existing `guest_name` column already supports this pattern. Admin creates the reservation under their own ID but marks it as a guest booking.
**Warning signs:** Insert error when trying to create a walk-in reservation.

## Code Examples

### Admin User Search with Email (via Auth Admin API)
```typescript
// Source: Supabase Auth Admin API docs
export async function searchUsersAction(query: string, page: number = 1) {
  await requireAdmin()
  const pageSize = 20

  // Search auth.users for email matches
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage: pageSize,
  })

  // Filter by query across email
  const emailMatches = authUsers.users.filter(u =>
    u.email?.toLowerCase().includes(query.toLowerCase())
  )

  // Also search profiles for name/phone matches
  const { data: profileMatches } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, phone')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)

  // Merge and deduplicate
  // ...
}
```

### Password Reset Trigger
```typescript
// Source: Supabase Auth Admin API
export async function triggerPasswordResetAction(userId: string) {
  await requireAdmin()

  // Get user email
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (!user?.email) throw new Error('User has no email')

  // Generate recovery link
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
  })

  if (error) throw error

  // Send via Resend (Supabase built-in email may also work)
  // The generated link contains the recovery token
  return { success: true }
}
```

### Events Migration
```sql
-- 0005_admin_events_cms.sql
ALTER TABLE events
  ADD COLUMN event_type TEXT NOT NULL DEFAULT 'social'
    CHECK (event_type IN ('tournament', 'training', 'social')),
  ADD COLUMN start_time TIME,
  ADD COLUMN end_time TIME,
  ADD COLUMN image_url TEXT;

-- Content blocks seed data
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order) VALUES
  ('home_hero', 'rich_text', '<h1>Bienvenido a NELL</h1>', '<h1>Welcome to NELL</h1>', 1),
  ('home_overview', 'rich_text', '<p>Descripcion del club...</p>', '<p>Club description...</p>', 2),
  ('about_vision', 'rich_text', '<p>Nuestra vision...</p>', '<p>Our vision...</p>', 1),
  ('about_mission', 'rich_text', '<p>Nuestra mision...</p>', '<p>Our mission...</p>', 2),
  ('about_values', 'rich_text', '<p>Nuestros valores...</p>', '<p>Our values...</p>', 3),
  ('learn_origin', 'rich_text', '<p>Origen del pickleball...</p>', '<p>Origin of pickleball...</p>', 1),
  ('learn_rules', 'rich_text', '<p>Reglas...</p>', '<p>Rules...</p>', 2),
  ('learn_scoring', 'rich_text', '<p>Puntuacion...</p>', '<p>Scoring...</p>', 3),
  ('learn_equipment', 'rich_text', '<p>Equipamiento...</p>', '<p>Equipment...</p>', 4),
  ('faq_general', 'rich_text', '<p>Preguntas frecuentes...</p>', '<p>FAQ...</p>', 1)
ON CONFLICT (block_key) DO NOTHING;
```

### Maintenance Blocking with Cascade
```typescript
export async function setMaintenanceAction(
  courtId: string,
  startDate: string,
  endDate: string
) {
  await requireAdmin()

  // 1. Update court status
  await supabaseAdmin
    .from('courts')
    .update({ status: 'maintenance' })
    .eq('id', courtId)

  // 2. Cancel overlapping reservations
  const { data: affected } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('court_id', courtId)
    .gte('starts_at', startDate)
    .lte('starts_at', endDate)
    .in('status', ['confirmed', 'pending_payment'])
    .select('user_id')

  // 3. Notify affected users (fire-and-forget)
  // ... send cancellation emails via Resend
}
```

## Discretion Recommendations

### Stripe View: Link to External Dashboard
**Recommendation:** Simple page with a button linking to `https://dashboard.stripe.com`. The Stripe Dashboard is the most feature-rich, always-current, and secure way for admins to view payments. Embedded components require Stripe Connect (designed for marketplaces with connected accounts), which does not apply to a single-club setup.

### Bilingual Editor: Tab Switching
**Recommendation:** Tab switching (ES | EN tabs above the editor) rather than side-by-side. Reasons: (1) Tiptap editor needs sufficient width for comfortable editing, (2) side-by-side halves the available width on already-constrained admin layouts, (3) tab switching is the more common pattern for bilingual CMSs.

### Dashboard Stats
**Recommendation:** Four stat cards: Total Users, Active Members, Today's Reservations, Upcoming Events. These are the most operationally useful metrics. Each card shows a count with a subtle label.

### Search Debounce
**Recommendation:** 300ms debounce using a simple custom hook or `useDeferredValue`. Rank results by: exact email match first, then name starts-with, then name contains.

### Tiptap Toolbar
**Recommendation:** Minimal toolbar: Bold, Italic, H2, H3, Bullet List, Ordered List, Link, Undo, Redo. No images in the editor (content is text-focused). No H1 (page titles are structural, not CMS content).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tiptap v2 (separate Link extension) | Tiptap v3 (Link included in StarterKit) | 2025 | One fewer package to install |
| `getSession()` for auth checks | `getUser()` for JWT validation | Supabase SSR v0.5+ | Security -- session-based getter doesn't revalidate tokens |
| Stripe Connect embedded components | Direct Dashboard link for single-merchant | Always | Embedded components are for Connect platforms, not single businesses |
| next/router middleware.ts | proxy.ts (Next.js 16 rename) | Next.js 16 | File renamed, same API |

**Deprecated/outdated:**
- `@tiptap/extension-link` as separate package: Now included in StarterKit v3
- `supabase.auth.admin.updateUserById({ banned: true })`: Use `ban_duration` instead

## Open Questions

1. **User email search at scale**
   - What we know: `supabaseAdmin.auth.admin.listUsers()` has a `perPage` limit and returns paginated results. There is no server-side email filter parameter -- filtering is client-side.
   - What's unclear: For large user bases (1000+), client-side filtering of listUsers may be slow.
   - Recommendation: For v1 with a small club, this is acceptable. If scale becomes an issue, create a Postgres function that joins auth.users with profiles for server-side search.

2. **Maintenance date range storage**
   - What we know: The `courts` table has a `status` column ('open' | 'closed' | 'maintenance') but no date range for when maintenance starts/ends.
   - What's unclear: Whether to add columns to courts table or create a `court_maintenance` table.
   - Recommendation: Add `maintenance_start` and `maintenance_end` TIMESTAMPTZ columns to `courts` table. A scheduled check or application-level logic auto-reopens courts when `maintenance_end` passes.

3. **Guest reservation user_id handling**
   - What we know: `reservations.user_id` is NOT NULL with a FK to profiles. The `guest_name` column already exists.
   - What's unclear: Whether to make user_id nullable or use admin's user_id for guest bookings.
   - Recommendation: Use admin's user_id as the creator, set `guest_name` to the walk-in's name, and add a `created_by_admin` boolean column. This preserves the NOT NULL constraint and makes it clear who created the booking.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-11 | Admin route protection at three layers | unit | `npx vitest run tests/unit/adminRouteProtection.test.ts` | No -- Wave 0 |
| ADMIN-01 | User search across name/email/phone | unit | `npx vitest run tests/unit/adminUserSearch.test.ts` | No -- Wave 0 |
| ADMIN-03 | Disable/enable user accounts | unit | `npx vitest run tests/unit/adminUserDisable.test.ts` | No -- Wave 0 |
| ADMIN-06 | Maintenance blocking cascades cancellations | unit | `npx vitest run tests/unit/adminMaintenance.test.ts` | No -- Wave 0 |
| ADMIN-08 | Events CRUD validation | unit | `npx vitest run tests/unit/adminEvents.test.ts` | No -- Wave 0 |
| CMS-01 | Content blocks seed data completeness | unit | `npx vitest run tests/unit/contentBlocksSeeds.test.ts` | No -- Wave 0 |
| CMS-03 | CMS save produces valid HTML | unit | `npx vitest run tests/unit/cmsEditor.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/adminRouteProtection.test.ts` -- covers ADMIN-11 (three-layer auth check)
- [ ] `tests/unit/adminUserSearch.test.ts` -- covers ADMIN-01 (search across fields)
- [ ] `tests/unit/adminUserDisable.test.ts` -- covers ADMIN-03 (ban/unban)
- [ ] `tests/unit/adminMaintenance.test.ts` -- covers ADMIN-06 (cascade cancellation)
- [ ] `tests/unit/adminEvents.test.ts` -- covers ADMIN-08 (events CRUD)
- [ ] `tests/unit/contentBlocksSeeds.test.ts` -- covers CMS-01 (seed completeness)

## Sources

### Primary (HIGH confidence)
- Supabase Auth Admin API (`supabaseAdmin.auth.admin.*`) -- verified via existing `lib/supabase/admin.ts` in codebase
- [Tiptap Next.js Install Docs](https://tiptap.dev/docs/editor/getting-started/install/nextjs) -- official installation guide
- [Tiptap StarterKit Extension Docs](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) -- confirms included extensions in v3
- Existing codebase patterns: Server Actions, CancelDialog, proxy.ts middleware, supabaseAdmin client

### Secondary (MEDIUM confidence)
- [Tiptap Link Extension Docs](https://tiptap.dev/docs/editor/extensions/marks/link) -- confirms Link now included in StarterKit v3
- [Stripe Embedded Components Docs](https://docs.stripe.com/connect/supported-embedded-components) -- confirms these are Connect-only (not applicable here)

### Tertiary (LOW confidence)
- `supabaseAdmin.auth.admin.listUsers()` email filter limitations -- based on training data, needs validation against current Supabase JS v2.98 behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Tiptap is well-documented, Supabase admin API is already in use in this project
- Architecture: HIGH -- follows established patterns from Phases 1-3 (Server Actions, route groups, service-role client)
- Pitfalls: HIGH -- based on direct codebase analysis (schema constraints, existing patterns)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable domain, established libraries)
