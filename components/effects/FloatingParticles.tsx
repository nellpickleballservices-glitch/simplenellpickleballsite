'use client'

import { m } from 'motion/react'
import { useMemo, useState, useEffect } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  color: string
  driftX: number
  driftY: number
  glow: boolean
}

const COLORS = [
  'var(--color-lime)',
  'var(--color-turquoise)',
  'var(--color-electric)',
  'var(--color-sunset)',
  'rgba(168,85,247,0.8)',   // purple
  'rgba(251,191,36,0.8)',   // amber
  'rgba(244,114,182,0.8)',  // pink
  'rgba(255,255,255,0.5)',  // white
]

/**
 * Small colorful orbs that flow around the hero section.
 */
export function FloatingParticles({ count = 30 }: { count?: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particles = useMemo<Particle[]>(() => {
    if (!mounted) return []
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      duration: Math.random() * 16 + 10,
      delay: Math.random() * -20,
      color: COLORS[i % COLORS.length],
      driftX: (Math.random() - 0.5) * 200,
      driftY: (Math.random() - 0.5) * 200,
      glow: i % 4 === 0,
    }))
  }, [count, mounted])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {particles.map((p) => (
        <m.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: 0,
            boxShadow: p.glow ? `0 0 ${p.size * 2}px ${p.color}` : 'none',
          }}
          animate={{
            x: [0, p.driftX, -p.driftX * 0.6, 0],
            y: [0, p.driftY, -p.driftY * 0.5, 0],
            opacity: [0, 0.6, 0.4, 0],
            scale: [0.6, 1, 0.8, 0.6],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
