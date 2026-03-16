'use client'

import { useActionState, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { addLocationAction } from '@/app/actions/admin'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'

export function LocationForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('Admin')
  const [state, formAction, isPending] = useActionState(addLocationAction, null)
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  useEffect(() => {
    if (state?.success) {
      onSuccess()
    }
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="bg-[#1E293B] rounded-lg p-6 space-y-4 mt-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('locationName')}</label>
        <input
          name="name"
          required
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('address')}</label>
        <AddressAutocomplete
          placeholder={t('address')}
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          onSelect={(place) => {
            setAddress(place.address)
            setLat(place.lat)
            setLng(place.lng)
          }}
        />
        <input type="hidden" name="address" value={address} />
        <input type="hidden" name="lat" value={lat ?? ''} />
        <input type="hidden" name="lng" value={lng ?? ''} />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('heroImageUrl')}</label>
        <input
          name="heroImageUrl"
          type="url"
          placeholder="https://example.com/image.jpg"
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('locationDescription')}</label>
        <textarea
          name="description"
          rows={3}
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {isPending ? t('saving') : t('addLocation')}
      </button>
    </form>
  )
}
