import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { StaggerChildren } from '@/components/motion/StaggerChildren'
import { EventCard } from '@/components/public/EventCard'
import { GlowButton } from '@/components/effects/GlowButton'
import { FloatingParticles } from '@/components/effects/FloatingParticles'
import { SubpageHeroAccents } from '@/components/effects/SubpageHeroAccents'
import Link from 'next/link'
import type { Event } from '@/lib/types/admin'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')

  return {
    title: t('eventsMetaTitle'),
    description: t('eventsMetaDescription'),
    openGraph: {
      title: t('eventsMetaTitle'),
      description: t('eventsMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
    },
    alternates: {
      languages: {
        en: '/en/events',
        es: '/es/events',
      },
    },
  }
}

export default async function EventsPage() {
  const locale = await getLocale()
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title_es, title_en, description_es, description_en, event_date, event_type, start_time, end_time, image_url, price_cents, created_at')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const upcomingEvents = (events ?? []) as Event[]

  // Determine tourist surcharge for the current user
  let touristSurchargePercent = 0
  let isLoggedIn = false

  try {
    const { data: { user } } = await supabase.auth.getUser()
    isLoggedIn = !!user

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single()

      const isUserTourist = profile?.country !== 'DO'

      if (isUserTourist) {
        const { data: config } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'tourist_surcharge_pct')
          .single()

        touristSurchargePercent = config?.value ?? 25
      }
    }
  } catch {
    // Network error reaching Supabase — default to no surcharge
  }

  return (
    <main className="min-h-screen bg-midnight">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-32 px-6 text-center overflow-hidden">
        <SubpageHeroAccents secondaryColor="sunset" />
        <FloatingParticles count={12} />

        <HeroEntrance className="relative z-10 flex flex-col items-center">
          <h1 className="font-bebas-neue text-[clamp(3rem,10vw,7rem)] leading-none tracking-widest gradient-text mb-4 inline-block">
            {locale === 'en' ? 'Events' : 'Eventos'}
          </h1>
          <p className="text-white text-base sm:text-lg max-w-xl leading-relaxed">
            {locale === 'en'
              ? 'Tournaments, training sessions, and social events at NELL Pickleball Club.'
              : 'Torneos, sesiones de entrenamiento y eventos sociales en NELL Pickleball Club.'}
          </p>
        </HeroEntrance>
      </section>

      {/* Events grid */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {upcomingEvents.length === 0 ? (
            <ScrollReveal>
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-6 bg-charcoal rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white/80">
                    <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="font-bebas-neue text-3xl text-offwhite tracking-widest mb-3">
                  {locale === 'en' ? 'No Upcoming Events' : 'No Hay Eventos Proximos'}
                </h2>
                <p className="text-white text-base mb-6">
                  {locale === 'en'
                    ? 'Check back soon or contact us to learn about upcoming events.'
                    : 'Vuelve pronto o contactanos para conocer los proximos eventos.'}
                </p>
                <Link
                  href="/contact"
                  className="inline-block bg-turquoise text-midnight font-bold rounded-full py-3 px-8 text-base tracking-wide hover:bg-lime hover:scale-105 transition-all duration-200"
                >
                  {locale === 'en' ? 'Contact Us' : 'Contactanos'}
                </Link>
              </div>
            </ScrollReveal>
          ) : (
            <StaggerChildren
              staggerDelay={0.1}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} locale={locale} touristSurchargePercent={touristSurchargePercent} />
              ))}
            </StaggerChildren>
          )}

          {/* Bottom CTA — only for non-logged-in users */}
          {!isLoggedIn && (
            <ScrollReveal delay={0.3}>
              <div className="mt-16 text-center flex flex-col items-center">
                <p className="text-white text-base mb-6">
                  {locale === 'en'
                    ? 'Sign up to stay updated on upcoming events.'
                    : 'Regístrate para estar al día con los próximos eventos.'}
                </p>
                <GlowButton href="/signup" variant="sunset">
                  {locale === 'en' ? 'Sign Up' : 'Regístrate'}
                </GlowButton>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>
    </main>
  )
}
