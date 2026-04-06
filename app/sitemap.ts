import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'

  const publicPaths = [
    '',
    '/learn-pickleball',
    '/events',
    '/gallery',
    '/contact',
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const path of publicPaths) {
    entries.push({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 1.0 : 0.8,
      alternates: {
        languages: {
          es: `${siteUrl}${path}`,
          en: `${siteUrl}/en${path}`,
        },
      },
    })
  }

  // Login and signup pages (lower priority)
  for (const authPath of ['/login', '/signup']) {
    entries.push({
      url: `${siteUrl}${authPath}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          es: `${siteUrl}${authPath}`,
          en: `${siteUrl}/en${authPath}`,
        },
      },
    })
  }

  return entries
}
