'use client'

/**
 * Full-screen animated film grain overlay.
 * Renders an SVG noise filter that shifts every 80ms for a subtle analog texture.
 * Pure CSS animation — no JS runtime cost.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035]"
      style={{ mixBlendMode: 'overlay' }}
    >
      <svg className="absolute inset-0 w-full h-full">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  )
}
