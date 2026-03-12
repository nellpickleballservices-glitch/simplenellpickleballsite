'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { addCourtAction } from '@/app/actions/admin'

export function CourtForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('Admin')
  const [state, formAction, isPending] = useActionState(addCourtAction, null)

  if (state?.success) {
    onSuccess()
  }

  return (
    <form action={formAction} className="bg-[#111b2e] rounded-lg p-6 space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('locationName')}</label>
          <input
            name="locationName"
            required
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('courtName')}</label>
          <input
            name="courtName"
            required
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('address')}</label>
        <input
          name="address"
          className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('latitude')}</label>
          <input
            name="lat"
            type="number"
            step="any"
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('longitude')}</label>
          <input
            name="lng"
            type="number"
            step="any"
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {isPending ? t('saving') : t('addCourt')}
      </button>
    </form>
  )
}
