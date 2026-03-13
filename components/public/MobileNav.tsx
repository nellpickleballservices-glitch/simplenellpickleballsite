'use client'

import { useState, useEffect, useRef } from 'react'
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
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const close = () => setOpen(false)

  const publicLinks = [
    { href: '/about', label: t('about') },
    { href: '/learn-pickleball', label: t('learn') },
    { href: '/events', label: t('events') },
    { href: '/contact', label: t('contact') },
    { href: '/pricing', label: tBilling('pricingNav') },
  ]

  return (
    <div className="md:hidden relative">
      {/* Hamburger / X toggle button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex flex-col justify-center items-center w-8 h-8 gap-1.5"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-offwhite">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <span className="w-6 h-0.5 bg-offwhite rounded-full" />
            <span className="w-6 h-0.5 bg-offwhite rounded-full" />
            <span className="w-6 h-0.5 bg-offwhite rounded-full" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            ref={menuRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 w-64 bg-midnight border border-charcoal rounded-b-lg shadow-xl"
          >
            {/* Nav links */}
            <nav className="flex flex-col py-2">
              {publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="px-4 py-2.5 text-offwhite hover:text-lime hover:bg-charcoal/50 transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}

              {user && (
                <>
                  <Link
                    href="/reservations"
                    onClick={close}
                    className="px-4 py-2.5 text-offwhite hover:text-lime hover:bg-charcoal/50 transition-colors text-sm"
                  >
                    {tReservations('navLink')}
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className="px-4 py-2.5 text-offwhite hover:text-lime hover:bg-charcoal/50 transition-colors text-sm"
                  >
                    {firstName ?? t('dashboard')}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={close}
                      className="px-4 py-2.5 text-offwhite hover:text-lime hover:bg-charcoal/50 transition-colors text-sm"
                    >
                      {tAdmin('adminNav')}
                    </Link>
                  )}
                </>
              )}
            </nav>

            {/* Language switcher + auth */}
            <div className="border-t border-charcoal/50 px-4 py-3 flex flex-col gap-2">
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>

              {!user && (
                <div className="flex flex-col gap-2 mt-1">
                  <Link
                    href="/login"
                    onClick={close}
                    className="text-center py-2 text-offwhite text-sm border border-offwhite/30 rounded-full hover:border-lime hover:text-lime transition-colors"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={close}
                    className="text-center py-2 bg-lime text-midnight text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
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
                    className="w-full text-center py-2 text-offwhite text-sm border border-offwhite/30 rounded-full hover:border-sunset hover:text-sunset transition-colors"
                  >
                    {t('logout')}
                  </button>
                </form>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
