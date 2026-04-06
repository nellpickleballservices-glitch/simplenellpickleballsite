import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/n3ll-admin-x9k2/',
          '/dashboard/',
          '/r3s-x7m1/',
          '/chk-s8p2/',
          '/auth/',
          '/api/',
          '/signup/complete-profile',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
