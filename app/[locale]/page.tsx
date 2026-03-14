import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getContentBlocks } from '@/lib/content'
import Link from 'next/link'
import WelcomeBanner from './WelcomeBanner'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Footer } from '@/components/Footer'
import { ChatWidget } from '@/components/chatbot/ChatWidget'
import { GrainOverlay } from '@/components/effects/GrainOverlay'
import { FloatingParticles } from '@/components/effects/FloatingParticles'
import { GlowButton } from '@/components/effects/GlowButton'
import { GlowCard } from '@/components/effects/GlowCard'
import { AnimatedHeroAccents, AnimatedCtaAccents } from '@/components/effects/AnimatedAccents'
import type { Metadata } from 'next'

interface HomePageProps {
  searchParams: Promise<{ welcome?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Home')

  const title = `NELL Pickleball Club | ${locale === 'en' ? 'Bavaro, Dominican Republic' : 'Bavaro, Republica Dominicana'}`
  const description = t('heroSubheadline')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
      siteName: 'NELL Pickleball Club',
    },
    alternates: {
      languages: {
        en: '/en',
        es: '/es',
      },
    },
  }
}

async function HomePage({ searchParams }: HomePageProps) {
  const t = await getTranslations('Home')
  const locale = await getLocale()
  const params = await searchParams
  const showWelcome = params.welcome === '1'

  // Fetch CMS content
  const content = await getContentBlocks('home_', locale)

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

  return (
    <MotionProvider>
      <main className="min-h-screen bg-midnight">
        <GrainOverlay />
        {showWelcome && firstName && <WelcomeBanner firstName={firstName} />}

        {/* -- HERO -- */}
        <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">

          {/* Animated background shapes */}
          <AnimatedHeroAccents />

          {/* Floating particles */}
          <FloatingParticles count={20} />

          <HeroEntrance className="relative z-10 flex flex-col items-center">
            {/* Location badge */}
            <div className="flex items-center gap-2 mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-lime shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.799 3.5-8.327a8.25 8.25 0 00-16.5 0c0 3.527 1.557 6.314 3.5 8.328a19.583 19.583 0 002.683 2.281 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-lime text-sm font-semibold tracking-widest uppercase">
                {t('heroLocationBadge')}
              </span>
            </div>

            {/* Main headline — animated gradient text */}
            <h1 className="font-bebas-neue text-[clamp(4rem,14vw,9rem)] leading-none tracking-widest gradient-text mb-4">
              {t('heroHeadline')}
            </h1>

            {/* Club name accent line */}
            <p className="font-bebas-neue text-[clamp(1.5rem,5vw,3rem)] gradient-text-static tracking-[0.3em] uppercase mb-6">
              {t('title')}&nbsp;{t('subtitle')}
            </p>

            {/* Sub-headline -- CMS content or i18n fallback */}
            <p className="text-offwhite/70 text-base sm:text-lg max-w-xl leading-relaxed mb-10">
              {t('heroSubheadline')}
            </p>

            {/* CMS hero content */}
            {content.home_hero && (
              <div
                className="text-offwhite/70 text-base max-w-xl leading-relaxed mb-10 prose prose-invert"
                dangerouslySetInnerHTML={{ __html: content.home_hero }}
              />
            )}

            {/* Primary CTA — glowing */}
            <GlowButton href="/signup" variant="lime">
              {t('heroCta')}
            </GlowButton>
          </HeroEntrance>

          {/* Scroll hint — animated bounce */}
          <div
            aria-hidden="true"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50"
            style={{ animation: 'scroll-hint-bounce 2s ease-in-out infinite' }}
          >
            <div className="w-px h-8 bg-offwhite" />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-offwhite">
              <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v13.19l5.47-5.47a.75.75 0 111.06 1.06l-6.75 6.75a.75.75 0 01-1.06 0l-6.75-6.75a.75.75 0 111.06-1.06l5.47 5.47V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
          </div>
        </section>

        {/* -- CMS Overview Section -- */}
        {content.home_overview && (
          <ScrollReveal>
            <section className="py-16 px-6 bg-charcoal/30">
              <div className="max-w-3xl mx-auto text-center">
                <div
                  className="text-offwhite/70 text-base sm:text-lg leading-relaxed prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.home_overview }}
                />
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* -- FEATURES / WHY NELL -- */}
        <ScrollReveal>
          <section className="py-24 px-6 bg-midnight">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-bebas-neue text-5xl sm:text-6xl gradient-text tracking-widest mb-3 inline-block">
                  {t('featuresHeading')}
                </h2>
                <p className="text-offwhite/70 text-base sm:text-lg max-w-lg mx-auto">
                  {t('featuresSubheading')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Card 1 -- Court Reservations */}
                <GlowCard accentColor="var(--color-lime)">
                  <article className="bg-charcoal border border-charcoal rounded-2xl p-8 flex flex-col gap-5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-midnight border border-lime/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-lime" aria-hidden="true">
                        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bebas-neue text-2xl text-offwhite tracking-wide mb-2">
                        {t('feature1Title')}
                      </h3>
                      <p className="text-offwhite/70 text-sm leading-relaxed">
                        {t('feature1Desc')}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-offwhite/10">
                      <span className="font-bebas-neue text-4xl text-lime/20 select-none">01</span>
                    </div>
                  </article>
                </GlowCard>

                {/* Card 2 -- Professional Training */}
                <GlowCard accentColor="var(--color-turquoise)">
                  <article className="bg-charcoal border border-charcoal rounded-2xl p-8 flex flex-col gap-5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-midnight border border-turquoise/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-turquoise" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.075.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bebas-neue text-2xl text-offwhite tracking-wide mb-2">
                        {t('feature2Title')}
                      </h3>
                      <p className="text-offwhite/70 text-sm leading-relaxed">
                        {t('feature2Desc')}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-offwhite/10">
                      <span className="font-bebas-neue text-4xl text-turquoise/20 select-none">02</span>
                    </div>
                  </article>
                </GlowCard>

                {/* Card 3 -- Exclusive Community */}
                <GlowCard accentColor="var(--color-sunset)">
                  <article className="bg-charcoal border border-charcoal rounded-2xl p-8 flex flex-col gap-5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-midnight border border-sunset/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-sunset" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                        <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bebas-neue text-2xl text-offwhite tracking-wide mb-2">
                        {t('feature3Title')}
                      </h3>
                      <p className="text-offwhite/70 text-sm leading-relaxed">
                        {t('feature3Desc')}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-offwhite/10">
                      <span className="font-bebas-neue text-4xl text-sunset/20 select-none">03</span>
                    </div>
                  </article>
                </GlowCard>

              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* -- MEMBERSHIP PLANS -- */}
        <ScrollReveal>
          <section className="py-24 px-6 bg-charcoal/40">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-bebas-neue text-5xl sm:text-6xl gradient-text tracking-widest mb-3 inline-block">
                  {t('plansHeading')}
                </h2>
                <p className="text-offwhite/70 text-base sm:text-lg">
                  {t('plansSubheading')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">

                {/* VIP Plan -- highlighted with glow */}
                <GlowCard accentColor="var(--color-lime)" className="h-full">
                  <article className="relative flex flex-col rounded-2xl border-2 border-lime bg-midnight p-8 shadow-xl shadow-lime/10 h-full">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-block bg-lime text-midnight text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg shadow-lime/30">
                        {t('planVipBadge')}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-bebas-neue text-3xl gradient-text-static tracking-wide mb-1 inline-block">
                        {t('planVipName')}
                      </h3>
                      <p className="text-offwhite/60 text-sm mb-6">
                        {t('planVipTagline')}
                      </p>

                      <div className="flex items-end gap-1 mb-8">
                        <span className="font-bebas-neue text-6xl text-offwhite leading-none">
                          {t('planVipPrice')}
                        </span>
                        <span className="text-offwhite/60 text-lg mb-2">
                          {t('planVipPer')}
                        </span>
                      </div>

                      <ul className="flex flex-col gap-3 mb-10">
                        {[
                          t('planVipFeature1'),
                          t('planVipFeature2'),
                          t('planVipFeature3'),
                          t('planVipFeature4'),
                        ].map((feature) => (
                          <li key={feature} className="flex items-center gap-3 text-offwhite/80 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-lime shrink-0" aria-hidden="true">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto">
                      <GlowButton href="/signup" variant="lime" className="w-full text-center py-3.5 text-base">
                        {t('planVipCta')}
                      </GlowButton>
                    </div>
                  </article>
                </GlowCard>

                {/* Basic Plan */}
                <GlowCard accentColor="var(--color-turquoise)" className="h-full">
                  <article className="flex flex-col rounded-2xl border border-charcoal bg-charcoal p-8 h-full">
                    <h3 className="font-bebas-neue text-3xl text-offwhite tracking-wide mb-1">
                      {t('planBasicName')}
                    </h3>
                    <p className="text-offwhite/60 text-sm mb-6">
                      {t('planBasicTagline')}
                    </p>

                    <div className="flex items-end gap-1 mb-8">
                      <span className="font-bebas-neue text-6xl text-offwhite leading-none">
                        {t('planBasicPrice')}
                      </span>
                      <span className="text-offwhite/60 text-lg mb-2">
                        {t('planBasicPer')}
                      </span>
                    </div>

                    <ul className="flex flex-col gap-3 mb-10">
                      {[
                        t('planBasicFeature1'),
                        t('planBasicFeature2'),
                        t('planBasicFeature3'),
                        t('planBasicFeature4'),
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-offwhite/70 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-turquoise shrink-0" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      <Link
                        href="/signup"
                        className="block w-full text-center bg-midnight text-offwhite font-bold rounded-full py-3.5 text-base tracking-wide border border-offwhite/20 hover:border-turquoise/50 hover:text-turquoise hover:scale-[1.02] transition-all duration-200"
                      >
                        {t('planBasicCta')}
                      </Link>
                    </div>
                  </article>
                </GlowCard>

              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* -- CTA BANNER -- */}
        <ScrollReveal>
          <section className="relative py-28 px-6 overflow-hidden bg-midnight">
            {/* Animated background accents */}
            <AnimatedCtaAccents />

            <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
              <h2 className="font-bebas-neue text-[clamp(2.5rem,8vw,5.5rem)] leading-none gradient-text tracking-widest inline-block">
                {t('ctaHeadline')}
              </h2>
              <p className="text-offwhite/70 text-base sm:text-lg max-w-xl">
                {t('ctaSubheadline')}
              </p>
              <GlowButton href="/signup" variant="sunset">
                {t('ctaButton')}
              </GlowButton>
            </div>
          </section>
        </ScrollReveal>
      </main>
      <Footer />
      <ChatWidget locale={locale} />
    </MotionProvider>
  )
}

export default HomePage
