'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { LocationWithCourtCount } from '@/lib/queries/locations'

interface LocationCardProps {
  location: LocationWithCourtCount
}

export default function LocationCard({ location }: LocationCardProps) {
  const t = useTranslations('Reservations')
  const router = useRouter()

  return (
    <button
      aria-label={`${t('viewCourts')} — ${location.name}`}
      onClick={() => router.push(`/r3s-x7m1/${location.id}`)}
      className="bg-[#1E293B] rounded-xl shadow-lg overflow-hidden text-left hover:ring-2 hover:ring-lime/50 transition-all group w-full"
    >
      {/* Hero Image */}
      {location.hero_image_url ? (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={location.hero_image_url}
            alt={location.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-[#334155] flex items-center justify-center">
          <span className="text-gray-500 font-bebas-neue text-3xl tracking-wider">
            {location.name}
          </span>
        </div>
      )}

      {/* Card Body */}
      <div className="p-5">
        <h2 className="text-xl font-bebas-neue text-white tracking-wide mb-1">
          {location.name}
        </h2>

        {location.address && (
          <p className="text-white/90 text-sm mb-2">{location.address}</p>
        )}

        {location.description && (
          <p className="text-white text-sm mb-3 line-clamp-2">
            {location.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/90">
            {t('courtCount', { count: location.courtCount })}
          </span>
          <span className="text-lime text-sm font-semibold group-hover:translate-x-1 transition-transform">
            {t('viewCourts')} →
          </span>
        </div>
      </div>
    </button>
  )
}
