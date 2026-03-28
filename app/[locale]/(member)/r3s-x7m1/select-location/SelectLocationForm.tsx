'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { setHomeLocationAction } from '@/app/actions/membership'
import type { LocationWithCourtCount } from '@/lib/queries/locations'

interface SelectLocationFormProps {
  locations: LocationWithCourtCount[]
}

export default function SelectLocationForm({ locations }: SelectLocationFormProps) {
  const t = useTranslations('Reservations')
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [state, formAction, isPending] = useActionState(
    async (prev: { error?: string; success?: boolean }, formData: FormData) => {
      const result = await setHomeLocationAction(prev, formData)
      if (result.success) {
        const locationId = formData.get('locationId') as string
        router.push(`/r3s-x7m1/${locationId}`)
      }
      return result
    },
    {},
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="locationId" value={selectedId ?? ''} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {locations.map((location) => (
          <button
            key={location.id}
            type="button"
            onClick={() => setSelectedId(location.id)}
            className={`bg-[#1E293B] rounded-xl overflow-hidden text-left transition-all group w-full ${
              selectedId === location.id
                ? 'ring-2 ring-lime shadow-lg shadow-lime/10'
                : 'hover:ring-2 hover:ring-gray-500/50'
            }`}
          >
            {location.hero_image_url ? (
              <div className="relative w-full h-36 overflow-hidden">
                <Image
                  src={location.hero_image_url}
                  alt={location.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ) : (
              <div className="w-full h-36 bg-[#334155] flex items-center justify-center">
                <span className="text-gray-500 font-bebas-neue text-2xl tracking-wider">
                  {location.name}
                </span>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bebas-neue text-white tracking-wide">
                  {location.name}
                </h2>
                {selectedId === location.id && (
                  <span className="text-lime text-xs font-semibold uppercase tracking-wider">
                    {t('selected')}
                  </span>
                )}
              </div>

              {location.address && (
                <p className="text-white/90 text-sm mb-1">{location.address}</p>
              )}

              <span className="text-xs text-gray-500">
                {t('courtCount', { count: location.courtCount })}
              </span>
            </div>
          </button>
        ))}
      </div>

      {state.error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{t(`selectHomeErrors.${state.error}`)}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedId || isPending}
        className="w-full md:w-auto px-8 py-3 bg-lime text-black font-bebas-neue text-lg tracking-wider rounded-lg hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('selectHomeSaving') : t('selectHomeConfirm')}
      </button>
    </form>
  )
}
