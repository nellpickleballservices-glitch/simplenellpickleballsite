# Phase 5: Public Website and AI Chatbot - Research

**Researched:** 2026-03-13
**Domain:** Public marketing pages (RSC + ISR + CMS), animations (Framer Motion/Motion), AI chatbot (OpenAI streaming), bilingual SEO
**Confidence:** HIGH

## Summary

Phase 5 transforms the existing Next.js App Router application into a full public-facing bilingual website with five marketing pages (Home, About, Learn Pickleball, Events, Contact), a floating AI chatbot named "Nelly", and WhatsApp integration. The existing codebase already has the foundational pieces: `content_blocks` table with seeded page data, `next-intl` with `[locale]` routing, ISR revalidation on CMS save, events table with bilingual fields, and a working `(marketing)` route group with the pricing page.

The primary technical additions are: (1) installing `motion` (formerly framer-motion) for scroll-reveal and entrance animations via Client Component wrappers around RSC pages, (2) installing `openai` SDK for streaming chat completions in a Route Handler, and (3) creating a new public Footer component and enhancing the Navbar with public page links and mobile hamburger menu.

**Primary recommendation:** Wire existing `content_blocks` data into RSC pages using direct Supabase queries (no admin auth needed for public reads via RLS `SELECT` policy), wrap animation-needing elements in thin `"use client"` Motion wrappers, and implement the chatbot as a `/api/chat` Route Handler returning a `ReadableStream` of SSE chunks from OpenAI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep current homepage layout and visual design, wire CMS content_blocks to replace i18n keys
- Dark theme throughout all public pages -- but with more vibrant Sunset Orange as a dual accent alongside Electric Lime
- Fix contrast issues: raise text opacity minimums to offwhite/70 for secondary text, offwhite/50 for tertiary. Nothing below 50% opacity. Icons use brand colors (lime, orange, turquoise) instead of faint white
- Sports club / fitness visual vibe -- bold, energetic, action-oriented
- About page values (6 values) displayed as vertical timeline/scroll layout with staggered scroll reveals
- Events page: cards in a grid (1-col mobile, 2-col desktop) with colored type badges -- orange for Tournament, turquoise for Training, lime for Social
- Learn Pickleball: sectioned long-scroll page with sticky table of contents sidebar on desktop (becomes dropdown/accordion on mobile)
- Same Navbar for all pages + new public Footer component
- Pricing page integrated into public flow (Home -> About -> Pricing -> Signup navigation)
- Icons + decorative shapes only for page design (no stock photos). SVG court diagram for Learn Pickleball court dimensions section
- Event cards show image if admin uploaded one, icon fallback by type if no image
- Framer Motion animations: scroll reveals, hero entrance, staggered cards, hover micro-animations, respect prefers-reduced-motion
- Floating AI chatbot "Nelly" bottom-right corner on public pages only
- OpenAI gpt-4o-mini for cost-effectiveness and speed
- Prompt-stuffing approach: system prompt fed by content_blocks at query time (not RAG)
- Language detection from user input -- respond in same language
- Streaming responses (SSE from OpenAI API)
- No contact form -- replaced by WhatsApp integration
- WhatsApp bubble: bottom-left corner on all public pages
- Footer with WhatsApp link, social icons, club email, navigation links
- Social links stored as CMS content_block (block_key: 'footer_social_links')
- Essential SEO: title tags, meta descriptions, Open Graph tags, hreflang alternate links
- Minimum viewport: 375px
- Hamburger menu with slide-out navigation on mobile
- AI chatbot: full-screen overlay on mobile when opened

### Claude's Discretion
- Exact Framer Motion animation durations, easing curves, and stagger intervals
- Footer layout (columns, spacing, responsive breakpoints)
- About page timeline visual design (line style, value icons, spacing)
- Learn Pickleball sticky TOC design and mobile accordion behavior
- Event card exact layout and badge positioning
- Quick-reply chip text content (exact suggested topics)
- Nelly's system prompt engineering and content_blocks injection strategy
- Chat rate limiting implementation details
- OG image exact design within the described parameters
- SVG court diagram design for Learn Pickleball page
- Mobile hamburger slide-out animation and overlay design
- Contact page layout and information hierarchy

### Deferred Ideas (OUT OF SCOPE)
- Admin dashboard section for managing social links (CRUD) -- currently handled via CMS content_block
- Chatbot available on member dashboard pages -- currently public pages only
- TikTok/YouTube social links -- start with Instagram + Facebook, expand later
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUB-01 | Home page: hero section, CTA to join, pickleball overview, community messaging -- all copy from CMS | Existing homepage layout preserved; swap `t()` calls for content_blocks fetched via Supabase; ISR revalidation already wired |
| PUB-02 | About page: club description, vision, mission, values -- copy from CMS | `about_vision`, `about_mission`, `about_values` blocks already seeded; values timeline with Motion scroll reveals |
| PUB-03 | Learn Pickleball page: sport origin, rules, scoring, court dimensions, equipment -- copy from CMS | `learn_origin`, `learn_rules`, `learn_scoring`, `learn_equipment` blocks seeded; sticky TOC pattern; SVG court diagram |
| PUB-04 | Events page: lists tournaments, training sessions, social events from database | Events table has `event_type`, bilingual fields, `image_url`; query upcoming events with Supabase; colored type badges |
| PUB-05 | Contact page: WhatsApp link, social handles (no contact form per CONTEXT.md) | WhatsApp `wa.me` link with pre-filled message; social links from `footer_social_links` content_block |
| PUB-06 | All page copy editable via Admin CMS (no hardcoded marketing text) | content_blocks table + existing CMS editor; public pages fetch blocks by `block_key` prefix; ISR on save |
| AI-01 | AI assistant embedded on the platform (bilingual: Spanish/English) | OpenAI `gpt-4o-mini` via streaming Route Handler; `motion/react` chat widget; bilingual system prompt |
| AI-02 | Chatbot answers questions about pickleball rules, memberships, reservations, events, locations | Prompt-stuffing: fetch content_blocks at query time, inject into system prompt; include membership plans and event data |
| AI-03 | Friendly, helpful tone; detects language from user input and responds in kind | System prompt instructs language matching; "Nelly" persona with bilingual greeting |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | ^12.x | Scroll reveals, entrance animations, hover effects | Renamed from framer-motion; same API; `motion/react` import; Client Component only |
| openai | ^4.x | AI chat completions with streaming | Official Node.js SDK; `stream: true` returns async iterable for SSE |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-intl | ^4.8.3 (installed) | Bilingual routing, `getTranslations`, `generateMetadata` | Already in project; use for SEO metadata, static UI strings, locale detection |
| @supabase/ssr | ^0.9.0 (installed) | Server-side Supabase client for RSC data fetching | Already in project; fetch content_blocks and events in RSC |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion (framer-motion) | CSS animations only | CSS lacks scroll-triggered viewport detection, stagger orchestration; motion is ~15kb with LazyMotion |
| openai SDK direct | Vercel AI SDK (`ai` package) | AI SDK adds abstraction; direct OpenAI SDK is simpler for single-provider prompt-stuffing use case; fewer dependencies |
| Prompt-stuffing | pgvector RAG | RAG is overkill for ~20 content blocks; prompt-stuffing fits within gpt-4o-mini context window easily |

**Installation:**
```bash
npm install motion openai
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  [locale]/
    (marketing)/
      about/page.tsx           # RSC - fetches about_ blocks
      learn-pickleball/page.tsx # RSC - fetches learn_ blocks + sticky TOC
      events/page.tsx           # RSC - fetches upcoming events
      contact/page.tsx          # RSC - WhatsApp CTA, social links
      pricing/                  # (existing)
    page.tsx                    # Homepage RSC - rewire to CMS blocks
  api/
    chat/route.ts              # Streaming Route Handler for Nelly chatbot

components/
  Navbar.tsx                   # Enhanced: public page links + mobile hamburger
  Footer.tsx                   # New: navigation, social links, WhatsApp, email
  motion/
    ScrollReveal.tsx           # "use client" - viewport fade-in wrapper
    StaggerChildren.tsx        # "use client" - staggered entrance orchestrator
    HeroEntrance.tsx           # "use client" - hero text entrance animation
    MotionProvider.tsx         # "use client" - LazyMotion with domAnimation
  chatbot/
    ChatBubble.tsx             # "use client" - floating chat trigger button
    ChatPanel.tsx              # "use client" - chat window with messages
    ChatWidget.tsx             # "use client" - orchestrates bubble + panel
  public/
    EventCard.tsx              # Event card with type badge and image/icon
    ValueTimeline.tsx          # About page vertical timeline
    TableOfContents.tsx        # "use client" - sticky TOC with scroll spy
    WhatsAppBubble.tsx         # Floating WhatsApp link button
    MobileNav.tsx              # "use client" - hamburger slide-out menu
```

### Pattern 1: RSC Page with CMS Content Blocks
**What:** Server Component pages fetch content_blocks directly from Supabase, rendering CMS-managed bilingual content with ISR caching.
**When to use:** All five public pages.
**Example:**
```typescript
// app/[locale]/(marketing)/about/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'

export default async function AboutPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const contentField = locale === 'en' ? 'content_en' : 'content_es'

  const { data: blocks } = await supabase
    .from('content_blocks')
    .select(`block_key, ${contentField}`)
    .like('block_key', 'about_%')
    .order('sort_order')

  // Render blocks with Motion wrappers for scroll reveals
  return (
    <main>
      {blocks?.map(block => (
        <ScrollReveal key={block.block_key}>
          <section dangerouslySetInnerHTML={{ __html: block[contentField] ?? '' }} />
        </ScrollReveal>
      ))}
    </main>
  )
}
```

### Pattern 2: Motion Client Component Wrapper
**What:** Thin "use client" wrapper that adds viewport-triggered animations to RSC children.
**When to use:** Every section that needs scroll-reveal or entrance animation.
**Example:**
```typescript
// components/motion/ScrollReveal.tsx
'use client'

import { m, LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  delay?: number
}

export function ScrollReveal({ children, delay = 0 }: ScrollRevealProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
```

### Pattern 3: Streaming AI Route Handler
**What:** Next.js Route Handler that receives user message, fetches content_blocks for system prompt, calls OpenAI with streaming, returns SSE ReadableStream.
**When to use:** `/api/chat` endpoint consumed by the chatbot widget.
**Example:**
```typescript
// app/api/chat/route.ts
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase/admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  const { messages, locale } = await req.json()

  // Rate limit check (session-based, from header or body)
  // ...

  // Fetch content for system prompt
  const { data: blocks } = await supabaseAdmin
    .from('content_blocks')
    .select('block_key, content_es, content_en')

  const contentField = locale === 'en' ? 'content_en' : 'content_es'
  const knowledge = blocks?.map(b => `[${b.block_key}]: ${b[contentField]}`).join('\n') ?? ''

  const systemPrompt = `You are Nelly, the friendly AI assistant for NELL Pickleball Club in Bavaro, Dominican Republic.
Respond in the same language the user writes in (Spanish or English).
You help visitors with: pickleball rules, membership plans, court reservations, events, and locations.
Politely decline off-topic questions.

Club Knowledge Base:
${knowledge}`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 500,
    temperature: 0.7,
  })

  // Convert OpenAI stream to ReadableStream for SSE
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

### Pattern 4: Bilingual SEO Metadata with next-intl
**What:** `generateMetadata` function using `getTranslations` to produce locale-specific titles, descriptions, and hreflang alternates.
**When to use:** Every public page.
**Example:**
```typescript
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('About')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nellpickleball.com'

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `${baseUrl}/${locale}/about`,
      images: [{ url: `${baseUrl}/og-image.png`, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/about`,
      languages: {
        es: `${baseUrl}/about`,
        en: `${baseUrl}/en/about`,
      },
    },
  }
}
```

### Anti-Patterns to Avoid
- **Importing motion components in RSC:** Motion components require "use client". Never import `m` or `motion` directly in a Server Component. Always use a dedicated Client Component wrapper.
- **Hardcoding marketing text:** Every user-visible string on public pages must come from either `content_blocks` (CMS) or `next-intl` message files (UI chrome). No inline strings.
- **Creating a separate Supabase client for public reads:** The existing `createClient` from `@/lib/supabase/server` works for anonymous reads since content_blocks has a public SELECT RLS policy. No need for `supabaseAdmin` on public page rendering.
- **Using `framer-motion` import path:** The package is now `motion` with imports from `motion/react`. The old `framer-motion` package still works but is deprecated.
- **RAG / pgvector for chatbot:** Out of scope. Prompt-stuffing with ~20 content blocks fits well within gpt-4o-mini's 128k context window.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll-triggered animations | IntersectionObserver + manual CSS transitions | `motion/react` `whileInView` | Handles viewport detection, exit animations, reduced-motion, stagger orchestration |
| SSE streaming | Manual fetch + TextDecoder chunking | OpenAI SDK `stream: true` async iterable | Handles backpressure, error recovery, chunk parsing |
| Bilingual metadata | Manual `<head>` tag injection | next-intl `generateMetadata` + Next.js `Metadata` API | Handles hreflang, canonical, OG tags with locale context |
| Chat UI state management | Custom reducer for messages/streaming/typing | Simple `useState` + `useRef` for scroll | Chat state is local-only (session lifetime), no global state needed |
| WhatsApp deep link | Custom phone formatting logic | `https://wa.me/{number}?text={encodeURIComponent(msg)}` | Standard WhatsApp Business API link format |
| Mobile menu animation | CSS-only slide-out | `motion/react` `AnimatePresence` + slide transform | Handles enter/exit animations, backdrop, body scroll lock |

**Key insight:** The motion library handles `prefers-reduced-motion` automatically via its built-in support, eliminating the need for manual OS setting detection.

## Common Pitfalls

### Pitfall 1: Motion Components in Server Components
**What goes wrong:** Build error or hydration mismatch when motion components are used in RSC.
**Why it happens:** Motion uses React hooks internally (useEffect, useState) which are client-only.
**How to avoid:** Create dedicated `"use client"` wrapper components in `components/motion/`. RSC pages import these wrappers and pass children.
**Warning signs:** "useState is not a function" or "hooks can only be called inside a function component" errors at build time.

### Pitfall 2: LazyMotion Provider Nesting
**What goes wrong:** Bundle size bloat if every wrapper component imports `domAnimation` independently.
**Why it happens:** Each `<LazyMotion features={domAnimation}>` instance loads the feature bundle.
**How to avoid:** Create a single `MotionProvider` component that wraps the entire public page layout with `<LazyMotion features={domAnimation} strict>`. Individual motion wrappers use `m.div` (the lazy variant) without repeating the provider.
**Warning signs:** Network tab showing >30kb of motion code; multiple `domAnimation` chunks in build output.

### Pitfall 3: Content Block RLS for Public Reads
**What goes wrong:** Public pages return empty content because anonymous users can't read content_blocks.
**Why it happens:** RLS policy on content_blocks may only allow authenticated reads.
**How to avoid:** Verify content_blocks has a `SELECT` policy for `anon` role: `CREATE POLICY "Public read access" ON content_blocks FOR SELECT TO anon USING (true)`. If not, add it in a migration.
**Warning signs:** Blank sections on public pages when not logged in; content appears only when authenticated.

### Pitfall 4: dangerouslySetInnerHTML XSS Risk
**What goes wrong:** CMS rich text content rendered via `dangerouslySetInnerHTML` could contain malicious scripts.
**Why it happens:** content_blocks store HTML from Tiptap editor.
**How to avoid:** Content is admin-only editable (requireAdmin enforced), so XSS risk is low. If needed, sanitize with a lightweight library. For this project, admin-only write access is sufficient protection.
**Warning signs:** Script tags in rendered CMS content.

### Pitfall 5: OpenAI API Key Exposure
**What goes wrong:** API key leaked to the client.
**Why it happens:** Using `NEXT_PUBLIC_` prefix or importing OpenAI SDK in client components.
**How to avoid:** Keep `OPENAI_API_KEY` as server-only env var (no `NEXT_PUBLIC_` prefix). The chat Route Handler (`/api/chat`) runs server-side. Client component only calls `fetch('/api/chat')`.
**Warning signs:** API key visible in browser network tab or source.

### Pitfall 6: Chat Streaming Fetch on Client
**What goes wrong:** Client receives entire response at once instead of streaming.
**Why it happens:** Using `response.json()` instead of reading the stream.
**How to avoid:** On the client, use `response.body.getReader()` with `TextDecoderStream` to process SSE chunks as they arrive.
**Warning signs:** Long delay then full response appears at once.

### Pitfall 7: Homepage Rewrite Breaking Existing Functionality
**What goes wrong:** Existing homepage welcome banner or auth-dependent features break when rewiring to CMS blocks.
**Why it happens:** The current page.tsx has auth logic for `?welcome=1` and profile fetching.
**How to avoid:** Preserve the existing `searchParams` and welcome banner logic. Only replace the static `t()` calls in the marketing sections with CMS content_blocks data. The welcome banner is a separate concern.
**Warning signs:** Welcome banner stops appearing after signup redirect.

## Code Examples

### Fetching Content Blocks for Public Pages (no auth)
```typescript
// lib/content.ts - shared helper for public page content fetching
import { createClient } from '@/lib/supabase/server'

export async function getContentBlocks(prefix: string, locale: string) {
  const supabase = await createClient()
  const contentField = locale === 'en' ? 'content_en' : 'content_es'

  const { data } = await supabase
    .from('content_blocks')
    .select(`block_key, block_type, ${contentField}`)
    .like('block_key', `${prefix}%`)
    .order('sort_order')

  // Return as a key-value map for easy template access
  const map: Record<string, string> = {}
  for (const block of data ?? []) {
    map[block.block_key] = block[contentField] ?? ''
  }
  return map
}
```

### Events Page Query (upcoming events, bilingual)
```typescript
// In events/page.tsx RSC
const supabase = await createClient()
const now = new Date().toISOString()
const { data: events } = await supabase
  .from('events')
  .select('id, title_es, title_en, description_es, description_en, event_date, event_type, start_time, end_time, image_url, locations(name)')
  .gte('event_date', now)
  .order('event_date', { ascending: true })
```

### Chat Client-Side SSE Consumer
```typescript
// In ChatPanel.tsx (client component)
async function sendMessage(userMessage: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...history, { role: 'user', content: userMessage }],
      locale,
    }),
  })

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()
  let assistantMessage = ''

  while (reader) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    // Parse SSE lines
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6) // Remove 'data: '
      if (data === '[DONE]') break
      const parsed = JSON.parse(data)
      assistantMessage += parsed.text
      setStreamingText(assistantMessage)
    }
  }
}
```

### WhatsApp Deep Link
```typescript
// components/public/WhatsAppBubble.tsx
const phone = '18091234567' // Club phone number
const greeting = locale === 'en'
  ? 'Hello, I have a question about NELL Pickleball Club'
  : 'Hola, tengo una pregunta sobre NELL Pickleball Club'
const href = `https://wa.me/${phone}?text=${encodeURIComponent(greeting)}`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package with `motion/react` imports | Late 2024 | Same API; install `motion` not `framer-motion`; import from `motion/react` |
| `OpenAIStream` + `StreamingTextResponse` (Vercel AI SDK) | Direct OpenAI SDK `stream: true` with async iterable | 2024+ | No extra dependency needed; OpenAI SDK returns async iterable natively |
| Manual hreflang `<link>` tags | Next.js `generateMetadata` `alternates.languages` | Next.js 13+ | Framework-managed; combines with next-intl `getTranslations` |
| Separate i18n middleware + auth middleware | Composed middleware (Supabase auth + next-intl in single `middleware.ts`) | Already in project | Cookies preserved across both middleware layers |

**Deprecated/outdated:**
- `framer-motion` import path: Use `motion/react` instead
- Vercel AI SDK `OpenAIStream`/`StreamingTextResponse`: Unnecessary wrapper when using OpenAI SDK directly
- `getSession()` for auth: Project already uses `getUser()` everywhere (correct pattern)

## Open Questions

1. **Content Blocks RLS for Anonymous Access**
   - What we know: Admin actions use `supabaseAdmin` (service role). Public pages will use `createClient` (anon/user role).
   - What's unclear: Whether the `content_blocks` table has a `SELECT` policy for the `anon` role.
   - Recommendation: Check existing RLS policies on `content_blocks`. If no anon SELECT policy exists, add one in a migration. The events table likely needs the same check.

2. **Content Blocks for Footer Social Links**
   - What we know: CONTEXT.md specifies `footer_social_links` as a content_block key.
   - What's unclear: This block key is not in the seed data migration (0005).
   - Recommendation: Add `footer_social_links` block (and any other missing blocks like `learn_court_dimensions` for the court diagram section) in a new seed migration or via the CMS admin UI.

3. **Club Phone Number for WhatsApp**
   - What we know: WhatsApp link needs a phone number.
   - What's unclear: Exact phone number to use.
   - Recommendation: Store as environment variable `NEXT_PUBLIC_WHATSAPP_PHONE` or as a CMS content_block. Env var is simpler since it rarely changes.

4. **Client Logo File**
   - What we know: Client has a logo file ready to provide.
   - What's unclear: Whether the file has been provided yet.
   - Recommendation: Use text-based "NELL" branding (already in Navbar) as fallback. When logo file arrives, place in `public/` and reference in Navbar, Footer, and OG image.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit) + Playwright 1.58 (e2e) |
| Config file | vitest.config.ts, playwright.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-01 | Home page renders CMS content, hero, CTA | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "home page"` | No - Wave 0 |
| PUB-02 | About page renders vision, mission, 6 values from CMS | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "about page"` | No - Wave 0 |
| PUB-03 | Learn page renders origin, rules, scoring, equipment from CMS | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "learn page"` | No - Wave 0 |
| PUB-04 | Events page shows events from database with type badges | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "events page"` | No - Wave 0 |
| PUB-05 | Contact page shows WhatsApp link and social handles | e2e | `npx playwright test tests/e2e/public-pages.spec.ts --grep "contact page"` | No - Wave 0 |
| PUB-06 | CMS-edited content appears on next render (ISR) | manual-only | Manual: edit CMS block, verify public page update | N/A - requires live CMS |
| AI-01 | Chatbot embedded on platform, bilingual | e2e | `npx playwright test tests/e2e/chatbot.spec.ts --grep "chatbot visible"` | No - Wave 0 |
| AI-02 | Chatbot answers club-related questions from content | unit | `npx vitest run tests/unit/chat-route.test.ts` | No - Wave 0 |
| AI-03 | Language detection and matching response language | unit | `npx vitest run tests/unit/chat-route.test.ts --grep "language"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/chat-route.test.ts` -- unit tests for chat route handler system prompt construction and rate limiting
- [ ] `tests/unit/content-blocks.test.ts` -- unit tests for content block fetching helper
- [ ] `tests/e2e/public-pages.spec.ts` -- e2e tests for all 5 public pages rendering CMS content
- [ ] `tests/e2e/chatbot.spec.ts` -- e2e tests for chatbot widget visibility and interaction
- [ ] Motion dependency: `npm install motion` -- not yet installed
- [ ] OpenAI dependency: `npm install openai` -- not yet installed

## Sources

### Primary (HIGH confidence)
- Project codebase: `app/[locale]/page.tsx`, `app/actions/admin.ts`, `components/Navbar.tsx`, `middleware.ts`, `supabase/migrations/0005_admin_events_cms.sql` -- direct code inspection
- Project types: `lib/types/admin.ts` -- ContentBlock, Event, EventType interfaces
- Project config: `i18n/routing.ts`, `next.config.ts`, `vitest.config.ts`, `package.json` -- existing setup verification

### Secondary (MEDIUM confidence)
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) -- framer-motion to motion migration, `motion/react` imports
- [Motion bundle size reduction](https://motion.dev/docs/react-reduce-bundle-size) -- LazyMotion + domAnimation pattern (~15kb)
- [next-intl metadata docs](https://next-intl.dev/docs/environments/actions-metadata-route-handlers) -- generateMetadata with getTranslations
- [OpenAI Models](https://platform.openai.com/docs/models/gpt-4o-mini) -- gpt-4o-mini availability and capabilities
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- alternates.languages for hreflang

### Tertiary (LOW confidence)
- OpenAI Node SDK streaming pattern -- reconstructed from multiple blog sources; core pattern (async iterable with `stream: true`) is well-established but exact error handling may need verification against latest SDK version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- motion and openai are the correct packages; versions verified via npm/docs
- Architecture: HIGH -- patterns directly derived from existing codebase conventions (RSC, content_blocks, route groups, next-intl)
- Pitfalls: HIGH -- common issues documented from multiple sources and direct code analysis
- AI chatbot streaming: MEDIUM -- exact OpenAI SDK streaming API verified conceptually but specific error handling patterns may vary by SDK version

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain; motion and openai SDK APIs are mature)
