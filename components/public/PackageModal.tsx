'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'

interface PackageModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  accentColor: string
  children: ReactNode
}

export function PackageModal({ open, onClose, title, subtitle, accentColor, children }: PackageModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  // Escape key + body scroll lock
  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal card */}
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-charcoal border border-offwhite/10 shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-charcoal border-b border-offwhite/10 px-6 pt-6 pb-4 rounded-t-2xl">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-offwhite/5 hover:bg-offwhite/10 transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-offwhite/70">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h3 className="font-bebas-neue text-3xl tracking-wide" style={{ color: accentColor }}>
                {title}
              </h3>
              <p className="text-white/60 text-xs uppercase tracking-widest mt-1">{subtitle}</p>
            </div>

            {/* Content */}
            <div className="px-6 py-6">{children}</div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
