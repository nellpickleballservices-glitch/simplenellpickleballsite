'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AnimatePresence, m } from 'motion/react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { logoutAction } from '@/app/actions/auth'
import type { User } from '@supabase/supabase-js'

interface MobileNavProps {
  user: User | null
  firstName: string | null
  isAdmin: boolean
}

export function MobileNav({ user, firstName, isAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('Nav')
  const tBilling = useTranslations('Billing')
  const tReservations = useTranslations('Reservations')
  const tAdmin = useTranslations('Admin')

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const close = () => setOpen(false)

  const publicLinks = [
    { href: '/about', label: t('about') },
    { href: '/learn', label: t('learn') },
    { href: '/events', label: t('events') },
    { href: '/contact', label: t('contact') },
    { href: '/pricing', label: tBilling('pricingNav') },
  ]

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
        aria-label="Open menu"
      >
        <span className="w-6 h-0.5 bg-offwhite rounded-full" />
        <span className="w-6 h-0.5 bg-offwhite rounded-full" />
        <span className="w-6 h-0.5 bg-offwhite rounded-full" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={close}
            />

            {/* Panel */}
            <m.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="fixed top-0 right-0 z-50 h-full w-72 bg-midnight border-l border-charcoal flex flex-col"
            >
              {/* Close button */}
              <div className="flex justify-end p-4">
                <button
                  onClick={close}
                  className="text-offwhite hover:text-lime transition-colors"
                  aria-label="Close menu"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col px-6 gap-1">
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="py-3 text-offwhite hover:text-lime transition-colors border-b border-charcoal/50"
                  >
                    {link.label}
                  </Link>
                ))}

                {user && (
                  <>
                    <Link
                      href="/reservations"
                      onClick={close}
                      className="py-3 text-offwhite hover:text-lime transition-colors border-b border-charcoal/50"
                    >
                      {tReservations('navLink')}
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={close}
                      className="py-3 text-offwhite hover:text-lime transition-colors border-b border-charcoal/50"
                    >
                      {firstName ?? t('dashboard')}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={close}
                        className="py-3 text-offwhite hover:text-lime transition-colors border-b border-charcoal/50"
                      >
                        {tAdmin('adminNav')}
                      </Link>
                    )}
                  </>
                )}
              </nav>

              {/* Bottom section */}
              <div className="mt-auto px-6 pb-8 flex flex-col gap-4">
                <div className="flex justify-center">
                  <LanguageSwitcher />
                </div>

                {!user && (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={close}
                      className="text-center py-2.5 text-offwhite border border-offwhite/30 rounded-full hover:border-lime hover:text-lime transition-colors"
                    >
                      {t('login')}
                    </Link>
                    <Link
                      href="/signup"
                      onClick={close}
                      className="text-center py-2.5 bg-lime text-midnight font-semibold rounded-full hover:opacity-90 transition-opacity"
                    >
                      {t('signup')}
                    </Link>
                  </div>
                )}

                {user && (
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      onClick={close}
                      className="w-full text-center py-2.5 text-offwhite border border-offwhite/30 rounded-full hover:border-sunset hover:text-sunset transition-colors"
                    >
                      {t('logout')}
                    </button>
                  </form>
                )}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
