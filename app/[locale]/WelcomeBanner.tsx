'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface WelcomeBannerProps {
  firstName: string
}

export default function WelcomeBanner({ firstName }: WelcomeBannerProps) {
  const t = useTranslations('Home')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`w-full bg-lime text-midnight py-3 px-6 text-center font-bold text-lg transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      {t('welcome', { name: firstName })}
    </div>
  )
}
