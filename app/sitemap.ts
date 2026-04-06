import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'

  const locales = ['en', 'es']
  const publicPaths = [
    '',
    '/learn-pickleball',
    '/events',
    '/gallery',
    '/contact',
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const path of publicPaths) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 1.0 : 0.8,
        alternates: {
          languages: {
            en: `${siteUrl}/en${path}`,
            es: `${siteUrl}/es${path}`,
          },
        },
      })
    }
  }

  return entries
}
