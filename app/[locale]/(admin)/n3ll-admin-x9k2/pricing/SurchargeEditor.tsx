'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateTouristSurchargeAction } from '@/app/actions/admin/pricing'

interface SurchargeEditorProps {
  initialValue: number
}

export function SurchargeEditor({ initialValue }: SurchargeEditorProps) {
  const t = useTranslations('Admin')
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const pct = Math.round(value)
    if (pct < 0 || pct > 100 || isNaN(pct)) {
      setError(t('invalidPrice'))
      return
    }

    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateTouristSurchargeAction(pct)
      if (result.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError(result.error ?? 'Failed to save')
      }
    })
  }

  return (
    <div className="bg-midnight/50 border border-gray-700 rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold text-offwhite mb-2">{t('touristSurcharge')}</h2>
      <p className="text-white/80 text-sm mb-4">{t('surchargeDescription')}</p>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-24 bg-[#0F172A] border border-gray-600 rounded px-3 py-2 text-offwhite text-center focus:border-lime focus:outline-none"
        />
        <span className="text-white text-lg">%</span>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="ml-4 px-4 py-2 bg-lime text-midnight font-semibold rounded hover:bg-lime/90 transition-colors disabled:opacity-50"
        >
          {isPending ? t('saving') : t('save')}
        </button>

        {saved && (
          <span className="text-green-400 text-sm ml-2">{t('surchargeSaved')}</span>
        )}
        {error && (
          <span className="text-red-400 text-sm ml-2">{error}</span>
        )}
      </div>
    </div>
  )
}
