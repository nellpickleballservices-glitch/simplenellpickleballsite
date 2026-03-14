# Phase 5: Public Website and AI Chatbot - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Prospective members land on a bilingual public website that explains the club, shows events, and converts visitors to signups — and an AI chatbot named "Nelly" answers questions in the visitor's language using site content as its knowledge base. Five public pages (Home, About, Learn Pickleball, Events, Contact) with all copy from CMS, plus a floating AI chatbot and WhatsApp integration.

</domain>

<decisions>
## Implementation Decisions

### Public page design
- Keep current homepage layout and visual design, wire CMS content_blocks to replace i18n keys
- Dark theme throughout all public pages — but with more vibrant Sunset Orange as a dual accent alongside Electric Lime
- Fix contrast issues: raise text opacity minimums to offwhite/70 for secondary text, offwhite/50 for tertiary. Nothing below 50% opacity. Icons use brand colors (lime, orange, turquoise) instead of faint white
- Sports club / fitness visual vibe — bold, energetic, action-oriented
- About page values (6 values) displayed as vertical timeline/scroll layout with staggered scroll reveals
- Events page: cards in a grid (1-col mobile, 2-col desktop) with colored type badges — orange for Tournament, turquoise for Training, lime for Social
- Learn Pickleball: sectioned long-scroll page with sticky table of contents sidebar on desktop (becomes dropdown/accordion on mobile)
- Same Navbar for all pages + new public Footer component
- Pricing page integrated into public flow (Home → About → Pricing → Signup navigation)
- Icons + decorative shapes only for page design (no stock photos). SVG court diagram for Learn Pickleball court dimensions section
- Event cards show image if admin uploaded one, icon fallback by type if no image

### Animation & motion (Framer Motion)
- Subtle scroll reveals: elements fade in and slide up as they enter viewport
- Hero section: animated text entrance on page load (fade + slide up with stagger for headline, subheadline, CTA)
- About page values: staggered scroll reveal — each value fades in as it enters viewport
- Events page: staggered card entrance (cards appear one-by-one with delay)
- Learn Pickleball: sections fade in on scroll, active TOC item highlights as you scroll past sections
- Instant page navigation (no cross-page transitions)
- Subtle hover micro-animations: cards lift slightly on hover (scale + shadow), buttons have press-down effect, links get underline animations (CSS transitions for these)
- Navbar: sticky with backdrop-blur + darker background on scroll
- Footer: static, no animation
- Respect `prefers-reduced-motion` OS setting (Framer Motion built-in support)
- Simpler animations on mobile: reduce stagger delays, skip some animations on smaller screens
- Staggered card entrances for event cards

### AI chatbot ("Nelly")
- Floating chat bubble, bottom-right corner, on public pages only (not member dashboard)
- OpenAI gpt-4o-mini for cost-effectiveness and speed
- Named persona: "Nelly" (playing on NELL) — greeting: "¡Hola! Soy Nelly, tu asistente de NELL Pickleball Club."
- Club topics only — pickleball rules, memberships, reservations, events, locations, pricing. Politely deflects off-topic questions
- Auto-greeting tooltip after 5-10 seconds: "¿Tienes preguntas? ¡Pregunta a Nelly!" (or English equivalent based on locale)
- Quick-reply chips on initial greeting: "Membership plans", "Court locations", "How to play pickleball", "Upcoming events" — outlined pill style with lime/turquoise border. Chips disappear after first message
- Streaming responses (SSE from OpenAI API) — text appears word by word
- Typing indicator (animated dots) shown before stream starts, disappears on first token
- Chat history persists during session (client-side state), resets on browser tab close
- Basic rate limit: ~20 messages per session. Friendly message when hit: "I've answered a lot of questions! Visit our Contact page or WhatsApp for more help."
- Prompt-stuffing approach: system prompt fed by content_blocks at query time (not RAG)
- Language detection from user input — respond in same language

### Chatbot visual design
- Light chat panel: white/light background, Nelly's messages in gray bubbles, user messages in lime bubbles with dark text
- Dark header bar with "Nelly" name, pickleball icon avatar, and close button
- Pickleball/paddle icon as Nelly's avatar in chat bubble button and message bubbles
- Standard widget size on desktop: ~380px wide, ~520px tall, anchored bottom-right above bubble
- Full-screen overlay on mobile when chat is open, close button at top
- Outlined quick-reply chips with brand color border on light background

### Contact & conversion
- No contact form — replaced by WhatsApp integration per client request
- WhatsApp bubble: bottom-left corner on all public pages (separate from AI chatbot bubble bottom-right)
- WhatsApp opens with pre-filled bilingual greeting: "Hola, tengo una pregunta sobre NELL Pickleball Club" (or English equivalent based on locale)
- Contact page: WhatsApp CTA as primary action + club phone, email, social handles. No embedded map
- Both bubbles (AI chatbot + WhatsApp) visible on mobile — opposite sides, no overlap
- CTA sections on key pages only: Homepage (hero + bottom CTA), About page (bottom CTA), Pricing page. Learn and Events link to Pricing instead

### Footer
- New public Footer component shown on all public pages
- Content: WhatsApp link, social icons (Instagram, Facebook), club email (nellpickleball@gmail.com)
- Quick navigation links to all public pages (Home, About, Learn, Events, Contact, Pricing)
- Social links stored as CMS content_block (block_key: 'footer_social_links') — admin editable via existing CMS
- Pre-seeded platforms: Instagram, Facebook
- Static footer (no scroll animation)

### SEO & metadata
- Essential SEO: title tags, meta descriptions, Open Graph tags (bilingual), canonical URLs on each public page
- Single OG image for all pages: club logo centered on Midnight Blue background with subtle brand accent shapes, text: "NELL Pickleball Club • Bávaro, DR"
- Club logo file provided by client — used in Navbar, Footer, and OG image
- hreflang alternate links for bilingual SEO (es/en versions of each page)
- Text-based logo not needed — client has actual logo file

### Mobile responsiveness
- Minimum viewport: 375px
- Standard responsive: grids collapse to single column, hero text scales down, cards stack vertically
- Sticky TOC on Learn page becomes dropdown/accordion on mobile
- Hamburger menu with slide-out navigation on mobile (nav links, language switcher, login/signup CTAs)
- AI chatbot: full-screen overlay on mobile when opened
- Both WhatsApp and AI chatbot bubbles visible on mobile (opposite corners)
- Simpler Framer Motion animations on mobile

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

</decisions>

<specifics>
## Specific Ideas

- User specifically requested more vibrant orange throughout — current design is "too dark" with text/icons blending into the background
- Sports club / fitness vibe inspiration (Nike, CrossFit boxes, tennis club sites) — bold and energetic
- "Nelly" chatbot name plays on the NELL brand and the founder's name (María Nelly Mercedes Carrasco)
- WhatsApp integration is a direct client request — Dominican Republic market strongly prefers WhatsApp for business communication over email/forms
- Client has a logo file ready to provide during implementation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/[locale]/page.tsx`: Current homepage with full design (hero, features, plans, CTA) — preserve layout, swap i18n keys for CMS data
- `app/actions/admin.ts`: `getContentBlocksAction`, `updateContentBlockAction`, `reorderContentBlocksAction` — CMS data fetching ready
- `app/[locale]/(admin)/admin/cms/page.tsx`: CMS editor with page tabs (home, about, learn, faq) — blocks already grouped by prefix
- `lib/types/admin.ts`: `ContentBlock` type defined
- `middleware.ts`: Has `revalidatePath` setup for ISR
- `lib/resend.ts`: Resend client configured (for any transactional emails if needed)
- `components/Navbar.tsx`: Existing Navbar — add public page links
- `components/LanguageSwitcher.tsx`: i18n switching — reuse everywhere
- `messages/en.json` / `messages/es.json`: i18n message files — add Public namespace

### Established Patterns
- Next.js App Router with route groups: `(marketing)`, `(auth)`, `(member)`, `(admin)`
- Server Actions for data mutations
- `@supabase/ssr` for SSR auth with cookie handling
- `next-intl` for i18n with `[locale]` route segment
- Brand colors: Electric Lime `#39FF14`, Midnight Blue `#0B1D3A`, Caribbean Turquoise `#1ED6C3`, Sunset Orange `#FF6B2C`
- Typography: Bebas Neue (headings), Inter (body), Poppins (accent)
- Content blocks grouped by page prefix (home_, about_, learn_, faq_) — Phase 4
- ISR revalidation via `revalidatePath` on CMS content save — Phase 4
- No Framer Motion installed yet — needs to be added as dependency
- No OpenAI SDK installed yet — needs to be added as dependency

### Integration Points
- Public pages render as RSC with ISR — fetch content_blocks from Supabase
- `(marketing)` route group currently has only pricing — add public pages here or create new route group
- `content_blocks` table already seeded with block keys for home, about, learn, faq
- Events table exists with event_type, bilingual fields — query for Events page
- AI chatbot Route Handler at `/api/chat` for streaming responses
- WhatsApp link uses `https://wa.me/{phone}?text={pre-filled message}`
- Footer component imported in public page layouts
- Framer Motion Client Component wrappers for animations (RSC pages stay server-rendered)

</code_context>

<deferred>
## Deferred Ideas

- Admin dashboard section for managing social links (CRUD) — currently handled via CMS content_block, dedicated admin UI deferred to future phase
- Chatbot available on member dashboard pages — currently public pages only
- TikTok/YouTube social links — start with Instagram + Facebook, expand later

</deferred>

---

*Phase: 05-public-website-and-ai-chatbot*
*Context gathered: 2026-03-13*
