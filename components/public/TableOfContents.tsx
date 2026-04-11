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

function useScrollSpy(sections: Section[]) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
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

  return activeId
}

export function TableOfContentsDesktop({ sections }: TableOfContentsProps) {
  const activeId = useScrollSpy(sections)

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <nav className="sticky top-36 w-56">
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
  )
}

export function TableOfContentsMobile({ sections }: TableOfContentsProps) {
  const activeId = useScrollSpy(sections)
  const [open, setOpen] = useState(false)
  const activeLabel = sections.find((s) => s.id === activeId)?.label ?? ''

  const scrollTo = useCallback((id: string) => {
    setOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 220)
  }, [])

  return (
    <div className="fixed top-[84px] left-0 right-0 z-40">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-midnight/95 backdrop-blur-md border-b border-charcoal px-4 py-2.5"
      >
        <span className="text-xs text-white/60 uppercase tracking-widest font-semibold">Contents</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-lime font-semibold truncate max-w-[180px]">{activeLabel}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {/* Expandable pill list */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-midnight/95 backdrop-blur-md border-b border-charcoal"
          >
            <ul className="flex flex-row flex-wrap gap-2 px-4 py-3">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 whitespace-nowrap ${
                      activeId === section.id
                        ? 'text-midnight bg-lime border-lime font-semibold'
                        : 'text-white/80 border-charcoal hover:border-lime/40 hover:text-white'
                    }`}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** @deprecated Use TableOfContentsDesktop or TableOfContentsMobile directly */
export function TableOfContents({ sections }: TableOfContentsProps) {
  return <TableOfContentsDesktop sections={sections} />
}
