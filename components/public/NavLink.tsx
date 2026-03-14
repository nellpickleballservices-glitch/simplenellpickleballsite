'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export function NavLink({ href, children, className = '' }: NavLinkProps) {
  const pathname = usePathname()
  // Strip locale prefix (e.g. /en/about -> /about) for matching
  const pathWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '/'
  const isActive = pathWithoutLocale === href

  return (
    <Link
      href={href}
      className={`font-bungee text-sm transition-colors ${
        isActive
          ? 'text-lime'
          : 'text-offwhite hover:text-lime'
      } ${className}`}
    >
      {children}
    </Link>
  )
}
