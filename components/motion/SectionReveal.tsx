'use client'

import { m } from 'motion/react'
import type { ReactNode } from 'react'

interface SectionRevealProps {
  children: ReactNode
  direction?: 'left' | 'right' | 'up'
}

const directionVariants = {
  left: { hidden: { opacity: 0, x: -80 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 80 }, visible: { opacity: 1, x: 0 } },
  up: { hidden: { opacity: 0, y: 60 }, visible: { opacity: 1, y: 0 } },
}

export function SectionReveal({ children, direction = 'up' }: SectionRevealProps) {
  const variants = directionVariants[direction]

  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={variants}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </m.div>
  )
}
