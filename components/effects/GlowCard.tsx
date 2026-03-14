'use client'

import { useState, useRef, type ReactNode, type MouseEvent } from 'react'

interface GlowCardProps {
  children: ReactNode
  accentColor?: string
  className?: string
}

/**
 * Card with cursor-tracking glow effect on hover.
 * The glow follows the mouse position for a premium interactive feel.
 */
export function GlowCard({
  children,
  accentColor = 'var(--color-lime)',
  className = '',
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [isHovering, setIsHovering] = useState(false)

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`relative overflow-visible rounded-2xl transition-all duration-300 ${className}`}
      style={{
        transform: isHovering ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {/* Cursor-tracking glow */}
      <div
        className="absolute -inset-px rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(400px circle at ${glowPos.x}% ${glowPos.y}%, ${accentColor}20, transparent 60%)`,
        }}
      />

      {/* Glowing border effect */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(400px circle at ${glowPos.x}% ${glowPos.y}%, ${accentColor}30, transparent 60%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Card content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
