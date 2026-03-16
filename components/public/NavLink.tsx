'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import type { ReactNode, MouseEvent } from 'react'

interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export function NavLink({ href, children, className = '' }: NavLinkProps) {
  const pathname = usePathname()
  const pathWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '/'

  const [hashPart, setHashPart] = useState('')
  const hrefPath = href.split('#')[0] || '/'
  const hrefHash = href.includes('#') ? href.split('#')[1] : null

  // Track hash changes for anchor-based active state
  useEffect(() => {
    const update = () => setHashPart(window.location.hash.replace('#', ''))
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  // For hash links: active only when on the right page AND the hash matches
  // For regular links: active when the path matches (and no hash in href)
  const isActive = hrefHash
    ? pathWithoutLocale === hrefPath && hashPart === hrefHash
    : pathWithoutLocale === href

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (!hrefHash) return
      // If already on the target page, smooth-scroll to the anchor
      if (pathWithoutLocale === hrefPath) {
        e.preventDefault()
        const el = document.getElementById(hrefHash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
          window.history.replaceState(null, '', `#${hrefHash}`)
          setHashPart(hrefHash)
        }
      }
    },
    [hrefHash, hrefPath, pathWithoutLocale],
  )

  return (
    <Link
      href={href}
      onClick={handleClick}
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
