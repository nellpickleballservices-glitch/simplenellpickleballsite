/**
 * Full-bleed hero background with video on md+ screens and image on mobile.
 */
export function HeroVideo() {
  return (
    <div className="absolute inset-0 z-[1]" aria-hidden="true">
      {/* Mobile: static image */}
      <img
        src="/images/siteImages/hero-mobile-img.jpeg"
        alt="Pickleball players at NELL Pickleball Club in Bavaro, Dominican Republic"
        className="absolute inset-0 w-full h-full object-cover md:hidden"
      />
      {/* Desktop: autoplay video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        className="absolute inset-0 w-full h-full object-cover hidden md:block"
      >
        <source src="/videos/Hero-video2.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — bottom-heavy gradient for text legibility */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: `
            linear-gradient(
              to top,
              rgba(15, 23, 42, 0.92) 0%,
              rgba(15, 23, 42, 0.55) 35%,
              rgba(15, 23, 42, 0.15) 60%,
              rgba(15, 23, 42, 0.10) 100%
            )
          `,
        }}
      />
      {/* Left-edge gradient so bottom-left text stays readable */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: `
            linear-gradient(
              to right,
              rgba(15, 23, 42, 0.50) 0%,
              rgba(15, 23, 42, 0.20) 30%,
              transparent 60%
            )
          `,
        }}
      />
    </div>
  )
}
