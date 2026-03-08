'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('Nav')
  const [open, setOpen] = useState(false)

  // Build the same pathname in the target locale
  const buildLocalePath = (targetLocale: string) => {
    if (targetLocale === 'es') {
      // Remove /en prefix if present (es = default, no prefix)
      return pathname.replace(/^\/en/, '') || '/'
    }
    // Add /en prefix for English
    return `/en${pathname.startsWith('/en') ? pathname.slice(3) : pathname}`
  }

  const saveLocalePref = async (targetLocale: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ locale_pref: targetLocale })
        .eq('id', user.id)
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-offwhite hover:text-lime transition-colors"
        aria-label={t('languageSwitcher')}
      >
        {/* Globe icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span className="text-sm font-medium">{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-24 bg-midnight border border-turquoise rounded-lg shadow-xl z-50">
          <Link
            href={buildLocalePath('es')}
            onClick={() => saveLocalePref('es')}
            className="block px-4 py-2 text-sm text-offwhite hover:bg-charcoal rounded-t-lg"
          >
            {t('es')}
          </Link>
          <Link
            href={buildLocalePath('en')}
            onClick={() => saveLocalePref('en')}
            className="block px-4 py-2 text-sm text-offwhite hover:bg-charcoal rounded-b-lg"
          >
            {t('en')}
          </Link>
        </div>
      )}
    </div>
  )
}
