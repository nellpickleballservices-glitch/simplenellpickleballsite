'use client'

import { useEffect, useState } from 'react'

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="absolute bottom-0 left-0 w-full h-[3px] pointer-events-none">
      <div
        className="h-full origin-left bg-gradient-to-r from-lime via-electric to-turquoise transition-transform duration-100 ease-out"
        style={{
          width: '100%',
          transform: `scaleX(${progress})`,
        }}
      />
    </div>
  )
}
