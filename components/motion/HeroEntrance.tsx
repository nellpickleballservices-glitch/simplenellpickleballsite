'use client'

import { m } from 'motion/react'
import { Children, type ReactNode } from 'react'

interface HeroEntranceProps {
  children: ReactNode
  className?: string
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export function HeroEntrance({ children, className }: HeroEntranceProps) {
  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {Children.map(children, (child) => (
        <m.div variants={itemVariants}>{child}</m.div>
      ))}
    </m.div>
  )
}
