'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

const navItems = [
  { key: 'dashboard', href: '/admin', icon: '\u2302' },        // ⌂
  { key: 'users', href: '/admin/users', icon: '\u2603' },       // Use simple text
  { key: 'courts', href: '/admin/courts', icon: '\u25A6' },     // ▦
  { key: 'reservations', href: '/admin/reservations', icon: '\u2637' }, // ☷
  { key: 'events', href: '/admin/events', icon: '\u2605' },     // ★
  { key: 'cms', href: '/admin/cms', icon: '\u270E' },           // ✎
  { key: 'stripe', href: '/admin/stripe', icon: '\u2B21' },     // ⬡
]

export function AdminSidebar({ locale }: { locale: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const t = useTranslations('Admin')

  const isActive = (href: string) => {
    // Strip locale prefix for comparison
    const cleanPath = pathname.replace(`/${locale}`, '') || '/'
    if (href === '/admin') {
      return cleanPath === '/admin' || cleanPath === '/admin/'
    }
    return cleanPath.startsWith(href)
  }

  const navContent = (
    <nav className="flex flex-col gap-1 mt-8">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.key}
            href={`/${locale}${item.href}`}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active
                ? 'border-l-4 border-lime text-lime bg-lime/5'
                : 'border-l-4 border-transparent text-offwhite/70 hover:text-offwhite hover:bg-white/5'
            }`}
          >
            <span className="text-lg w-6 text-center">{item.icon}</span>
            <span>{t(item.key)}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-midnight text-offwhite p-2 rounded-lg"
        aria-label="Open admin menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-midnight z-50 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="px-6 pt-6 pb-2">
          <Link href={`/${locale}/admin`} className="font-bungee text-3xl text-lime tracking-widest">
            NELL
          </Link>
          <p className="text-offwhite/50 text-xs mt-1">Admin Panel</p>
        </div>

        {navContent}
      </aside>
    </>
  )
}
