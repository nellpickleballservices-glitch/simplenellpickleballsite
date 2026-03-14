import { getLocale, getTranslations } from 'next-intl/server'
import { getContentBlocks } from '@/lib/content'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { ValueTimeline } from '@/components/public/ValueTimeline'
import { GlowButton } from '@/components/effects/GlowButton'
import { FloatingParticles } from '@/components/effects/FloatingParticles'
import { SubpageHeroAccents } from '@/components/effects/SubpageHeroAccents'
import type { Metadata } from 'next'

// Value icons as inline SVGs
function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}

function HandRaisedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M10.5 1.875a1.125 1.125 0 012.25 0v8.219c.517.162 1.02.382 1.5.659V3.375a1.125 1.125 0 012.25 0v10.937a4.505 4.505 0 00-3.25 2.373 8.963 8.963 0 01-.002-1.933V3.375a1.125 1.125 0 00-2.25 0v5.586a4.502 4.502 0 00-1.5-.659V1.875zM7.5 8.159V4.875a1.125 1.125 0 00-2.25 0v7.59a4.502 4.502 0 012.25-1.062V8.159zm-4.5 6.216v-3.75a1.125 1.125 0 00-2.25 0v3.75a1.125 1.125 0 002.25 0zm18 0v-3.75a1.125 1.125 0 00-2.25 0v3.75a1.125 1.125 0 002.25 0zM12 21.375a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576L1.323 12.22a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 006.745 7.39l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
    </svg>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')

  return {
    title: t('aboutMetaTitle'),
    description: t('aboutMetaDescription'),
    openGraph: {
      title: t('aboutMetaTitle'),
      description: t('aboutMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
    },
    alternates: {
      languages: {
        en: '/en/about',
        es: '/es/about',
      },
    },
  }
}

export default async function AboutPage() {
  const locale = await getLocale()
  const t = await getTranslations('Public')
  const content = await getContentBlocks('about_', locale)

  const valueIcons = [
    <HeartIcon key="heart" />,
    <GlobeIcon key="globe" />,
    <BoltIcon key="bolt" />,
    <ShieldIcon key="shield" />,
    <HandRaisedIcon key="hand" />,
    <SparklesIcon key="sparkles" />,
  ]

  const valueTitles =
    locale === 'en'
      ? ['Love & Passion', 'Accessibility', 'Discipline', 'Respect', 'Social Commitment', 'Integrity']
      : ['Amor y Pasion', 'Accesibilidad', 'Disciplina', 'Respeto', 'Compromiso Social', 'Integridad']

  const valueDescriptions =
    locale === 'en'
      ? [
          'We play because we love the game. Passion drives everything we do.',
          'Pickleball is for everyone. We break down barriers so anyone can play.',
          'Consistent effort leads to consistent results. We push each other to improve.',
          'On and off the court, we treat every player with respect and sportsmanship.',
          'We give back to our community through events, outreach, and inclusion.',
          'We play fair, communicate honestly, and uphold the spirit of the game.',
        ]
      : [
          'Jugamos porque amamos el juego. La pasion impulsa todo lo que hacemos.',
          'El pickleball es para todos. Eliminamos barreras para que cualquiera pueda jugar.',
          'El esfuerzo constante lleva a resultados constantes. Nos empujamos a mejorar.',
          'Dentro y fuera de la cancha, tratamos a cada jugador con respeto y deportivismo.',
          'Retribuimos a nuestra comunidad a traves de eventos, alcance e inclusion.',
          'Jugamos limpio, nos comunicamos con honestidad y mantenemos el espiritu del juego.',
        ]

  const values = valueTitles.map((title, i) => ({
    icon: valueIcons[i],
    title,
    description: valueDescriptions[i],
  }))

  return (
    <main className="min-h-screen bg-midnight">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-32 px-6 text-center overflow-hidden">
        <SubpageHeroAccents />
        <FloatingParticles count={12} />

        <HeroEntrance className="relative z-10 flex flex-col items-center">
          <h1 className="font-bebas-neue text-[clamp(3rem,10vw,7rem)] leading-none tracking-widest gradient-text mb-4 inline-block">
            {locale === 'en' ? 'About Us' : 'Nosotros'}
          </h1>
          <p className="font-bebas-neue text-[clamp(1.2rem,4vw,2rem)] gradient-text-static tracking-[0.2em] uppercase mb-4 inline-block">
            NELL Pickleball Club
          </p>
          <p className="text-offwhite/70 text-base sm:text-lg max-w-xl leading-relaxed">
            {locale === 'en'
              ? "The Dominican Republic's premier pickleball destination in Bavaro."
              : 'El destino de pickleball mas exclusivo de la Republica Dominicana en Bavaro.'}
          </p>
        </HeroEntrance>
      </section>

      {/* Vision */}
      {content.about_vision && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="font-bebas-neue text-4xl sm:text-5xl gradient-text tracking-widest mb-6 text-center inline-block w-full">
                {locale === 'en' ? 'Our Vision' : 'Nuestra Vision'}
              </h2>
              <div
                className="text-offwhite/70 text-base sm:text-lg leading-relaxed text-center prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content.about_vision }}
              />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Mission */}
      {content.about_mission && (
        <section className="py-20 px-6 bg-charcoal/30">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="font-bebas-neue text-4xl sm:text-5xl gradient-text tracking-widest mb-6 text-center inline-block w-full">
                {locale === 'en' ? 'Our Mission' : 'Nuestra Mision'}
              </h2>
              <div
                className="text-offwhite/70 text-base sm:text-lg leading-relaxed text-center prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content.about_mission }}
              />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Values */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="font-bebas-neue text-4xl sm:text-5xl gradient-text tracking-widest mb-16 text-center inline-block w-full">
              {locale === 'en' ? 'Our Values' : 'Nuestros Valores'}
            </h2>
          </ScrollReveal>
          <ValueTimeline values={values} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-charcoal/30">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
            <h2 className="font-bebas-neue text-4xl sm:text-5xl gradient-text tracking-widest mb-6 inline-block">
              {locale === 'en' ? 'Ready to Join?' : 'Listo para Unirte?'}
            </h2>
            <p className="text-offwhite/70 text-base sm:text-lg mb-8">
              {locale === 'en'
                ? 'Explore our membership plans and start playing today.'
                : 'Explora nuestros planes de membresia y empieza a jugar hoy.'}
            </p>
            <GlowButton href="/pricing" variant="lime">
              {locale === 'en' ? 'View Plans' : 'Ver Planes'}
            </GlowButton>
          </div>
        </ScrollReveal>
      </section>
    </main>
  )
}
