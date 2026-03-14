'use client'

import { m } from 'motion/react'

interface SubpageHeroAccentsProps {
  secondaryColor?: 'turquoise' | 'sunset'
}

/**
 * Animated hero accents for subpages (About, Events, Learn, Contact).
 * Lighter version of the homepage accents — breathing circles only.
 */
export function SubpageHeroAccents({ secondaryColor = 'turquoise' }: SubpageHeroAccentsProps) {
  const secondaryClass = secondaryColor === 'sunset' ? 'bg-sunset' : 'bg-turquoise'

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <m.div
        className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-lime opacity-[0.06]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.06, 0.09, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        className={`absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full ${secondaryClass} opacity-[0.07]`}
        animate={{ scale: [1, 1.15, 1], opacity: [0.07, 0.1, 0.07] }}
        transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
