'use client'

import { useRef, useEffect } from 'react'

/**
 * Full-bleed looping background video for the hero section.
 * Includes a dark gradient overlay for text legibility.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Ensure autoplay on mount (some browsers block autoplay until interaction)
    const video = videoRef.current
    if (video) {
      video.play().catch(() => {
        // Autoplay blocked — video stays paused, overlay still visible
      })
    }
  }, [])

  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      {/* Video layer */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* Dark overlay — multi-layer gradient for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              to bottom,
              rgba(15, 23, 42, 0.55) 0%,
              rgba(15, 23, 42, 0.40) 30%,
              rgba(15, 23, 42, 0.50) 60%,
              rgba(15, 23, 42, 0.85) 100%
            )
          `,
        }}
      />

      {/* Subtle vignette around edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(15, 23, 42, 0.6) 100%)',
        }}
      />
    </div>
  )
}
