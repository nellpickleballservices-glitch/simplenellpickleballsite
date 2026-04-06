import { getLocale, getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { SubpageHeroAccents } from '@/components/effects/SubpageHeroAccents'
import { FloatingParticles } from '@/components/effects/FloatingParticles'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { GalleryGrid } from '@/components/public/GalleryGrid'
import type { GalleryItem } from '@/lib/types/admin'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')
  return {
    title: t('galleryMetaTitle'),
    description: t('galleryMetaDescription'),
    openGraph: {
      title: t('galleryMetaTitle'),
      description: t('galleryMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
      images: [{ url: '/images/siteImages/players_in_action.jpeg', width: 1200, height: 630, alt: 'NELL Pickleball Club' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('galleryMetaTitle'),
      description: t('galleryMetaDescription'),
      images: ['/images/siteImages/players_in_action.jpeg'],
    },
    alternates: {
      canonical: `/${locale}/gallery`,
      languages: {
        en: '/en/gallery',
        es: '/es/gallery',
      },
    },
  }
}

export default async function GalleryPage() {
  const locale = await getLocale()
  const t = await getTranslations('Gallery')

  const { data } = await supabaseAdmin
    .from('gallery_items')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const items = (data ?? []) as GalleryItem[]

  return (
    <main className="min-h-screen bg-midnight">
      {/* Hero — sticky so gallery scrolls over it */}
      <div className="sticky top-0 z-0">
        <section className="relative overflow-hidden py-24 md:py-32">
          <SubpageHeroAccents />
          <FloatingParticles />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <HeroEntrance>
              <h1 className="font-bungee text-4xl md:text-6xl text-lime tracking-widest">
                {t('pageTitle')}
              </h1>
              <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                {t('subtitle')}
              </p>
            </HeroEntrance>
          </div>
        </section>
      </div>

      {/* Gallery grid — scrolls over the hero */}
      <section className="relative z-10 bg-midnight rounded-t-3xl min-h-screen w-full px-4 md:px-6 pt-12 md:pt-16 pb-32 -mt-4">
        <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          {items.length === 0 ? (
            <p className="text-white/70 text-center py-20 text-lg">{t('noItems')}</p>
          ) : (
            <GalleryGrid items={items} locale={locale} />
          )}
        </ScrollReveal>
        </div>
      </section>
    </main>
  )
}
