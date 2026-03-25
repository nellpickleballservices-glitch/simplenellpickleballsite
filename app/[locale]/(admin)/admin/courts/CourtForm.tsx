'use client'

import { useActionState, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { addCourtAction, getLocationsAction, type LocationRow } from '@/app/actions/admin'

export function CourtForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('Admin')
  const [state, formAction, isPending] = useActionState(addCourtAction, null)
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  useEffect(() => {
    getLocationsAction()
      .then(setLocations)
      .finally(() => setLoadingLocations(false))
  }, [])

  useEffect(() => {
    if (state?.success) {
      onSuccess()
    }
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="bg-[#1E293B] rounded-lg p-6 space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/90 mb-1">{t('selectLocation')}</label>
          {loadingLocations ? (
            <p className="text-gray-500 text-sm py-2">{t('loading')}</p>
          ) : locations.length === 0 ? (
            <p className="text-amber-400 text-sm py-2">{t('noLocationsCreateFirst')}</p>
          ) : (
            <select
              name="locationId"
              required
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
            >
              <option value="">{t('chooseLocation')}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}{loc.address ? ` — ${loc.address}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm text-white/90 mb-1">{t('courtName')}</label>
          <input
            name="courtName"
            required
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || locations.length === 0}
        className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {isPending ? t('saving') : t('addCourt')}
      </button>
    </form>
  )
}
