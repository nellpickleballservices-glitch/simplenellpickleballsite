'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Event, EventType } from '@/lib/types/admin'

interface EventFormProps {
  event?: Event
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

const EVENT_TYPES: EventType[] = ['tournament', 'training', 'social']

export function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const t = useTranslations('Admin')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      await onSubmit(formData)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-offwhite">
        {event ? t('editEvent') : t('createEvent')}
      </h2>

      {/* Bilingual titles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('eventTitleEs')}</label>
          <input
            name="title_es"
            type="text"
            required
            defaultValue={event?.title_es ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('eventTitleEn')}</label>
          <input
            name="title_en"
            type="text"
            required
            defaultValue={event?.title_en ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
      </div>

      {/* Bilingual descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('descriptionEs')}</label>
          <textarea
            name="description_es"
            rows={3}
            defaultValue={event?.description_es ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('descriptionEn')}</label>
          <textarea
            name="description_en"
            rows={3}
            defaultValue={event?.description_en ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
      </div>

      {/* Event type and date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('eventType')}</label>
          <select
            name="event_type"
            required
            defaultValue={event?.event_type ?? 'tournament'}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(type)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('eventDate')}</label>
          <input
            name="event_date"
            type="date"
            required
            defaultValue={event?.event_date?.split('T')[0] ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('imageUrl')}</label>
          <input
            name="image_url"
            type="text"
            defaultValue={event?.image_url ?? ''}
            placeholder="https://..."
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('startTime')}</label>
          <input
            name="start_time"
            type="time"
            defaultValue={event?.start_time ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('endTime')}</label>
          <input
            name="end_time"
            type="time"
            defaultValue={event?.end_time ?? ''}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite focus:border-lime focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 text-sm text-offwhite/70 hover:text-offwhite transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-semibold bg-lime hover:bg-lime/90 text-midnight rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? '...' : event ? t('editEvent') : t('createEvent')}
        </button>
      </div>
    </form>
  )
}
