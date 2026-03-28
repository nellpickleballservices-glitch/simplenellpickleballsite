'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('Nav')

  const targetLocale = locale === 'en' ? 'es' : 'en'

  const handleToggle = () => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .update({ locale_pref: targetLocale })
          .eq('id', user.id)
      }
    })
    router.replace(pathname, { locale: targetLocale })
  }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 text-offwhite hover:text-lime transition-colors"
      aria-label={t('languageSwitcher')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <span className="text-sm font-medium">{targetLocale.toUpperCase()}</span>
    </button>
  )
}
