'use client'

import { m } from 'motion/react'

interface SubpageHeroAccentsProps {
  secondaryColor?: 'turquoise' | 'sunset'
}

/**
 * Immersive animated hero accents for subpages.
 * Layered glowing orbs, light streaks, and a subtle grid.
 */
export function SubpageHeroAccents({ secondaryColor = 'turquoise' }: SubpageHeroAccentsProps) {
  const secondaryClass = secondaryColor === 'sunset' ? 'bg-sunset' : 'bg-turquoise'
  const secondaryGlow = secondaryColor === 'sunset'
    ? 'radial-gradient(circle, rgba(255,159,67,0.12) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)'

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Primary lime orb — top-right */}
      <m.div
        className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(163,230,53,0.1) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary orb — bottom-left */}
      <m.div
        className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full"
        style={{ background: secondaryGlow }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center ambient glow — very subtle */}
      <m.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(163,230,53,0.04) 0%, transparent 60%)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 12, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
      />


      {/* Small floating orb — drifts diagonally */}
      <m.div
        className={`absolute w-3 h-3 rounded-full ${secondaryClass}`}
        style={{ top: '60%', left: '15%' }}
        animate={{
          x: [0, 80, 0],
          y: [0, -60, 0],
          opacity: [0, 0.4, 0],
          scale: [0.5, 1, 0.5],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Small floating orb 2 */}
      <m.div
        className="absolute w-2 h-2 rounded-full bg-lime"
        style={{ top: '30%', left: '75%' }}
        animate={{
          x: [0, -60, 0],
          y: [0, 40, 0],
          opacity: [0, 0.35, 0],
          scale: [0.5, 1.2, 0.5],
        }}
        transition={{ duration: 11, delay: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

    </div>
  )
}
