# Public Marketing Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build About, Events, and Contact pages and enhance the Home page with Mission, Vision, Values, What is Pickleball, and Events Preview sections — all animated with Framer Motion scroll-triggered effects and parallax heroes.

**Architecture:** All pages are Server Components for SEO. Framer Motion lives in thin `'use client'` wrapper components (`FadeInView`, `StaggerChildren`, `ParallaxHero`) that receive content as props. Events page filter is a client component. All copy goes into `messages/en.json` + `messages/es.json`.

**Tech Stack:** Next.js 15 App Router, Framer Motion, next-intl, Tailwind CSS v4, TypeScript

---

## Task 1: Install Framer Motion

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install**

```bash
npm install framer-motion
```

**Step 2: Verify**

```bash
node -e "require('framer-motion'); console.log('ok')"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install framer-motion for scroll animations"
```

---

## Task 2: Create Animation Wrapper Components

**Files:**
- Create: `components/animations/FadeInView.tsx`
- Create: `components/animations/StaggerChildren.tsx`
- Create: `components/animations/ParallaxHero.tsx`

**Step 1: Create `components/animations/FadeInView.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right'

interface FadeInViewProps {
  children: React.ReactNode
  delay?: number
  direction?: Direction
  className?: string
}

export function FadeInView({
  children,
  delay = 0,
  direction = 'up',
  className,
}: FadeInViewProps) {
  const shouldReduce = useReducedMotion()

  const offsets: Record<Direction, { x: number; y: number }> = {
    up:    { x: 0,   y: 40 },
    down:  { x: 0,   y: -40 },
    left:  { x: 40,  y: 0 },
    right: { x: -40, y: 0 },
  }

  const { x, y } = offsets[direction]

  return (
    <motion.div
      className={className}
      initial={shouldReduce ? false : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

**Step 2: Create `components/animations/StaggerChildren.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 22 },
  },
}

export function StaggerChildren({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={shouldReduce ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={container}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}
```

**Step 3: Create `components/animations/ParallaxHero.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

export function ParallaxHero({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduce ? ['0%', '0%'] : ['0%', '40%']
  )

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ''}`}>
      {/* Parallax background layer */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -top-[20%] -bottom-[20%]"
        aria-hidden="true"
      >
        {/* Decorative elements — children can slot in via the overlay */}
        <div className="absolute inset-0 bg-midnight" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-turquoise/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Foreground content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 5: Commit**

```bash
git add components/animations/
git commit -m "feat: add FadeInView, StaggerChildren, ParallaxHero animation wrappers"
```

---

## Task 3: Update Navbar + Nav i18n Keys

**Files:**
- Modify: `messages/en.json` — add `Nav.about`, `Nav.events`, `Nav.contact`
- Modify: `messages/es.json` — same
- Modify: `components/Navbar.tsx` — add nav links

**Step 1: Add keys to `messages/en.json`**

In the `"Nav"` object, add after `"dashboard"`:

```json
"about": "About",
"events": "Events",
"contact": "Contact"
```

**Step 2: Add keys to `messages/es.json`**

```json
"about": "Nosotros",
"events": "Eventos",
"contact": "Contacto"
```

**Step 3: Update `components/Navbar.tsx`**

Add nav links between the brand and the right-side auth section. Replace the current nav content with:

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { logoutAction } from '@/app/actions/auth'

export async function Navbar() {
  const t = await getTranslations('Nav')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let firstName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()
    firstName = profile?.first_name ?? null
  }

  return (
    <nav className="w-full bg-midnight border-b border-charcoal px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link href="/" className="font-bebas-neue text-2xl text-lime tracking-widest shrink-0">
        NELL
      </Link>

      {/* Center nav links */}
      <div className="hidden md:flex items-center gap-6">
        <Link href="/about" className="text-sm text-offwhite/70 hover:text-lime transition-colors">
          {t('about')}
        </Link>
        <Link href="/events" className="text-sm text-offwhite/70 hover:text-lime transition-colors">
          {t('events')}
        </Link>
        <Link href="/contact" className="text-sm text-offwhite/70 hover:text-lime transition-colors">
          {t('contact')}
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link href="/dashboard" className="text-sm text-offwhite hover:text-lime transition-colors">
              {firstName ?? t('dashboard')}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-offwhite hover:text-lime transition-colors">
                {t('logout')}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-offwhite hover:text-lime transition-colors">
              {t('login')}
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-lime text-midnight font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('signup')}
            </Link>
          </>
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
```

**Step 4: Commit**

```bash
git add components/Navbar.tsx messages/en.json messages/es.json
git commit -m "feat: add About/Events/Contact nav links"
```

---

## Task 4: Add Home i18n Keys + Enhance Home Page

**Files:**
- Modify: `messages/en.json` — add new `Home.*` keys
- Modify: `messages/es.json` — add new `Home.*` keys
- Modify: `app/[locale]/page.tsx` — add 5 new sections

**Step 1: Add to `messages/en.json` under `"Home"`**

```json
"whatIsHeading": "What is Pickleball?",
"whatIsDesc": "Pickleball combines elements of tennis, badminton, and ping-pong. It is easy to learn, social, and accessible for all ages and skill levels.",
"whatIsPaddle": "Paddle",
"whatIsPaddleDesc": "Lightweight composite, wood, or graphite paddle",
"whatIsBall": "Ball",
"whatIsBallDesc": "Perforated plastic ball designed for outdoor and indoor play",
"whatIsCourt": "Court",
"whatIsCourtDesc": "20×44 ft court with a 7 ft non-volley kitchen zone",
"missionHeading": "Our Mission",
"missionStatement": "Promote mental, physical, and social wellbeing through accessible pickleball facilities, training programs, and community events.",
"visionHeading": "Our Vision",
"visionStatement": "To become the epicenter of pickleball in Bávaro and throughout the Dominican Republic — creating a vibrant community where players of all levels can enjoy the sport.",
"valuesHeading": "Our Values",
"value1Title": "Love & Passion",
"value1Desc": "Everything we do starts with genuine love for the sport and the people who play it.",
"value2Title": "Accessibility",
"value2Desc": "Pickleball is for everyone. We build spaces and programs that welcome all ages and skill levels.",
"value3Title": "Discipline",
"value3Desc": "Consistent practice and dedication are at the core of improvement and excellence.",
"value4Title": "Respect",
"value4Desc": "On and off the court, we treat every player, coach, and visitor with dignity.",
"value5Title": "Social Commitment",
"value5Desc": "We invest in our community — through events, outreach, and making sport accessible.",
"value6Title": "Integrity",
"value6Desc": "We play fair, lead honestly, and hold ourselves to the highest standard in everything.",
"eventsPreviewHeading": "Upcoming Events",
"eventsPreviewSub": "Tournaments, training sessions, and social mixers happening soon.",
"viewAllEvents": "View All Events"
```

**Step 2: Add same keys to `messages/es.json`**

```json
"whatIsHeading": "¿Qué es el Pickleball?",
"whatIsDesc": "El pickleball combina elementos del tenis, el bádminton y el ping-pong. Es fácil de aprender, social y accesible para todas las edades y niveles.",
"whatIsPaddle": "Paleta",
"whatIsPaddleDesc": "Paleta ligera de madera, compuesto o grafito",
"whatIsBall": "Pelota",
"whatIsBallDesc": "Pelota plástica perforada diseñada para juego exterior e interior",
"whatIsCourt": "Cancha",
"whatIsCourtDesc": "Cancha de 6.10×13.41 m con una zona de no-volea de 2.13 m",
"missionHeading": "Nuestra Misión",
"missionStatement": "Promover el bienestar mental, físico y social a través de instalaciones de pickleball accesibles, programas de entrenamiento y eventos comunitarios.",
"visionHeading": "Nuestra Visión",
"visionStatement": "Convertirnos en el epicentro del pickleball en Bávaro y en toda la República Dominicana — creando una comunidad vibrante donde jugadores de todos los niveles puedan disfrutar el deporte.",
"valuesHeading": "Nuestros Valores",
"value1Title": "Amor y Pasión",
"value1Desc": "Todo lo que hacemos parte del amor genuino por el deporte y las personas que lo practican.",
"value2Title": "Accesibilidad",
"value2Desc": "El pickleball es para todos. Creamos espacios y programas que acogen todas las edades y niveles.",
"value3Title": "Disciplina",
"value3Desc": "La práctica constante y la dedicación son el núcleo de la mejora y la excelencia.",
"value4Title": "Respeto",
"value4Desc": "Dentro y fuera de la cancha, tratamos a cada jugador, entrenador y visitante con dignidad.",
"value5Title": "Compromiso Social",
"value5Desc": "Invertimos en nuestra comunidad — a través de eventos, alcance y haciendo el deporte accesible.",
"value6Title": "Integridad",
"value6Desc": "Jugamos limpio, lideramos con honestidad y nos mantenemos al más alto estándar en todo.",
"eventsPreviewHeading": "Próximos Eventos",
"eventsPreviewSub": "Torneos, sesiones de entrenamiento y encuentros sociales que se aproximan.",
"viewAllEvents": "Ver Todos los Eventos"
```

**Step 3: Replace `app/[locale]/page.tsx` with the enhanced version**

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import WelcomeBanner from './WelcomeBanner'
import { FadeInView } from '@/components/animations/FadeInView'
import { StaggerChildren, StaggerItem } from '@/components/animations/StaggerChildren'

interface HomePageProps {
  searchParams: Promise<{ welcome?: string }>
}

async function HomePage({ searchParams }: HomePageProps) {
  const t = await getTranslations('Home')
  const params = await searchParams
  const showWelcome = params.welcome === '1'

  let firstName = ''
  if (showWelcome) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
      firstName = profile?.first_name ?? user.user_metadata?.first_name ?? user.email?.split('@')[0] ?? ''
    }
  }

  const values = [
    { title: t('value1Title'), desc: t('value1Desc'), icon: '❤️', color: 'border-lime' },
    { title: t('value2Title'), desc: t('value2Desc'), icon: '🌍', color: 'border-turquoise' },
    { title: t('value3Title'), desc: t('value3Desc'), icon: '⚡', color: 'border-sunset' },
    { title: t('value4Title'), desc: t('value4Desc'), icon: '🤝', color: 'border-lime' },
    { title: t('value5Title'), desc: t('value5Desc'), icon: '🏘️', color: 'border-turquoise' },
    { title: t('value6Title'), desc: t('value6Desc'), icon: '⭐', color: 'border-sunset' },
  ]

  const whatIs = [
    { label: t('whatIsPaddle'), desc: t('whatIsPaddleDesc'), svg: <PaddleIcon /> },
    { label: t('whatIsBall'),   desc: t('whatIsBallDesc'),   svg: <BallIcon /> },
    { label: t('whatIsCourt'),  desc: t('whatIsCourtDesc'),  svg: <CourtIcon /> },
  ]

  const previewEvents = [
    { title: 'NELL Open Tournament', date: 'Apr 15, 2026', loc: 'Bávaro', type: 'tournament' },
    { title: 'Beginner Clinic',       date: 'Mar 20, 2026', loc: 'Bávaro', type: 'training' },
    { title: 'Friday Night Pickleball', date: 'Mar 14, 2026', loc: 'Bávaro', type: 'social' },
  ]

  return (
    <main className="min-h-screen bg-midnight">
      {showWelcome && firstName && <WelcomeBanner firstName={firstName} />}

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 text-center overflow-hidden">
        {/* Decorative background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-lime/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-turquoise/5 rounded-full blur-3xl" />
          <div className="absolute right-0 top-1/3 w-1 h-40 bg-sunset/30" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-lime/70 tracking-widest uppercase mb-6 border border-lime/20 px-3 py-1 rounded-full">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
            {t('heroLocationBadge')}
          </span>

          <h1
            className="font-bebas-neue text-lime tracking-widest leading-none mb-4"
            style={{ fontSize: 'clamp(4rem, 14vw, 9rem)' }}
          >
            {t('title')}
          </h1>
          <p className="font-bebas-neue text-offwhite/60 tracking-[0.3em] text-lg mb-6 uppercase">
            {t('subtitle')}
          </p>
          <p className="text-offwhite/80 text-lg max-w-xl mb-4 leading-relaxed">
            {t('heroSubheadline')}
          </p>

          <div className="flex gap-4 flex-wrap justify-center mt-4">
            <Link
              href="/signup"
              className="bg-lime text-midnight font-bold rounded-full py-3 px-8 text-base hover:scale-105 hover:bg-sunset transition-all duration-200"
            >
              {t('joinButton')}
            </Link>
            <Link
              href="/events"
              className="border border-lime/40 text-offwhite font-semibold rounded-full py-3 px-8 text-base hover:border-lime hover:text-lime transition-all duration-200"
            >
              {t('viewAllEvents')}
            </Link>
          </div>
        </div>

        <div aria-hidden="true" className="absolute bottom-8 flex flex-col items-center gap-1 text-offwhite/30">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 4v16M4 16l4 4 4-4"/>
          </svg>
        </div>
      </section>

      {/* ── What is Pickleball ── */}
      <section className="py-24 px-4 bg-charcoal/20">
        <div className="max-w-5xl mx-auto">
          <FadeInView className="text-center mb-16">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest mb-3">
              {t('whatIsHeading')}
            </h2>
            <p className="text-offwhite/60 max-w-2xl mx-auto text-base leading-relaxed">
              {t('whatIsDesc')}
            </p>
          </FadeInView>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whatIs.map(({ label, desc, svg }) => (
              <StaggerItem key={label}>
                <div className="bg-midnight border border-charcoal rounded-2xl p-8 text-center hover:border-lime/40 transition-colors">
                  <div className="flex justify-center mb-4 text-lime">{svg}</div>
                  <h3 className="font-bebas-neue text-2xl text-offwhite tracking-widest mb-2">{label}</h3>
                  <p className="text-offwhite/60 text-sm leading-relaxed">{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-lime/20 to-transparent" />
          <div className="absolute -top-20 right-1/4 w-80 h-80 bg-lime/4 rounded-full blur-3xl" />
        </div>
        <FadeInView className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-lime text-sm font-medium tracking-widest uppercase mb-6">{t('missionHeading')}</p>
          <blockquote
            className="font-bebas-neue text-offwhite leading-tight tracking-wide"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            "{t('missionStatement')}"
          </blockquote>
        </FadeInView>
      </section>

      {/* ── Vision ── */}
      <section className="py-24 px-4 bg-charcoal/20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <FadeInView direction="right">
            <p className="text-turquoise text-sm font-medium tracking-widest uppercase mb-4">{t('visionHeading')}</p>
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest leading-tight mb-4">
              {t('visionStatement')}
            </h2>
          </FadeInView>
          <FadeInView direction="left" delay={0.15}>
            <div aria-hidden="true" className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 border-2 border-lime/20 rounded-full animate-pulse" />
                <div className="absolute inset-6 border border-turquoise/20 rounded-full" />
                <div className="absolute inset-12 border border-sunset/20 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bebas-neue text-6xl text-lime/30 tracking-widest">NELL</span>
                </div>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <FadeInView className="text-center mb-16">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">
              {t('valuesHeading')}
            </h2>
          </FadeInView>
          <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map(({ title, desc, icon, color }) => (
              <StaggerItem key={title}>
                <div className={`bg-charcoal border-l-4 ${color} rounded-xl p-6 h-full hover:bg-charcoal/80 transition-colors`}>
                  <div className="text-2xl mb-3">{icon}</div>
                  <h3 className="font-bebas-neue text-xl text-offwhite tracking-widest mb-2">{title}</h3>
                  <p className="text-offwhite/60 text-sm leading-relaxed">{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── Features (existing — keep as-is) ── */}
      {/* ── Plans (existing — keep as-is) ── */}

      {/* ── Events Preview ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <FadeInView className="text-center mb-12">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest mb-3">
              {t('eventsPreviewHeading')}
            </h2>
            <p className="text-offwhite/60">{t('eventsPreviewSub')}</p>
          </FadeInView>
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {previewEvents.map(({ title, date, loc, type }) => (
              <StaggerItem key={title}>
                <div className="bg-charcoal border border-charcoal rounded-xl p-6 flex flex-col gap-3 hover:border-lime/30 transition-colors h-full">
                  <span className={`text-xs font-medium uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${
                    type === 'tournament' ? 'bg-lime/10 text-lime' :
                    type === 'training'   ? 'bg-turquoise/10 text-turquoise' :
                    'bg-sunset/10 text-sunset'
                  }`}>
                    {type}
                  </span>
                  <h3 className="text-offwhite font-semibold">{title}</h3>
                  <p className="text-offwhite/50 text-sm">{date} · {loc}</p>
                  <Link
                    href="/events"
                    className="mt-auto text-sm text-lime hover:underline"
                  >
                    {t('viewAllEvents')} →
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
          <FadeInView className="text-center mt-10">
            <Link
              href="/events"
              className="inline-block border border-lime/40 text-lime font-semibold rounded-full py-3 px-8 hover:bg-lime hover:text-midnight transition-all duration-200"
            >
              {t('viewAllEvents')}
            </Link>
          </FadeInView>
        </div>
      </section>

      {/* ── CTA Banner (existing — keep as-is) ── */}
    </main>
  )
}

// ── Inline SVG Icons ──

function PaddleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="20" cy="18" rx="12" ry="14" />
      <line x1="28" y1="30" x2="40" y2="44" strokeLinecap="round" />
    </svg>
  )
}

function BallIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="6" />
      <line x1="8" y1="24" x2="18" y2="24" />
      <line x1="30" y1="24" x2="40" y2="24" />
    </svg>
  )
}

function CourtIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="10" width="36" height="28" />
      <line x1="24" y1="10" x2="24" y2="38" />
      <line x1="6" y1="24" x2="42" y2="24" />
      <rect x="6" y="18" width="36" height="12" strokeDasharray="2 2" />
    </svg>
  )
}

export default HomePage
```

> **Note:** The existing Features and Plans sections in the file should be preserved between the Values section and Events Preview. This replaces only the page.tsx content — confirm the existing features/plans JSX is carried over intact.

**Step 4: Verify build**

```bash
npx next build 2>&1 | tail -20
```

Expected: no type errors, build succeeds

**Step 5: Commit**

```bash
git add app/[locale]/page.tsx messages/en.json messages/es.json
git commit -m "feat: enhance home page with mission, vision, values, what-is-pickleball, events preview"
```

---

## Task 5: Build About Page

**Files:**
- Create: `app/[locale]/about/page.tsx`
- Modify: `messages/en.json` — add `About.*` keys
- Modify: `messages/es.json` — add `About.*` keys

**Step 1: Add `About.*` keys to `messages/en.json`**

```json
"About": {
  "heroTitle": "About NELL",
  "heroSub": "A sports and recreational initiative bringing pickleball to the Dominican Republic.",
  "introHeading": "What is NELL Pickleball Club?",
  "introText": "NELL Pickleball Club is a sports and recreational initiative created to promote pickleball across the Dominican Republic. We install courts in gyms, sports centers, plazas, and recreational spaces — making the sport accessible wherever communities gather.",
  "originHeading": "The Origin of Pickleball",
  "originYear": "1965",
  "originPlace": "Bainbridge Island, Washington",
  "originText": "Pickleball was invented in 1965 on Bainbridge Island, Washington by Joel Pritchard, Bill Bell, and Barney McCallum. Using a plastic ball and improvised wooden paddles, they created a game the whole family could play — and the world's fastest-growing sport was born.",
  "founder1": "Joel Pritchard",
  "founder2": "Bill Bell",
  "founder3": "Barney McCallum",
  "howHeading": "How Pickleball is Played",
  "singlesTitle": "Singles",
  "singlesDesc": "One player per side. Fast-paced and demanding — all about court coverage and placement.",
  "doublesTitle": "Doubles",
  "doublesDesc": "Two players per side. The most popular format — strategy, communication, and teamwork win.",
  "objectiveLabel": "Objective",
  "objectiveText": "Hit the ball over the net and prevent your opponent from returning it. Points are won when the ball lands in bounds and the opponent cannot make a legal return.",
  "courtHeading": "Court Dimensions",
  "courtWidth": "20 ft (6.10 m)",
  "courtLength": "44 ft (13.41 m)",
  "courtKitchen": "7 ft (2.13 m)",
  "courtWidthLabel": "Width",
  "courtLengthLabel": "Length",
  "courtKitchenLabel": "Kitchen (Non-Volley Zone)",
  "scoringHeading": "Scoring System",
  "scoring1Title": "Serving Team Only",
  "scoring1Desc": "Only the serving team can score a point on each rally.",
  "scoring2Title": "First to 11",
  "scoring2Desc": "Games are typically played to 11 points.",
  "scoring3Title": "Win by 2",
  "scoring3Desc": "A team must win by at least 2 points to take the game.",
  "equipmentHeading": "Equipment",
  "equip1Title": "Paddle",
  "equip1Desc": "Wood, composite, or graphite — lightweight and designed for control.",
  "equip2Title": "Ball",
  "equip2Desc": "Perforated plastic ball, different versions for indoor and outdoor courts.",
  "equip3Title": "Clothing",
  "equip3Desc": "Athletic wear designed for lateral movement and agility.",
  "equip4Title": "Court Shoes",
  "equip4Desc": "Non-marking shoes with good lateral support and traction.",
  "leadershipHeading": "Leadership",
  "founderName": "María Nelly Mercedes Carrasco",
  "founderTitle": "CEO & Founder, NELL Pickleball Club",
  "founderBio": "María Nelly founded NELL Pickleball Club with a vision to bring the world's fastest-growing sport to the Dominican Republic — starting in Bávaro and expanding nationally."
}
```

**Step 2: Add `About.*` keys to `messages/es.json`**

```json
"About": {
  "heroTitle": "Nosotros",
  "heroSub": "Una iniciativa deportiva y recreativa que lleva el pickleball a la República Dominicana.",
  "introHeading": "¿Qué es NELL Pickleball Club?",
  "introText": "NELL Pickleball Club es una iniciativa deportiva y recreativa creada para promover el pickleball en toda la República Dominicana. Instalamos canchas en gimnasios, centros deportivos, plazas y espacios recreativos — haciendo el deporte accesible donde las comunidades se reúnen.",
  "originHeading": "El Origen del Pickleball",
  "originYear": "1965",
  "originPlace": "Bainbridge Island, Washington",
  "originText": "El pickleball fue inventado en 1965 en Bainbridge Island, Washington, por Joel Pritchard, Bill Bell y Barney McCallum. Usando una pelota de plástico y paletas de madera improvisadas, crearon un juego para toda la familia — y nació el deporte de más rápido crecimiento en el mundo.",
  "founder1": "Joel Pritchard",
  "founder2": "Bill Bell",
  "founder3": "Barney McCallum",
  "howHeading": "Cómo se Juega el Pickleball",
  "singlesTitle": "Individual",
  "singlesDesc": "Un jugador por lado. Rápido y exigente — todo sobre cobertura de cancha y colocación.",
  "doublesTitle": "Dobles",
  "doublesDesc": "Dos jugadores por lado. El formato más popular — estrategia, comunicación y trabajo en equipo.",
  "objectiveLabel": "Objetivo",
  "objectiveText": "Golpear la pelota sobre la red e impedir que el oponente la devuelva. Los puntos se ganan cuando la pelota cae dentro y el oponente no puede hacer una devolución legal.",
  "courtHeading": "Dimensiones de la Cancha",
  "courtWidth": "20 pies (6.10 m)",
  "courtLength": "44 pies (13.41 m)",
  "courtKitchen": "7 pies (2.13 m)",
  "courtWidthLabel": "Ancho",
  "courtLengthLabel": "Largo",
  "courtKitchenLabel": "Cocina (Zona de No-Voleo)",
  "scoringHeading": "Sistema de Puntuación",
  "scoring1Title": "Solo el Equipo en Servicio",
  "scoring1Desc": "Solo el equipo que sirve puede anotar un punto en cada rally.",
  "scoring2Title": "Primero en 11",
  "scoring2Desc": "Los partidos se juegan típicamente a 11 puntos.",
  "scoring3Title": "Ganar por 2",
  "scoring3Desc": "Un equipo debe ganar por al menos 2 puntos para llevarse el partido.",
  "equipmentHeading": "Equipamiento",
  "equip1Title": "Paleta",
  "equip1Desc": "Madera, compuesto o grafito — ligera y diseñada para el control.",
  "equip2Title": "Pelota",
  "equip2Desc": "Pelota plástica perforada, versiones distintas para canchas interiores y exteriores.",
  "equip3Title": "Ropa",
  "equip3Desc": "Ropa deportiva diseñada para movimiento lateral y agilidad.",
  "equip4Title": "Zapatillas de Cancha",
  "equip4Desc": "Zapatos sin marcas con buen soporte lateral y tracción.",
  "leadershipHeading": "Liderazgo",
  "founderName": "María Nelly Mercedes Carrasco",
  "founderTitle": "CEO y Fundadora, NELL Pickleball Club",
  "founderBio": "María Nelly fundó NELL Pickleball Club con la visión de llevar el deporte de más rápido crecimiento del mundo a la República Dominicana — comenzando en Bávaro y expandiéndose a nivel nacional."
}
```

**Step 3: Create `app/[locale]/about/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { ParallaxHero } from '@/components/animations/ParallaxHero'
import { FadeInView } from '@/components/animations/FadeInView'
import { StaggerChildren, StaggerItem } from '@/components/animations/StaggerChildren'

export default async function AboutPage() {
  const t = await getTranslations('About')

  const scoring = [
    { n: '01', title: t('scoring1Title'), desc: t('scoring1Desc') },
    { n: '02', title: t('scoring2Title'), desc: t('scoring2Desc') },
    { n: '03', title: t('scoring3Title'), desc: t('scoring3Desc') },
  ]

  const equipment = [
    { title: t('equip1Title'), desc: t('equip1Desc'), icon: <PaddleIcon /> },
    { title: t('equip2Title'), desc: t('equip2Desc'), icon: <BallIcon /> },
    { title: t('equip3Title'), desc: t('equip3Desc'), icon: <ShirtIcon /> },
    { title: t('equip4Title'), desc: t('equip4Desc'), icon: <ShoeIcon /> },
  ]

  const founders = [t('founder1'), t('founder2'), t('founder3')]

  return (
    <main className="min-h-screen bg-midnight">

      {/* ── Hero ── */}
      <ParallaxHero className="min-h-[50vh] flex items-center justify-center border-b border-charcoal">
        <div className="text-center px-4 py-24">
          <FadeInView>
            <p className="text-lime text-sm font-medium tracking-widest uppercase mb-4">NELL Pickleball Club</p>
            <h1 className="font-bebas-neue text-6xl md:text-8xl text-offwhite tracking-widest mb-4">
              {t('heroTitle')}
            </h1>
            <p className="text-offwhite/60 text-lg max-w-xl mx-auto">{t('heroSub')}</p>
          </FadeInView>
        </div>
      </ParallaxHero>

      {/* ── Club Intro ── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <FadeInView>
            <h2 className="font-bebas-neue text-4xl text-offwhite tracking-widest mb-6">{t('introHeading')}</h2>
            <p className="text-offwhite/70 text-lg leading-relaxed">{t('introText')}</p>
          </FadeInView>
        </div>
      </section>

      {/* ── Origin ── */}
      <section className="py-24 px-4 bg-charcoal/20">
        <div className="max-w-4xl mx-auto">
          <FadeInView className="mb-12">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">{t('originHeading')}</h2>
          </FadeInView>
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <FadeInView direction="right" className="shrink-0">
              <div className="bg-midnight border border-lime/20 rounded-2xl p-8 text-center min-w-[160px]">
                <p className="font-bebas-neue text-7xl text-lime tracking-widest">{t('originYear')}</p>
                <p className="text-offwhite/50 text-sm mt-1">{t('originPlace')}</p>
              </div>
            </FadeInView>
            <div>
              <FadeInView direction="left" delay={0.1}>
                <p className="text-offwhite/70 text-lg leading-relaxed mb-8">{t('originText')}</p>
              </FadeInView>
              <StaggerChildren className="flex flex-wrap gap-3">
                {founders.map(name => (
                  <StaggerItem key={name}>
                    <span className="bg-charcoal border border-charcoal rounded-full px-4 py-2 text-offwhite text-sm font-medium">
                      {name}
                    </span>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It's Played ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <FadeInView className="mb-12">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">{t('howHeading')}</h2>
          </FadeInView>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {[
              { title: t('singlesTitle'), desc: t('singlesDesc'), accent: 'border-lime' },
              { title: t('doublesTitle'), desc: t('doublesDesc'), accent: 'border-turquoise' },
            ].map(({ title, desc, accent }, i) => (
              <FadeInView key={title} direction={i % 2 === 0 ? 'right' : 'left'} delay={i * 0.1}>
                <div className={`bg-charcoal border-t-2 ${accent} rounded-xl p-6`}>
                  <h3 className="font-bebas-neue text-2xl text-offwhite tracking-widest mb-2">{title}</h3>
                  <p className="text-offwhite/60 leading-relaxed">{desc}</p>
                </div>
              </FadeInView>
            ))}
          </div>
          <FadeInView>
            <div className="bg-charcoal/40 border border-charcoal rounded-xl p-8">
              <p className="text-lime text-sm font-medium tracking-widest uppercase mb-2">{t('objectiveLabel')}</p>
              <p className="text-offwhite/70 text-lg leading-relaxed">{t('objectiveText')}</p>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ── Court Diagram ── */}
      <section className="py-24 px-4 bg-charcoal/20">
        <div className="max-w-4xl mx-auto">
          <FadeInView className="mb-12 text-center">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">{t('courtHeading')}</h2>
          </FadeInView>
          <FadeInView>
            {/* CSS Court Diagram */}
            <div className="relative mx-auto border-2 border-lime/40 rounded-sm"
              style={{ width: '100%', maxWidth: '480px', aspectRatio: '20/44' }}>
              {/* Net line */}
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-offwhite/40" />
              {/* Kitchen zones */}
              <div className="absolute left-0 right-0 top-0"
                style={{ height: '15.9%', borderBottom: '1px dashed rgba(132,204,22,0.5)', background: 'rgba(132,204,22,0.05)' }}>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-lime/70 text-[10px] font-medium whitespace-nowrap">
                  {t('courtKitchenLabel')} — {t('courtKitchen')}
                </span>
              </div>
              <div className="absolute left-0 right-0 bottom-0"
                style={{ height: '15.9%', borderTop: '1px dashed rgba(132,204,22,0.5)', background: 'rgba(132,204,22,0.05)' }}>
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-lime/70 text-[10px] font-medium whitespace-nowrap">
                  {t('courtKitchenLabel')} — {t('courtKitchen')}
                </span>
              </div>
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-offwhite/20" />
              {/* Dimension labels */}
              <div className="absolute -right-24 top-1/2 -translate-y-1/2 text-offwhite/50 text-xs text-right">
                <p>{t('courtLengthLabel')}</p>
                <p className="text-offwhite font-medium">{t('courtLength')}</p>
              </div>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-offwhite/50 text-xs text-center">
                <p>{t('courtWidthLabel')}: <span className="text-offwhite font-medium">{t('courtWidth')}</span></p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-offwhite/10 font-bebas-neue text-4xl tracking-widest">NET</span>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ── Scoring ── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <FadeInView className="mb-12">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">{t('scoringHeading')}</h2>
          </FadeInView>
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {scoring.map(({ n, title, desc }) => (
              <StaggerItem key={n}>
                <div className="bg-charcoal rounded-xl p-6 h-full">
                  <p className="font-bebas-neue text-5xl text-lime/20 mb-3">{n}</p>
                  <h3 className="font-bebas-neue text-xl text-offwhite tracking-widest mb-2">{title}</h3>
                  <p className="text-offwhite/60 text-sm leading-relaxed">{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── Equipment ── */}
      <section className="py-24 px-4 bg-charcoal/20">
        <div className="max-w-4xl mx-auto">
          <FadeInView className="mb-12">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">{t('equipmentHeading')}</h2>
          </FadeInView>
          <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {equipment.map(({ title, desc, icon }) => (
              <StaggerItem key={title}>
                <div className="bg-midnight border border-charcoal rounded-xl p-6 flex gap-4 items-start hover:border-lime/30 transition-colors">
                  <div className="text-lime shrink-0">{icon}</div>
                  <div>
                    <h3 className="font-semibold text-offwhite mb-1">{title}</h3>
                    <p className="text-offwhite/60 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── Leadership ── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <FadeInView className="mb-12">
            <h2 className="font-bebas-neue text-4xl md:text-5xl text-offwhite tracking-widest">{t('leadershipHeading')}</h2>
          </FadeInView>
          <FadeInView delay={0.1}>
            <div className="bg-charcoal border border-lime/20 rounded-2xl p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              {/* Avatar placeholder */}
              <div className="w-20 h-20 rounded-full bg-lime/10 border-2 border-lime/30 flex items-center justify-center shrink-0">
                <span className="font-bebas-neue text-2xl text-lime">MN</span>
              </div>
              <div>
                <h3 className="font-bebas-neue text-2xl text-offwhite tracking-widest mb-1">{t('founderName')}</h3>
                <p className="text-lime text-sm font-medium mb-4">{t('founderTitle')}</p>
                <p className="text-offwhite/60 leading-relaxed">{t('founderBio')}</p>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>

    </main>
  )
}

// Inline icons
function PaddleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="20" cy="18" rx="12" ry="14" />
      <line x1="28" y1="30" x2="40" y2="44" strokeLinecap="round" />
    </svg>
  )
}
function BallIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="5" />
    </svg>
  )
}
function ShirtIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 6 L6 16 L12 18 L12 40 L36 40 L36 18 L42 16 L32 6 C30 10 18 10 16 6Z" />
    </svg>
  )
}
function ShoeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 32 Q8 24 16 22 L28 20 Q36 19 42 26 L42 34 L6 34 Z" />
      <line x1="6" y1="34" x2="42" y2="34" />
    </svg>
  )
}
```

**Step 4: Verify build compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/[locale]/about/ messages/en.json messages/es.json
git commit -m "feat: build About page with pickleball education, court diagram, leadership"
```

---

## Task 6: Build Events Page

**Files:**
- Create: `app/[locale]/events/page.tsx`
- Create: `app/[locale]/events/EventsClient.tsx`
- Modify: `messages/en.json` — add `Events.*`
- Modify: `messages/es.json` — add `Events.*`

**Step 1: Add `Events.*` keys to `messages/en.json`**

```json
"Events": {
  "heroTitle": "Events & Tournaments",
  "heroSub": "Tournaments, training sessions, and social mixers for the NELL community.",
  "filterAll": "All",
  "filterTournament": "Tournaments",
  "filterTraining": "Training",
  "filterSocial": "Social",
  "registerButton": "Register",
  "emptyState": "No events in this category right now. Check back soon!",
  "locationLabel": "Location",
  "event1Title": "NELL Open Tournament",
  "event1Date": "April 15, 2026",
  "event1Loc": "Bávaro, DR",
  "event1Desc": "Our flagship open tournament. All skill levels welcome. Prizes for top finishers.",
  "event1Cat": "tournament",
  "event2Title": "Doubles Championship",
  "event2Date": "May 3, 2026",
  "event2Loc": "Bávaro, DR",
  "event2Desc": "Find your partner and compete for the doubles title. Round-robin format.",
  "event2Cat": "tournament",
  "event3Title": "Beginner Clinic",
  "event3Date": "March 20, 2026",
  "event3Loc": "Bávaro, DR",
  "event3Desc": "New to pickleball? Our certified coaches will have you rallying in one session.",
  "event3Cat": "training",
  "event4Title": "Advanced Drills",
  "event4Date": "March 27, 2026",
  "event4Loc": "Bávaro, DR",
  "event4Desc": "Sharpen your kitchen game, third-shot drops, and reset mechanics.",
  "event4Cat": "training",
  "event5Title": "Friday Night Pickleball",
  "event5Date": "March 14, 2026",
  "event5Loc": "Bávaro, DR",
  "event5Desc": "Casual open play every Friday evening. All welcome — bring friends!",
  "event5Cat": "social",
  "event6Title": "Community Mixer",
  "event6Date": "March 28, 2026",
  "event6Loc": "Bávaro, DR",
  "event6Desc": "Meet fellow players, play mixed-skill rounds, and enjoy a social evening at the club.",
  "event6Cat": "social"
}
```

**Step 2: Add `Events.*` keys to `messages/es.json`**

```json
"Events": {
  "heroTitle": "Eventos y Torneos",
  "heroSub": "Torneos, sesiones de entrenamiento y encuentros sociales para la comunidad NELL.",
  "filterAll": "Todos",
  "filterTournament": "Torneos",
  "filterTraining": "Entrenamiento",
  "filterSocial": "Social",
  "registerButton": "Registrarse",
  "emptyState": "No hay eventos en esta categoría por ahora. ¡Vuelve pronto!",
  "locationLabel": "Lugar",
  "event1Title": "Torneo Abierto NELL",
  "event1Date": "15 de abril, 2026",
  "event1Loc": "Bávaro, RD",
  "event1Desc": "Nuestro torneo abierto insignia. Todos los niveles bienvenidos. Premios para los mejores.",
  "event1Cat": "tournament",
  "event2Title": "Campeonato de Dobles",
  "event2Date": "3 de mayo, 2026",
  "event2Loc": "Bávaro, RD",
  "event2Desc": "Encuentra tu pareja y compite por el título de dobles. Formato round-robin.",
  "event2Cat": "tournament",
  "event3Title": "Clínica para Principiantes",
  "event3Date": "20 de marzo, 2026",
  "event3Loc": "Bávaro, RD",
  "event3Desc": "¿Nuevo en el pickleball? Nuestros entrenadores certificados te enseñarán en una sola sesión.",
  "event3Cat": "training",
  "event4Title": "Drills Avanzados",
  "event4Date": "27 de marzo, 2026",
  "event4Loc": "Bávaro, RD",
  "event4Desc": "Afila tu juego en la cocina, tercera bola y mecánicas de reset.",
  "event4Cat": "training",
  "event5Title": "Pickleball de Viernes en la Noche",
  "event5Date": "14 de marzo, 2026",
  "event5Loc": "Bávaro, RD",
  "event5Desc": "Juego abierto casual todos los viernes por la tarde. ¡Todos bienvenidos!",
  "event5Cat": "social",
  "event6Title": "Mixer Comunitario",
  "event6Date": "28 de marzo, 2026",
  "event6Loc": "Bávaro, RD",
  "event6Desc": "Conoce a otros jugadores, juega rondas mixtas y disfruta una tarde social en el club.",
  "event6Cat": "social"
}
```

**Step 3: Create `app/[locale]/events/EventsClient.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

type Category = 'all' | 'tournament' | 'training' | 'social'

interface Event {
  title: string
  date: string
  loc: string
  desc: string
  cat: string
}

interface EventsClientProps {
  events: Event[]
  labels: {
    all: string
    tournament: string
    training: string
    social: string
    registerButton: string
    emptyState: string
    locationLabel: string
  }
}

const catColor: Record<string, string> = {
  tournament: 'bg-lime/10 text-lime',
  training:   'bg-turquoise/10 text-turquoise',
  social:     'bg-sunset/10 text-sunset',
}

export function EventsClient({ events, labels }: EventsClientProps) {
  const [active, setActive] = useState<Category>('all')

  const tabs: { key: Category; label: string }[] = [
    { key: 'all',        label: labels.all },
    { key: 'tournament', label: labels.tournament },
    { key: 'training',   label: labels.training },
    { key: 'social',     label: labels.social },
  ]

  const filtered = active === 'all'
    ? events
    : events.filter(e => e.cat === active)

  return (
    <div>
      {/* Filter tabs */}
      <LayoutGroup>
        <div className="flex flex-wrap gap-2 mb-10">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="relative px-5 py-2 text-sm font-medium rounded-full transition-colors"
              style={{ color: active === key ? '#0a0a0a' : 'rgba(250,250,250,0.6)' }}
            >
              {active === key && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-lime rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      {/* Event grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {filtered.length === 0 ? (
            <p className="text-offwhite/40 text-center py-20">{labels.emptyState}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(event => (
                <div
                  key={event.title}
                  className="bg-charcoal border border-charcoal rounded-xl p-6 flex flex-col gap-4 hover:border-lime/30 transition-colors"
                >
                  <span className={`text-xs font-medium uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${catColor[event.cat] ?? 'bg-charcoal text-offwhite'}`}>
                    {event.cat}
                  </span>
                  <div>
                    <h3 className="text-offwhite font-semibold text-lg mb-1">{event.title}</h3>
                    <p className="text-offwhite/50 text-sm">{event.date}</p>
                    <p className="text-offwhite/50 text-sm">{labels.locationLabel}: {event.loc}</p>
                  </div>
                  <p className="text-offwhite/60 text-sm leading-relaxed flex-1">{event.desc}</p>
                  <button className="w-full bg-midnight border border-lime/30 text-lime text-sm font-semibold py-2 rounded-full hover:bg-lime hover:text-midnight transition-all duration-200">
                    {labels.registerButton}
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
```

**Step 4: Create `app/[locale]/events/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { ParallaxHero } from '@/components/animations/ParallaxHero'
import { FadeInView } from '@/components/animations/FadeInView'
import { EventsClient } from './EventsClient'

export default async function EventsPage() {
  const t = await getTranslations('Events')

  const events = [
    { title: t('event1Title'), date: t('event1Date'), loc: t('event1Loc'), desc: t('event1Desc'), cat: t('event1Cat') },
    { title: t('event2Title'), date: t('event2Date'), loc: t('event2Loc'), desc: t('event2Desc'), cat: t('event2Cat') },
    { title: t('event3Title'), date: t('event3Date'), loc: t('event3Loc'), desc: t('event3Desc'), cat: t('event3Cat') },
    { title: t('event4Title'), date: t('event4Date'), loc: t('event4Loc'), desc: t('event4Desc'), cat: t('event4Cat') },
    { title: t('event5Title'), date: t('event5Date'), loc: t('event5Loc'), desc: t('event5Desc'), cat: t('event5Cat') },
    { title: t('event6Title'), date: t('event6Date'), loc: t('event6Loc'), desc: t('event6Desc'), cat: t('event6Cat') },
  ]

  const labels = {
    all:           t('filterAll'),
    tournament:    t('filterTournament'),
    training:      t('filterTraining'),
    social:        t('filterSocial'),
    registerButton: t('registerButton'),
    emptyState:    t('emptyState'),
    locationLabel: t('locationLabel'),
  }

  return (
    <main className="min-h-screen bg-midnight">

      {/* ── Hero ── */}
      <ParallaxHero className="min-h-[50vh] flex items-center justify-center border-b border-charcoal">
        <div className="text-center px-4 py-24">
          <FadeInView>
            <h1 className="font-bebas-neue text-6xl md:text-8xl text-offwhite tracking-widest mb-4">
              {t('heroTitle')}
            </h1>
            <p className="text-offwhite/60 text-lg max-w-xl mx-auto">{t('heroSub')}</p>
          </FadeInView>
        </div>
      </ParallaxHero>

      {/* ── Events ── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeInView className="mb-8">
            <EventsClient events={events} labels={labels} />
          </FadeInView>
        </div>
      </section>

    </main>
  )
}
```

**Step 5: Verify build**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add app/[locale]/events/ messages/en.json messages/es.json
git commit -m "feat: build Events page with filter tabs and 6 placeholder events"
```

---

## Task 7: Build Contact Page

**Files:**
- Create: `app/[locale]/contact/page.tsx`
- Create: `app/[locale]/contact/ContactForm.tsx`
- Modify: `messages/en.json` — add `Contact.*`
- Modify: `messages/es.json` — add `Contact.*`

**Step 1: Add `Contact.*` keys to `messages/en.json`**

```json
"Contact": {
  "heroTitle": "Get in Touch",
  "heroSub": "We'd love to hear from you. Reach out by form, phone, email, or WhatsApp.",
  "phoneLabel": "Phone",
  "emailLabel": "Email",
  "phone": "(829)-655-4777",
  "email": "nellpickleballclub@gmail.com",
  "formHeading": "Send a Message",
  "fieldName": "Your name",
  "fieldEmail": "Your email",
  "fieldMessage": "Your message",
  "submitButton": "Send Message",
  "submittingButton": "Sending...",
  "successMessage": "Message received! We'll be in touch soon.",
  "whatsappLabel": "Chat on WhatsApp",
  "whatsappSub": "Prefer a quick chat? Message us directly on WhatsApp.",
  "socialHeading": "Follow Us"
}
```

**Step 2: Add `Contact.*` keys to `messages/es.json`**

```json
"Contact": {
  "heroTitle": "Contáctanos",
  "heroSub": "Nos encantaría saber de ti. Escríbenos por formulario, teléfono, correo o WhatsApp.",
  "phoneLabel": "Teléfono",
  "emailLabel": "Correo",
  "phone": "(829)-655-4777",
  "email": "nellpickleballclub@gmail.com",
  "formHeading": "Envíanos un Mensaje",
  "fieldName": "Tu nombre",
  "fieldEmail": "Tu correo",
  "fieldMessage": "Tu mensaje",
  "submitButton": "Enviar Mensaje",
  "submittingButton": "Enviando...",
  "successMessage": "¡Mensaje recibido! Nos pondremos en contacto pronto.",
  "whatsappLabel": "Chatear por WhatsApp",
  "whatsappSub": "¿Prefieres un chat rápido? Escríbenos directamente por WhatsApp.",
  "socialHeading": "Síguenos"
}
```

**Step 3: Create `app/[locale]/contact/ContactForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContactFormProps {
  labels: {
    formHeading: string
    fieldName: string
    fieldEmail: string
    fieldMessage: string
    submitButton: string
    submittingButton: string
    successMessage: string
  }
}

export function ContactForm({ labels }: ContactFormProps) {
  const [state, setState] = useState({ name: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO Phase 5: wire to email service
    await new Promise(r => setTimeout(r, 800))
    console.log('Contact form submission:', state)
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="bg-charcoal rounded-2xl p-8">
      <h2 className="font-bebas-neue text-3xl text-offwhite tracking-widest mb-6">
        {labels.formHeading}
      </h2>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.p
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lime text-lg font-medium py-8 text-center"
          >
            {labels.successMessage}
          </motion.p>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              required
              placeholder={labels.fieldName}
              value={state.name}
              onChange={e => setState(s => ({ ...s, name: e.target.value }))}
              className="bg-midnight border border-charcoal rounded-xl px-4 py-3 text-offwhite placeholder:text-offwhite/30 focus:outline-none focus:border-lime/50 transition-colors"
            />
            <input
              type="email"
              required
              placeholder={labels.fieldEmail}
              value={state.email}
              onChange={e => setState(s => ({ ...s, email: e.target.value }))}
              className="bg-midnight border border-charcoal rounded-xl px-4 py-3 text-offwhite placeholder:text-offwhite/30 focus:outline-none focus:border-lime/50 transition-colors"
            />
            <textarea
              required
              rows={5}
              placeholder={labels.fieldMessage}
              value={state.message}
              onChange={e => setState(s => ({ ...s, message: e.target.value }))}
              className="bg-midnight border border-charcoal rounded-xl px-4 py-3 text-offwhite placeholder:text-offwhite/30 focus:outline-none focus:border-lime/50 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-lime text-midnight font-bold rounded-full py-3 px-8 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {submitting ? labels.submittingButton : labels.submitButton}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 4: Create `app/[locale]/contact/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { ParallaxHero } from '@/components/animations/ParallaxHero'
import { FadeInView } from '@/components/animations/FadeInView'
import { StaggerChildren, StaggerItem } from '@/components/animations/StaggerChildren'
import { ContactForm } from './ContactForm'

export default async function ContactPage() {
  const t = await getTranslations('Contact')

  const formLabels = {
    formHeading:       t('formHeading'),
    fieldName:         t('fieldName'),
    fieldEmail:        t('fieldEmail'),
    fieldMessage:      t('fieldMessage'),
    submitButton:      t('submitButton'),
    submittingButton:  t('submittingButton'),
    successMessage:    t('successMessage'),
  }

  const contactCards = [
    {
      label: t('phoneLabel'),
      value: t('phone'),
      href:  'tel:+18296554777',
      icon:  <PhoneIcon />,
    },
    {
      label: t('emailLabel'),
      value: t('email'),
      href:  'mailto:nellpickleballclub@gmail.com',
      icon:  <MailIcon />,
    },
  ]

  return (
    <main className="min-h-screen bg-midnight">

      {/* ── Hero ── */}
      <ParallaxHero className="min-h-[50vh] flex items-center justify-center border-b border-charcoal">
        <div className="text-center px-4 py-24">
          <FadeInView>
            <h1 className="font-bebas-neue text-6xl md:text-8xl text-offwhite tracking-widest mb-4">
              {t('heroTitle')}
            </h1>
            <p className="text-offwhite/60 text-lg max-w-xl mx-auto">{t('heroSub')}</p>
          </FadeInView>
        </div>
      </ParallaxHero>

      {/* ── Contact Info + Form ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left: info + WhatsApp */}
          <div className="flex flex-col gap-6">
            <StaggerChildren className="flex flex-col gap-4">
              {contactCards.map(({ label, value, href, icon }) => (
                <StaggerItem key={label}>
                  <a
                    href={href}
                    className="bg-charcoal border border-charcoal rounded-xl p-5 flex items-center gap-4 hover:border-lime/30 transition-colors group"
                  >
                    <div className="text-lime">{icon}</div>
                    <div>
                      <p className="text-offwhite/50 text-xs uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-offwhite font-medium group-hover:text-lime transition-colors">{value}</p>
                    </div>
                  </a>
                </StaggerItem>
              ))}
            </StaggerChildren>

            {/* WhatsApp CTA */}
            <FadeInView delay={0.2}>
              <div className="bg-charcoal/40 border border-charcoal rounded-xl p-6">
                <p className="text-offwhite font-semibold mb-1">{t('whatsappLabel')}</p>
                <p className="text-offwhite/50 text-sm mb-4">{t('whatsappSub')}</p>
                <a
                  href="https://wa.me/18296554777"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-lime text-midnight font-bold rounded-full px-6 py-2.5 hover:opacity-90 transition-opacity"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              </div>
            </FadeInView>
          </div>

          {/* Right: form */}
          <FadeInView direction="left" delay={0.1}>
            <ContactForm labels={formLabels} />
          </FadeInView>
        </div>
      </section>

    </main>
  )
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}
```

**Step 5: Verify build**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add app/[locale]/contact/ messages/en.json messages/es.json
git commit -m "feat: build Contact page with form, phone, email, WhatsApp CTA"
```

---

## Task 8: Final Verification

**Step 1: Full build**

```bash
npx next build
```

Expected: all 4 pages compile cleanly, no type errors

**Step 2: Check all routes exist**

```bash
npx next build 2>&1 | grep -E "/(about|events|contact)"
```

Expected: routes appear in build output

**Step 3: Run unit tests**

```bash
npm run test:unit
```

Expected: all pass (no new unit tests needed for UI-only pages)

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete public marketing pages — About, Events, Contact + Home enhancements with Framer Motion animations"
```
