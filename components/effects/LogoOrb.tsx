'use client'

import { m } from 'motion/react'

/**
 * Color-cycling morphing blob behind the logo.
 */
export function LogoOrb() {
  return (
    <m.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110px] h-[110px] blur-[12px] opacity-20"
      animate={{
        backgroundColor: [
          'rgba(163,230,53,1)',
          'rgba(56,189,248,1)',
          'rgba(255,159,67,1)',
          'rgba(168,85,247,1)',
          'rgba(244,114,182,1)',
          'rgba(163,230,53,1)',
        ],
        borderRadius: [
          '30% 70% 70% 30% / 30% 40% 60% 70%',
          '70% 30% 30% 70% / 60% 70% 30% 40%',
          '40% 60% 70% 30% / 70% 30% 60% 40%',
          '60% 40% 30% 70% / 30% 60% 70% 40%',
          '50% 50% 60% 40% / 40% 50% 50% 60%',
          '30% 70% 70% 30% / 30% 40% 60% 70%',
        ],
        scale: [1, 1.15, 0.9, 1.1, 0.95, 1],
        rotate: [0, 60, 120, 180, 240, 360],
      }}
      transition={{
        duration: 14,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}
