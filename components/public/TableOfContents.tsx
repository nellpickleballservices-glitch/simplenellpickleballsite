'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, m } from 'motion/react'

interface Section {
  id: string
  label: string
}

interface TableOfContentsProps {
  sections: Section[]
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Scroll spy using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [sections])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      // Close the menu first, then scroll after a short delay
      // so the DOM layout settles and scrollIntoView targets correctly
      setMobileOpen(false)
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth' })
      }, 250)
    }
  }, [])

  return (
    <>
      {/* Desktop: sticky sidebar — stays in its column */}
      <nav className="hidden lg:block sticky top-36 w-56">
        <div className="bg-charcoal/80 backdrop-blur-sm rounded-xl p-4 border border-charcoal">
          <ul className="flex flex-col gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => scrollTo(section.id)}
                  className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 ${
                    activeId === section.id
                      ? 'text-lime border-l-2 border-lime bg-lime/5 font-semibold'
                      : 'text-white hover:text-offwhite border-l-2 border-transparent'
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile: floating collapsible TOC button */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
        <AnimatePresence>
          {mobileOpen && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-2"
            >
              <div className="bg-charcoal/95 backdrop-blur-sm border border-charcoal rounded-xl px-4 pb-3 pt-2">
                <ul className="flex flex-col gap-1">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <button
                        onClick={() => scrollTo(section.id)}
                        className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all ${
                          activeId === section.id
                            ? 'text-lime font-semibold'
                            : 'text-white'
                        }`}
                      >
                        {section.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-charcoal/95 backdrop-blur-sm border border-lime/30 rounded-xl px-4 py-3 text-offwhite shadow-lg shadow-black/30"
        >
          <span className="text-sm font-semibold">
            {mobileOpen ? 'Close Contents' : '📖 Table of Contents'}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </>
  )
}
