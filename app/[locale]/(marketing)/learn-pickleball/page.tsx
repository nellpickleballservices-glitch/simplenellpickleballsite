import { getLocale, getTranslations } from 'next-intl/server'
import { getContentBlocks } from '@/lib/content'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { TableOfContents } from '@/components/public/TableOfContents'
import { CourtDiagram } from '@/components/public/CourtDiagram'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')

  return {
    title: t('learnMetaTitle'),
    description: t('learnMetaDescription'),
    openGraph: {
      title: t('learnMetaTitle'),
      description: t('learnMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
    },
    alternates: {
      languages: {
        en: '/en/learn-pickleball',
        es: '/es/learn-pickleball',
      },
    },
  }
}

export default async function LearnPickleballPage() {
  const locale = await getLocale()
  const content = await getContentBlocks('learn_', locale)

  const sections = [
    {
      id: 'origin',
      label: locale === 'en' ? 'Origin' : 'Origen',
      key: 'learn_origin',
    },
    {
      id: 'rules',
      label: locale === 'en' ? 'Rules' : 'Reglas',
      key: 'learn_rules',
    },
    {
      id: 'scoring',
      label: locale === 'en' ? 'Scoring' : 'Puntuacion',
      key: 'learn_scoring',
    },
    {
      id: 'court',
      label: locale === 'en' ? 'Court Dimensions' : 'Dimensiones de la Cancha',
      key: 'learn_court_dimensions',
    },
    {
      id: 'equipment',
      label: locale === 'en' ? 'Equipment' : 'Equipamiento',
      key: 'learn_equipment',
    },
  ]

  const tocSections = sections.map((s) => ({ id: s.id, label: s.label }))

  return (
    <main className="min-h-screen bg-midnight">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-32 px-6 text-center overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-lime opacity-[0.06]" />
          <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full bg-turquoise opacity-[0.07]" />
        </div>

        <HeroEntrance className="relative z-10 flex flex-col items-center">
          <h1 className="font-bebas-neue text-[clamp(3rem,10vw,7rem)] leading-none tracking-widest text-offwhite mb-4">
            {locale === 'en' ? 'Learn Pickleball' : 'Aprende Pickleball'}
          </h1>
          <p className="text-offwhite/70 text-base sm:text-lg max-w-xl leading-relaxed">
            {locale === 'en'
              ? 'Everything you need to know about the fastest-growing sport in the world.'
              : 'Todo lo que necesitas saber sobre el deporte de mas rapido crecimiento en el mundo.'}
          </p>
        </HeroEntrance>
      </section>

      {/* Content with TOC */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto flex gap-8">
          {/* Sticky TOC (desktop sidebar) */}
          <TableOfContents sections={tocSections} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile TOC rendered inline by TableOfContents */}

            {sections.map((section) => (
              <div key={section.id} id={section.id} className="mb-16 scroll-mt-24">
                <ScrollReveal>
                  <h2 className="font-bebas-neue text-4xl sm:text-5xl text-offwhite tracking-widest mb-6">
                    <span className="text-lime">|</span> {section.label}
                  </h2>

                  {section.key === 'learn_court_dimensions' && (
                    <div className="mb-8">
                      <CourtDiagram locale={locale} />
                    </div>
                  )}

                  {content[section.key] ? (
                    <div
                      className="text-offwhite/70 text-base leading-relaxed prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: content[section.key] }}
                    />
                  ) : (
                    <p className="text-offwhite/50 text-base italic">
                      {locale === 'en'
                        ? 'Content coming soon...'
                        : 'Contenido proximamente...'}
                    </p>
                  )}
                </ScrollReveal>
              </div>
            ))}

            {/* Bottom CTA */}
            <ScrollReveal>
              <div className="mt-8 text-center">
                <p className="text-offwhite/70 text-base mb-6">
                  {locale === 'en'
                    ? 'Ready to play? Join NELL Pickleball Club today.'
                    : 'Listo para jugar? Unete a NELL Pickleball Club hoy.'}
                </p>
                <Link
                  href="/pricing"
                  className="inline-block bg-lime text-midnight font-bold rounded-full py-3 px-10 text-base tracking-wide hover:bg-sunset hover:text-offwhite hover:scale-105 transition-all duration-200 shadow-lg shadow-lime/20"
                >
                  {locale === 'en' ? 'View Plans' : 'Ver Planes'}
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  )
}
