import { getLocale, getTranslations } from 'next-intl/server'
import { getContentBlock } from '@/lib/content'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { GlowCard } from '@/components/effects/GlowCard'
import { FloatingParticles } from '@/components/effects/FloatingParticles'
import { SubpageHeroAccents } from '@/components/effects/SubpageHeroAccents'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')

  return {
    title: t('contactMetaTitle'),
    description: t('contactMetaDescription'),
    openGraph: {
      title: t('contactMetaTitle'),
      description: t('contactMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
      images: [{ url: '/images/siteImages/players_in_action.jpeg', width: 1200, height: 630, alt: 'NELL Pickleball Club' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('contactMetaTitle'),
      description: t('contactMetaDescription'),
      images: ['/images/siteImages/players_in_action.jpeg'],
    },
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        en: '/en/contact',
        es: '/es/contact',
      },
    },
  }
}

export default async function ContactPage() {
  const locale = await getLocale()
  const t = await getTranslations('Contact')

  // Fetch social links from CMS, with hardcoded fallbacks
  let socialLinks: { instagram?: string; facebook?: string; tiktok?: string } = {
    instagram: 'https://www.instagram.com/nellpickleballclub/',
    facebook: 'https://www.facebook.com/nell.pickleball.club',
    tiktok: 'https://www.tiktok.com/@nell.pickleball.c',
  }
  const rawSocial = await getContentBlock('footer_social_links', locale)
  if (rawSocial) {
    try {
      socialLinks = { ...socialLinks, ...JSON.parse(rawSocial) }
    } catch {
      // fallback to defaults
    }
  }

  // Fetch hours from CMS, fallback to translation
  const hoursFromCms = await getContentBlock('contact_hours', locale)

  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ''
  const whatsappGreeting =
    locale === 'en'
      ? 'Hello, I have a question about NELL Pickleball Club'
      : 'Hola, tengo una pregunta sobre NELL Pickleball Club'

  return (
    <main className="min-h-screen bg-midnight">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-32 px-6 text-center overflow-hidden">
        <SubpageHeroAccents />
        <FloatingParticles count={12} />

        <HeroEntrance className="relative z-10 flex flex-col items-center">
          <h1 className="font-bebas-neue text-[clamp(3rem,10vw,7rem)] leading-none tracking-widest gradient-text mb-4 inline-block">
            {t('pageTitle')}
          </h1>
          <p className="text-white text-base sm:text-lg max-w-xl leading-relaxed">
            {t('subtitle')}
          </p>
        </HeroEntrance>
      </section>

      {/* WhatsApp CTA */}
      <section className="py-16 px-6">
        <ScrollReveal>
          <div className="max-w-lg mx-auto text-center">
            <GlowCard accentColor="#22c55e">
              <div className="bg-charcoal border border-charcoal rounded-2xl p-8 flex flex-col items-center gap-6">
                {/* WhatsApp icon */}
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>

                <h2 className="font-bebas-neue text-3xl text-offwhite tracking-widest">
                  {t('whatsappCta')}
                </h2>
                <p className="text-white text-sm">
                  {t('whatsappDescription')}
                </p>

                {whatsappPhone && (
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappGreeting)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-500 text-white font-bold rounded-full py-4 px-10 text-lg tracking-wide hover:bg-green-600 hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/20"
                  >
                    {t('whatsappCta')}
                  </a>
                )}
              </div>
            </GlowCard>
          </div>
        </ScrollReveal>
      </section>

      {/* Contact info */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Phone */}
          <ScrollReveal delay={0.1}>
            <GlowCard accentColor="var(--color-turquoise)">
              <div className="bg-charcoal border border-charcoal rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-midnight rounded-xl border border-turquoise/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-turquoise">
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bebas-neue text-xl text-offwhite tracking-wider mb-2">
                  {t('phoneLabel')}
                </h3>
                {whatsappPhone && (
                  <p className="text-white text-sm">+{whatsappPhone}</p>
                )}
              </div>
            </GlowCard>
          </ScrollReveal>

          {/* Email */}
          <ScrollReveal delay={0.2}>
            <GlowCard accentColor="var(--color-lime)">
              <div className="bg-charcoal border border-charcoal rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-midnight rounded-xl border border-lime/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-lime">
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                  </svg>
                </div>
                <h3 className="font-bebas-neue text-xl text-offwhite tracking-wider mb-2">
                  {t('emailLabel')}
                </h3>
                <a
                  href="mailto:nellpickleballclub@gmail.com"
                  className="text-turquoise text-sm hover:text-lime transition-colors"
                >
                  nellpickleballclub@gmail.com
                </a>
              </div>
            </GlowCard>
          </ScrollReveal>
        </div>
      </section>

      {/* Social */}
      {(socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok) && (
        <section className="py-16 px-6">
          <ScrollReveal delay={0.3}>
            <div className="max-w-lg mx-auto text-center">
              <h2 className="font-bebas-neue text-3xl gradient-text tracking-widest mb-6 inline-block">
                {t('socialLabel')}
              </h2>
              <div className="flex items-center justify-center gap-6">
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-14 h-14 bg-charcoal border border-charcoal rounded-full flex items-center justify-center text-turquoise hover:text-lime hover:border-lime/30 hover:scale-110 transition-all"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                )}
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-14 h-14 bg-charcoal border border-charcoal rounded-full flex items-center justify-center text-turquoise hover:text-lime hover:border-lime/30 hover:scale-110 transition-all"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                )}
                {socialLinks.tiktok && (
                  <a
                    href={socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-14 h-14 bg-charcoal border border-charcoal rounded-full flex items-center justify-center text-turquoise hover:text-lime hover:border-lime/30 hover:scale-110 transition-all"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* Hours — hidden until client confirms usage */}
      <section className="hidden py-16 px-6 bg-charcoal/30">
        <ScrollReveal>
          <div className="max-w-lg mx-auto text-center">
            <h2 className="font-bebas-neue text-3xl gradient-text tracking-widest mb-4 inline-block">
              {t('hoursTitle')}
            </h2>
            <p className="text-white text-base">
              {hoursFromCms ?? t('hoursDescription')}
            </p>
          </div>
        </ScrollReveal>
      </section>
    </main>
  )
}
