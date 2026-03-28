'use client'

import { useTranslations } from 'next-intl'
import { SectionReveal } from '@/components/motion/SectionReveal'
import { ValueTimeline } from '@/components/public/ValueTimeline'

// Value icons
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

const valueIcons = [
  <HeartIcon key="heart" />,
  <GlobeIcon key="globe" />,
  <BoltIcon key="bolt" />,
  <ShieldIcon key="shield" />,
  <HandRaisedIcon key="hand" />,
  <SparklesIcon key="sparkles" />,
]

const valueKeys = ['Love', 'Access', 'Discipline', 'Respect', 'Community', 'Integrity'] as const

const valueImages = [
  '/images/siteImages/love&passion.png',
  '/images/siteImages/accessibility.png',
  '/images/siteImages/dicipline.png',
  '/images/siteImages/respect.png',
  '/images/siteImages/social-commitment.png',
  '/images/siteImages/integrity.png',
]

interface AboutSectionProps {
  locale: string
}

export function AboutSection({ locale }: AboutSectionProps) {
  const t = useTranslations('Public')

  const values = valueKeys.map((key, i) => ({
    icon: valueIcons[i],
    title: t(`aboutValue${key}Title`),
    description: t(`aboutValue${key}Desc`),
    image: valueImages[i],
  }))

  return (
    <div id="about">
      {/* ═══════════════ VISION — full bleed, left-aligned ═══════════════ */}
      <SectionReveal direction="left">
        <section className="relative w-full py-28 sm:py-36 overflow-hidden">
          {/* Full-width lime accent glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 -translate-y-1/2 -left-48 w-[500px] h-[500px] rounded-full bg-lime/[0.05] blur-[150px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime/10 border border-lime/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-lime">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="font-bebas-neue text-5xl sm:text-6xl lg:text-7xl tracking-widest text-white">
                  {t('aboutVisionTitle')}
                </h2>
              </div>

              <div className="w-20 h-1 rounded-full bg-gradient-to-r from-lime to-electric mb-8" />

              <p className="text-white text-lg sm:text-xl lg:text-2xl leading-relaxed font-light">
                {t('aboutVisionText')}
              </p>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ═══════════════ MISSION — full bleed, right-aligned ═══════════════ */}
      <SectionReveal direction="right">
        <section className="relative w-full py-28 sm:py-36 bg-charcoal/20 overflow-hidden">
          {/* Full-width turquoise accent glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 -translate-y-1/2 -right-48 w-[500px] h-[500px] rounded-full bg-turquoise/[0.05] blur-[150px]" />
          </div>
          {/* Bold right border stripe */}
          <div className="absolute right-0 top-[15%] bottom-[15%] w-1 bg-gradient-to-b from-turquoise/0 via-turquoise to-turquoise/0" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
            <div className="max-w-3xl ml-auto text-right">
              <div className="flex items-center justify-end gap-4 mb-8">
                <h2 className="font-bebas-neue text-5xl sm:text-6xl lg:text-7xl tracking-widest text-white">
                  {t('aboutMissionTitle')}
                </h2>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-turquoise/10 border border-turquoise/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-turquoise">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 4.505a8.25 8.25 0 1011.672 8.214l-.46-.46a2.252 2.252 0 01-.422-.586l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738.135l-.357.239a.89.89 0 01-1.093-.058l-.88-.733a.851.851 0 00-.894-.128l-1.665.665a.848.848 0 01-.762-.072l-.88-.587A.847.847 0 008.547 4.505z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="w-20 h-1 rounded-full bg-gradient-to-l from-turquoise to-turquoise/40 mb-8 ml-auto" />

              <p className="text-white text-lg sm:text-xl lg:text-2xl leading-relaxed font-light">
                {t('aboutMissionText')}
              </p>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ═══════════════ VALUES — full bleed ═══════════════ */}
      <SectionReveal direction="up">
        <section className="relative w-full py-28 sm:py-36 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-sunset/[0.03] blur-[150px]" />
          </div>

          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-bebas-neue text-5xl sm:text-6xl lg:text-7xl gradient-text tracking-widest mb-20 text-center inline-block w-full">
              {t('aboutValuesTitle')}
            </h2>
            <ValueTimeline values={values} />
          </div>
        </section>
      </SectionReveal>
    </div>
  )
}
