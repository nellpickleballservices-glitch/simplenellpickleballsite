'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/effects/GlowCard'
import { PackageModal } from './PackageModal'
import { ScrollReveal } from '@/components/motion/ScrollReveal'

interface PriceRow {
  label: { en: string; es: string }
  price: string
  unit: string
}

interface PackageCategory {
  key: string
  icon: React.ReactNode
  title: { en: string; es: string }
  subtitle: { en: string; es: string }
  accentColor: string
  accentVar: string
  rows: PriceRow[]
}

interface TournamentCategory {
  key: string
  title: { en: string; es: string }
  accentColor: string
  accentVar: string
  rows: PriceRow[]
}

const packages: PackageCategory[] = [
  {
    key: 'tourists',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-turquoise" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.132a1.125 1.125 0 01-1.698-.09l-.556-.742a.75.75 0 01.138-1.024l.88-.704a1.125 1.125 0 00.26-1.43l-1.009-1.735c-.206-.354-.6-.463-.94-.332l-.398.152a1.125 1.125 0 01-1.152-.152l-.2-.164z" clipRule="evenodd" />
      </svg>
    ),
    title: { en: 'Tourists', es: 'Turistas' },
    subtitle: { en: '1.5 hours per lesson or game', es: '1 hora y media por lecciones o juegos' },
    accentColor: 'var(--color-turquoise)',
    accentVar: 'turquoise',
    rows: [
      { label: { en: 'Private Lesson', es: 'Lección Individual' }, price: '$25', unit: 'USD' },
      { label: { en: 'Group (2–4 people)', es: 'Grupo (2–4 personas)' }, price: '$20', unit: 'USD' },
      { label: { en: 'Academy (1 hour)', es: 'Academia (1 hora)' }, price: '$18', unit: 'USD/person' },
    ],
  },
  {
    key: 'locals',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-lime" aria-hidden="true">
        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
    title: { en: 'Locals', es: 'Locales' },
    subtitle: { en: '1.5 hours per lesson or game', es: '1 hora y media por lecciones o juegos' },
    accentColor: 'var(--color-lime)',
    accentVar: 'lime',
    rows: [
      { label: { en: 'Private Lesson (1 hour)', es: 'Lección Privada (1 hora)' }, price: '$750', unit: 'DOP' },
      { label: { en: 'Group (2–4 people)', es: 'Grupo (2–4 personas)' }, price: '$600', unit: 'DOP' },
    ],
  },
  {
    key: 'churches',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-sunset" aria-hidden="true">
        <path d="M11.584 2.376a.75.75 0 01.832 0l9 6a.75.75 0 11-.832 1.248L12 3.901 3.416 9.624a.75.75 0 01-.832-1.248l9-6z" />
        <path fillRule="evenodd" d="M20.25 10.332v9.918H21a.75.75 0 010 1.5H3a.75.75 0 010-1.5h.75v-9.918a.75.75 0 01.634-.74A49.109 49.109 0 0112 9c2.59 0 5.134.202 7.616.592a.75.75 0 01.634.74zm-7.5 2.418a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75zm3-.75a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0v-6.75a.75.75 0 01.75-.75zM9 12.75a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75z" clipRule="evenodd" />
      </svg>
    ),
    title: { en: 'Churches & Schools', es: 'Iglesias y Centros Educativos' },
    subtitle: { en: '1 hour per lesson or game', es: '1 hora por lecciones o juegos' },
    accentColor: 'var(--color-sunset)',
    accentVar: 'sunset',
    rows: [
      { label: { en: 'Group (2–4 people)', es: 'Grupo (2–4 personas)' }, price: '$500', unit: 'DOP' },
    ],
  },
]

const tournaments: TournamentCategory[] = [
  {
    key: 'tournament-tourists',
    title: { en: 'Tourists', es: 'Turistas' },
    accentColor: 'var(--color-turquoise)',
    accentVar: 'turquoise',
    rows: [
      { label: { en: 'Team of 2', es: 'Equipo de 2' }, price: '$50', unit: 'USD' },
      { label: { en: 'Team of 4', es: 'Equipo de 4' }, price: '$40', unit: 'USD' },
    ],
  },
  {
    key: 'tournament-locals',
    title: { en: 'Locals', es: 'Locales' },
    accentColor: 'var(--color-lime)',
    accentVar: 'lime',
    rows: [
      { label: { en: 'Team of 2', es: 'Equipo de 2' }, price: '$1,500', unit: 'DOP' },
      { label: { en: 'Team of 4', es: 'Equipo de 4' }, price: '$1,200', unit: 'DOP' },
    ],
  },
  {
    key: 'tournament-churches',
    title: { en: 'Churches & Schools', es: 'Iglesias y Centros Educativos' },
    accentColor: 'var(--color-sunset)',
    accentVar: 'sunset',
    rows: [
      { label: { en: 'Team of 2', es: 'Equipo de 2' }, price: '$1,300', unit: 'DOP' },
      { label: { en: 'Team of 4', es: 'Equipo de 4' }, price: '$1,000', unit: 'DOP' },
    ],
  },
]

function PriceRows({ rows, locale, accentVar }: { rows: PriceRow[]; locale: string; accentVar: string }) {
  return (
    <div className="space-y-4">
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1
        const unitDisplay = row.unit
          .replace('/person', locale === 'en' ? '/person' : '/persona')
          .replace('/mo', locale === 'en' ? '/mo' : '/mes')
        return (
          <div key={i} className={`flex justify-between items-baseline ${!isLast ? 'border-b border-offwhite/10 pb-3' : 'pt-2'}`}>
            <span className="text-white text-sm">{row.label[locale as 'en' | 'es']}</span>
            <span className={`font-bebas-neue text-2xl text-${accentVar}`}>
              {row.price} <span className="text-sm text-white/80">{unitDisplay}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function WhatsAppCta({ locale }: { locale: string }) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ''
  const message =
    locale === 'en'
      ? "Hello, I'd like to make a reservation at NELL Pickleball Club"
      : 'Hola, me gustaría hacer una reservación en NELL Pickleball Club'

  return (
    <div className="mt-16 text-center">
      <a
        href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 text-green-400 hover:text-green-300 transition-colors group"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="font-bebas-neue text-xl sm:text-2xl tracking-wide">
          {locale === 'en' ? 'Contact us to make your reservations!' : '¡Contáctanos para hacer tus reservaciones!'}
        </span>
      </a>
    </div>
  )
}

function ModalWhatsAppCta({ locale }: { locale: string }) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ''
  const displayPhone = phone ? `+${phone.slice(0, 1)} (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}` : ''
  const message =
    locale === 'en'
      ? "Hello, I'd like to make a reservation at NELL Pickleball Club"
      : 'Hola, me gustaría hacer una reservación en NELL Pickleball Club'

  return (
    <div className="mt-6 pt-5 border-t border-offwhite/10 space-y-4">
      {/* Scheduling instructions */}
      <div className="text-center space-y-1">
        <p className="text-white/90 text-sm font-medium">
          {locale === 'en'
            ? 'Ready to play? Make your reservation by contacting us:'
            : 'Listo para jugar? Haz tu reservación contactándonos:'}
        </p>
      </div>

      {/* Phone number */}
      {phone && (
        <a
          href={`tel:+${phone}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-offwhite/15 hover:border-offwhite/30 transition-colors text-white/90 hover:text-white text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
          </svg>
          {displayPhone}
        </a>
      )}

      {/* WhatsApp button */}
      <a
        href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 transition-colors text-white font-semibold text-sm"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {locale === 'en' ? 'Book via WhatsApp' : 'Reservar por WhatsApp'}
      </a>
    </div>
  )
}

export function PackagesSection({ locale }: { locale: string }) {
  const [selected, setSelected] = useState<{ type: 'package' | 'tournament'; key: string } | null>(null)

  const selectedPkg = selected?.type === 'package' ? packages.find((p) => p.key === selected.key) : null
  const selectedTournament = selected?.type === 'tournament' ? tournaments.find((t) => t.key === selected.key) : null

  return (
    <ScrollReveal>
      <section id="packages" className="py-28 sm:py-32 px-6 sm:px-10 bg-midnight">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-bebas-neue text-5xl sm:text-6xl lg:text-7xl gradient-text tracking-widest mb-4 inline-block py-1 leading-tight">
              {locale === 'en' ? 'Packages & Pricing' : 'Paquetes y Precios'}
            </h2>
            <p className="text-white text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              {locale === 'en'
                ? 'Towels and water included with all packages. Paddle rentals available: $5 USD for tourists, $250 DOP for locals.'
                : 'Toallas y agua incluidas con todos los paquetes. Raquetas en renta: $5 USD para turistas, $250 pesos para locales.'}
            </p>
          </div>

          {/* Main package cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <button key={pkg.key} onClick={() => setSelected({ type: 'package', key: pkg.key })} className="text-left">
                <GlowCard accentColor={pkg.accentColor}>
                  <div className="bg-charcoal border border-charcoal rounded-2xl p-8 flex flex-col gap-5 h-full">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-midnight border border-${pkg.accentVar}/20`}>
                        {pkg.icon}
                      </div>
                      <h3 className="font-bebas-neue text-3xl text-offwhite tracking-wide">
                        {pkg.title[locale as 'en' | 'es']}
                      </h3>
                    </div>
                    <p className="text-white text-xs uppercase tracking-widest">
                      {pkg.subtitle[locale as 'en' | 'es']}
                    </p>
                    <div className="mt-auto pt-4 border-t border-offwhite/10 flex items-center justify-between">
                      <span className={`text-${pkg.accentVar} text-xs uppercase tracking-widest font-medium`}>
                        {locale === 'en' ? 'Tap for details' : 'Toca para ver detalles'}
                      </span>
                      <svg className={`w-5 h-5 text-${pkg.accentVar}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </GlowCard>
              </button>
            ))}
          </div>

          {/* Tournaments */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="font-bebas-neue text-4xl sm:text-5xl text-offwhite tracking-widest mb-3">
                {locale === 'en' ? 'Tournaments' : 'Torneos'}
              </h3>
              <p className="text-white/80 text-sm uppercase tracking-widest">
                {locale === 'en' ? 'Per person pricing' : 'Precio por persona'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {tournaments.map((t) => (
                <button key={t.key} onClick={() => setSelected({ type: 'tournament', key: t.key })} className="text-left">
                  <GlowCard accentColor={t.accentColor}>
                    <div className="bg-charcoal border border-charcoal rounded-2xl p-8 flex flex-col gap-5 h-full">
                      <h4 className={`font-bebas-neue text-2xl text-${t.accentVar} tracking-wide`}>
                        {t.title[locale as 'en' | 'es']}
                      </h4>
                      <div className="mt-auto pt-4 border-t border-offwhite/10 flex items-center justify-between">
                        <span className={`text-${t.accentVar} text-xs uppercase tracking-widest font-medium`}>
                          {locale === 'en' ? 'Tap for details' : 'Toca para ver detalles'}
                        </span>
                        <svg className={`w-5 h-5 text-${t.accentVar}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                  </GlowCard>
                </button>
              ))}
            </div>
          </div>

          <WhatsAppCta locale={locale} />
        </div>

        {/* Package detail modal */}
        {selectedPkg && (
          <PackageModal
            open
            onClose={() => setSelected(null)}
            title={selectedPkg.title[locale as 'en' | 'es']}
            subtitle={selectedPkg.subtitle[locale as 'en' | 'es']}
            accentColor={selectedPkg.accentColor}
          >
            <PriceRows rows={selectedPkg.rows} locale={locale} accentVar={selectedPkg.accentVar} />
            <ModalWhatsAppCta locale={locale} />
          </PackageModal>
        )}

        {/* Tournament detail modal */}
        {selectedTournament && (
          <PackageModal
            open
            onClose={() => setSelected(null)}
            title={selectedTournament.title[locale as 'en' | 'es']}
            subtitle={locale === 'en' ? 'Per person pricing' : 'Precio por persona'}
            accentColor={selectedTournament.accentColor}
          >
            <PriceRows rows={selectedTournament.rows} locale={locale} accentVar={selectedTournament.accentVar} />
            <ModalWhatsAppCta locale={locale} />
          </PackageModal>
        )}
      </section>
    </ScrollReveal>
  )
}
