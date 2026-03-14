'use client'

import { m } from 'motion/react'

/**
 * Animated decorative background elements for hero sections.
 * Replaces static circles/diamonds with breathing, drifting shapes.
 */
export function AnimatedHeroAccents() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Large lime circle — top-right, breathing */}
      <m.div
        className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-lime opacity-[0.06]"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.06, 0.09, 0.06],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Turquoise circle — bottom-left, counter-breathing */}
      <m.div
        className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full bg-turquoise opacity-[0.07]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.07, 0.1, 0.07],
        }}
        transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Sunset accent bar — pulses and stretches */}
      <m.div
        className="absolute top-1/4 right-0 w-1.5 bg-sunset rounded-l-full"
        animate={{
          height: ['16rem', '20rem', '16rem'],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Lime diamond — rotates slowly */}
      <m.div
        className="absolute top-20 left-[12%] w-10 h-10 bg-lime opacity-20"
        animate={{
          rotate: [45, 135, 225, 315, 405],
          scale: [1, 1.2, 1, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Horizontal accent line — shimmers */}
      <m.div
        className="absolute bottom-28 left-1/2 -translate-x-1/2 h-px bg-lime"
        animate={{
          width: ['12rem', '16rem', '12rem'],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* NEW: Orbiting dot — lime */}
      <m.div
        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-lime"
        animate={{
          x: [0, 200, 0, -200, 0],
          y: [0, -100, 0, 100, 0],
          opacity: [0, 0.5, 0.3, 0.5, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      />

      {/* NEW: Gradient sweep line — diagonal */}
      <m.div
        className="absolute top-0 left-0 w-px h-full origin-top-left"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--color-lime), transparent)',
        }}
        animate={{
          x: ['-10%', '110%'],
          opacity: [0, 0.15, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  )
}

/**
 * Animated accents for the CTA banner section.
 */
export function AnimatedCtaAccents() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <m.div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-lime opacity-[0.05]"
        animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.08, 0.05] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-turquoise opacity-[0.05]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.09, 0.05] }}
        transition={{ duration: 11, delay: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Animated gradient lines */}
      <m.div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--color-lime), transparent)' }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--color-lime), transparent)' }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
