'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  getCourtConfigAction,
  updateCourtConfigAction,
  type CourtConfigRow,
} from '@/app/actions/admin'

interface CourtConfigFormProps {
  courtId: string
}

type DayType = 'weekday' | 'weekend'

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hr' },
  { value: 90, label: '1.5 hr' },
  { value: 120, label: '2 hr' },
]

const EMPTY_CONFIG = {
  open_time: '07:00',
  close_time: '22:00',
  full_court_start: '',
  full_court_end: '',
  open_play_start: '',
  open_play_end: '',
  practice_start: '',
  practice_end: '',
  full_court_duration_minutes: 60,
  open_play_duration_minutes: 60,
  practice_duration_minutes: 30,
}

export function CourtConfigForm({ courtId }: CourtConfigFormProps) {
  const t = useTranslations('Admin')
  const [configs, setConfigs] = useState<Record<DayType, typeof EMPTY_CONFIG>>({
    weekday: { ...EMPTY_CONFIG },
    weekend: { ...EMPTY_CONFIG },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<DayType | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'schedule' | 'durations'>('schedule')

  useEffect(() => {
    let cancelled = false
    getCourtConfigAction(courtId).then((rows) => {
      if (cancelled) return
      const mapped: Record<DayType, typeof EMPTY_CONFIG> = {
        weekday: { ...EMPTY_CONFIG },
        weekend: { ...EMPTY_CONFIG },
      }
      for (const row of rows) {
        const dt = row.day_type as DayType
        mapped[dt] = {
          open_time: row.open_time?.slice(0, 5) ?? '07:00',
          close_time: row.close_time?.slice(0, 5) ?? '22:00',
          full_court_start: row.full_court_start?.slice(0, 5) ?? '',
          full_court_end: row.full_court_end?.slice(0, 5) ?? '',
          open_play_start: row.open_play_start?.slice(0, 5) ?? '',
          open_play_end: row.open_play_end?.slice(0, 5) ?? '',
          practice_start: row.practice_start?.slice(0, 5) ?? '',
          practice_end: row.practice_end?.slice(0, 5) ?? '',
          full_court_duration_minutes: row.full_court_duration_minutes ?? 60,
          open_play_duration_minutes: row.open_play_duration_minutes ?? 60,
          practice_duration_minutes: row.practice_duration_minutes ?? 30,
        }
      }
      setConfigs(mapped)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setMessage({ type: 'error', text: 'Failed to load court config' })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [courtId])

  async function handleSave(dayType: DayType) {
    setSaving(dayType)
    setMessage(null)
    const c = configs[dayType]
    const result = await updateCourtConfigAction(courtId, dayType, {
      open_time: c.open_time,
      close_time: c.close_time,
      full_court_start: c.full_court_start || null,
      full_court_end: c.full_court_end || null,
      open_play_start: c.open_play_start || null,
      open_play_end: c.open_play_end || null,
      practice_start: c.practice_start || null,
      practice_end: c.practice_end || null,
      full_court_duration_minutes: c.full_court_duration_minutes,
      open_play_duration_minutes: c.open_play_duration_minutes,
      practice_duration_minutes: c.practice_duration_minutes,
    })
    setSaving(null)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: t('configSaved') })
    }
  }

  function updateField(dayType: DayType, field: string, value: string | number) {
    setConfigs((prev) => ({
      ...prev,
      [dayType]: { ...prev[dayType], [field]: value },
    }))
  }

  if (loading) {
    return <p className="text-gray-500 text-sm py-2">{t('loading')}</p>
  }

  const inputClass =
    'w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-1.5 text-offwhite text-sm focus:outline-none focus:border-lime'
  const selectClass =
    'w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-1.5 text-offwhite text-sm focus:outline-none focus:border-lime appearance-none cursor-pointer'

  return (
    <div className="border-t border-gray-700 p-4 space-y-4">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <h4 className="text-offwhite font-semibold text-sm">{t('courtSettings')}</h4>
        <div className="flex bg-[#0F172A] rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-lime text-midnight'
                : 'text-gray-400 hover:text-offwhite'
            }`}
          >
            {t('scheduleTab')}
          </button>
          <button
            onClick={() => setActiveTab('durations')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'durations'
                ? 'bg-lime text-midnight'
                : 'text-gray-400 hover:text-offwhite'
            }`}
          >
            {t('durationsTab')}
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      {(['weekday', 'weekend'] as const).map((dayType) => {
        const c = configs[dayType]
        return (
          <div key={dayType} className="space-y-3">
            <h5 className="text-gray-300 text-sm font-medium">
              {dayType === 'weekday' ? t('weekday') : t('weekend')}
            </h5>

            {activeTab === 'schedule' && (
              <>
                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('openTime')}</label>
                    <input
                      type="time"
                      value={c.open_time}
                      onChange={(e) => updateField(dayType, 'open_time', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('closeTime')}</label>
                    <input
                      type="time"
                      value={c.close_time}
                      onChange={(e) => updateField(dayType, 'close_time', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Full Court Range */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('fullCourtHours')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('from')}</label>
                      <input
                        type="time"
                        value={c.full_court_start}
                        onChange={(e) => updateField(dayType, 'full_court_start', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('to')}</label>
                      <input
                        type="time"
                        value={c.full_court_end}
                        onChange={(e) => updateField(dayType, 'full_court_end', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Open Play Range */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('openPlayHours')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('from')}</label>
                      <input
                        type="time"
                        value={c.open_play_start}
                        onChange={(e) => updateField(dayType, 'open_play_start', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('to')}</label>
                      <input
                        type="time"
                        value={c.open_play_end}
                        onChange={(e) => updateField(dayType, 'open_play_end', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Practice Session Range */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('practiceSessionHours')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('from')}</label>
                      <input
                        type="time"
                        value={c.practice_start}
                        onChange={(e) => updateField(dayType, 'practice_start', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('to')}</label>
                      <input
                        type="time"
                        value={c.practice_end}
                        onChange={(e) => updateField(dayType, 'practice_end', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'durations' && (
              <>
                <p className="text-xs text-gray-500">{t('durationsDescription')}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('fullCourtDuration')}</label>
                    <select
                      value={c.full_court_duration_minutes}
                      onChange={(e) =>
                        updateField(dayType, 'full_court_duration_minutes', Number(e.target.value))
                      }
                      className={selectClass}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('openPlayDuration')}</label>
                    <select
                      value={c.open_play_duration_minutes}
                      onChange={(e) =>
                        updateField(dayType, 'open_play_duration_minutes', Number(e.target.value))
                      }
                      className={selectClass}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('practiceDuration')}</label>
                    <select
                      value={c.practice_duration_minutes}
                      onChange={(e) =>
                        updateField(dayType, 'practice_duration_minutes', Number(e.target.value))
                      }
                      className={selectClass}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => handleSave(dayType)}
              disabled={saving === dayType}
              className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving === dayType ? t('saving') : t('saveChanges')}
            </button>
          </div>
        )
      })}
    </div>
  )
}
