'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { upsertSessionPricingAction } from '@/app/actions/admin/pricing'
import type { CourtPricingGrid } from '@/lib/types/pricing'
import { DAY_NAMES_EN, DAY_NAMES_ES } from '@/lib/types/pricing'

interface PricingGridProps {
  initialData: CourtPricingGrid[]
  locale: string
}

// Reorder days so Monday (1) is first, Sunday (0) is last
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

interface CellState {
  priceCents: number
  saving: boolean
  saved: boolean
  error: boolean
}

export function PricingGrid({ initialData, locale }: PricingGridProps) {
  const t = useTranslations('Admin')
  const dayNames = locale === 'es' ? DAY_NAMES_ES : DAY_NAMES_EN

  // Build state keyed by "courtId-dayOfWeek"
  const buildInitialState = () => {
    const state: Record<string, CellState> = {}
    for (const court of initialData) {
      for (const day of court.days) {
        state[`${court.court_id}-${day.day_of_week}`] = {
          priceCents: day.price_cents,
          saving: false,
          saved: false,
          error: false,
        }
      }
    }
    return state
  }

  const [cells, setCells] = useState<Record<string, CellState>>(buildInitialState)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (editingKey && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingKey])

  function startEdit(courtId: string, dayOfWeek: number) {
    const key = `${courtId}-${dayOfWeek}`
    const cell = cells[key]
    if (!cell) return
    setEditingKey(key)
    setEditValue((cell.priceCents / 100).toFixed(2))
  }

  function cancelEdit() {
    setEditingKey(null)
    setEditValue('')
  }

  function saveEdit(courtId: string, dayOfWeek: number) {
    const key = `${courtId}-${dayOfWeek}`
    const dollars = parseFloat(editValue)

    if (isNaN(dollars) || dollars < 0) {
      setCells((prev) => ({ ...prev, [key]: { ...prev[key], error: true } }))
      setTimeout(() => {
        setCells((prev) => ({ ...prev, [key]: { ...prev[key], error: false } }))
      }, 2000)
      cancelEdit()
      return
    }

    const priceCents = Math.round(dollars * 100)
    setEditingKey(null)
    setEditValue('')

    setCells((prev) => ({
      ...prev,
      [key]: { ...prev[key], priceCents, saving: true, saved: false, error: false },
    }))

    startTransition(async () => {
      const result = await upsertSessionPricingAction(courtId, dayOfWeek, priceCents)
      if (result.success) {
        setCells((prev) => ({
          ...prev,
          [key]: { ...prev[key], saving: false, saved: true },
        }))
        setTimeout(() => {
          setCells((prev) => ({
            ...prev,
            [key]: { ...prev[key], saved: false },
          }))
        }, 2000)
      } else {
        setCells((prev) => ({
          ...prev,
          [key]: { ...prev[key], saving: false, error: true },
        }))
        setTimeout(() => {
          setCells((prev) => ({
            ...prev,
            [key]: { ...prev[key], error: false },
          }))
        }, 3000)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent, courtId: string, dayOfWeek: number) {
    if (e.key === 'Enter') {
      saveEdit(courtId, dayOfWeek)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="bg-midnight/50 border border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-offwhite mb-4">{t('dayPrices')}</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-offwhite/70 text-sm font-medium px-3 py-2 border-b border-gray-700">
                {t('court')}
              </th>
              {DAY_ORDER.map((dayIdx) => (
                <th
                  key={dayIdx}
                  className="text-center text-offwhite/70 text-sm font-medium px-3 py-2 border-b border-gray-700"
                >
                  {dayNames[dayIdx]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialData.map((court) => (
              <tr key={court.court_id} className="hover:bg-white/5">
                <td className="text-offwhite font-medium px-3 py-3 border-b border-gray-700/50 whitespace-nowrap">
                  {court.court_name}
                </td>
                {DAY_ORDER.map((dayIdx) => {
                  const key = `${court.court_id}-${dayIdx}`
                  const cell = cells[key]
                  if (!cell) return <td key={dayIdx} />

                  const isEditing = editingKey === key

                  return (
                    <td
                      key={dayIdx}
                      className={`text-center px-3 py-3 border-b border-gray-700/50 ${
                        isEditing ? 'bg-lime/10 ring-1 ring-lime/50' : ''
                      }`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(court.court_id, dayIdx)}
                          onKeyDown={(e) => handleKeyDown(e, court.court_id, dayIdx)}
                          className="w-20 bg-[#0F172A] border border-lime/50 rounded px-2 py-1 text-offwhite text-center text-sm focus:outline-none focus:border-lime"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(court.court_id, dayIdx)}
                          className={`w-20 px-2 py-1 rounded text-sm transition-colors cursor-pointer ${
                            cell.saved
                              ? 'text-green-400 bg-green-400/10'
                              : cell.error
                                ? 'text-red-400 bg-red-400/10'
                                : cell.saving
                                  ? 'text-offwhite/50'
                                  : 'text-offwhite hover:bg-white/10'
                          }`}
                        >
                          {cell.saving
                            ? '...'
                            : cell.saved
                              ? `$${(cell.priceCents / 100).toFixed(2)}`
                              : cell.error
                                ? t('invalidPrice')
                                : `$${(cell.priceCents / 100).toFixed(2)}`}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
