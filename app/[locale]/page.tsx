import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import WelcomeBanner from './WelcomeBanner'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Footer } from '@/components/Footer'
import { ChatWidget } from '@/components/chatbot/ChatWidget'
import { GlowButton } from '@/components/effects/GlowButton'
import { AnimatedCtaAccents } from '@/components/effects/AnimatedAccents'
import { PackagesSection } from '@/components/public/PackagesSection'
import { AboutSection } from '@/components/public/AboutSection'
import { HeroVideo } from '@/components/effects/HeroVideo'
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

  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] = null
  let firstName = ''

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (user) {
      if (showWelcome) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single()
        firstName = profile?.first_name ?? user.user_metadata?.first_name ?? user.email?.split('@')[0] ?? ''
      }

    }
  } catch {
    // Network error reaching Supabase — render as logged-out
  }

  return (
    <MotionProvider>
      <main className="min-h-screen bg-midnight">
        {showWelcome && firstName && <WelcomeBanner firstName={firstName} />}

        {/* -- HERO -- */}
        <section className="relative flex items-end min-h-screen overflow-hidden">

          {/* Background video with dark overlay */}
          <HeroVideo />

          {/* Content pinned to bottom-left over the video */}
          <div className="relative z-[10] w-full px-6 sm:px-12 lg:px-20 pb-24 sm:pb-28 lg:pb-32 pt-[15vh] sm:pt-[15vh]">
            <div className="max-w-2xl">
              {/* Location badge */}
              <ScrollReveal delay={0}>
                <div className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full border border-offwhite/15 bg-black/40 backdrop-blur-md">
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
              </ScrollReveal>

              {/* Main headline */}
              <ScrollReveal delay={0.15}>
                <h1 className="font-bebas-neue text-[clamp(3.5rem,12vw,8rem)] leading-[1] tracking-widest text-offwhite mb-3 py-1 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                  {t('heroHeadline')}
                </h1>
              </ScrollReveal>

              {/* Club name */}
              <ScrollReveal delay={0.3}>
                <p className="font-bebas-neue text-[clamp(1.2rem,4vw,2.5rem)] leading-[1.2] text-sunset tracking-[0.3em] uppercase mb-8 pr-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                  {t('title')}&nbsp;{t('subtitle')}
                </p>
              </ScrollReveal>

              {/* Accent divider */}
              <ScrollReveal delay={0.45}>
                <div className="w-16 h-px bg-gradient-to-r from-lime/60 to-transparent mb-8" />
              </ScrollReveal>

              {/* Sub-headline */}
              <ScrollReveal delay={0.55}>
                <p className="text-white text-base sm:text-lg max-w-lg leading-relaxed mb-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                  {t('heroSubheadline')}
                </p>
              </ScrollReveal>

              {/* CTA — only for non-logged-in users */}
              {!user && (
                <ScrollReveal delay={0.75}>
                  <GlowButton href="/signup" variant="lime">
                    {t('heroCta')}
                  </GlowButton>
                </ScrollReveal>
              )}
            </div>
          </div>
        </section>

        {/* -- ABOUT (Vision, Mission, Values) -- */}
        <AboutSection locale={locale} />

        {/* -- PACKAGES & PRICING -- */}
        <PackagesSection locale={locale} />

        {/* -- CTA BANNER — only for non-logged-in users -- */}
        {!user && (
          <ScrollReveal>
            <section className="relative py-32 sm:py-40 px-6 sm:px-10 overflow-hidden bg-midnight">
              {/* Animated background accents */}
              <AnimatedCtaAccents />

              <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
                <h2 className="font-bebas-neue text-[clamp(2.5rem,8vw,5.5rem)] leading-tight gradient-text tracking-widest inline-block py-1">
                  {t('ctaHeadline')}
                </h2>
                <p className="text-white text-base sm:text-lg max-w-xl leading-relaxed">
                  {t('ctaSubheadline')}
                </p>
                <div className="mt-2">
                  <GlowButton href="/signup" variant="sunset">
                    {t('ctaButton')}
                  </GlowButton>
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}
      </main>
      <Footer />
      <ChatWidget locale={locale} />
    </MotionProvider>
  )
}

export default HomePage
