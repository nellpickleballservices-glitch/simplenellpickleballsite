import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',   // /dashboard (es default), /en/dashboard (en)
  localeCookie: {
    maxAge: undefined,          // Session cookie — GDPR-compliant default in next-intl 4
  },
})
