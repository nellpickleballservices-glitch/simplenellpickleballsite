'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { EventForm } from './EventForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  getEventsAction,
  createEventAction,
  updateEventAction,
  deleteEventAction,
} from '@/app/actions/admin'
import type { Event } from '@/lib/types/admin'

type Filter = 'upcoming' | 'past'

const TYPE_COLORS: Record<string, string> = {
  tournament: 'bg-turquoise/20 text-turquoise',
  training: 'bg-sunset/20 text-sunset',
  social: 'bg-lime/20 text-lime',
}

export default function AdminEventsPage() {
  const t = useTranslations('Admin')
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [events, setEvents] = useState<Event[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const data = await getEventsAction(filter)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    }
  }, [filter])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleCreate(formData: FormData) {
    await createEventAction(formData)
    setShowForm(false)
    showFeedback(t('eventCreated'))
    await loadEvents()
  }

  async function handleUpdate(formData: FormData) {
    if (!editingEvent) return
    await updateEventAction(editingEvent.id, formData)
    setEditingEvent(undefined)
    setShowForm(false)
    showFeedback(t('eventUpdated'))
    await loadEvents()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEventAction(deleteTarget)
      setDeleteTarget(null)
      showFeedback(t('eventDeleted'))
      await loadEvents()
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(event: Event) {
    setEditingEvent(event)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingEvent(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-offwhite">{t('events')}</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-lime hover:bg-lime/90 text-midnight rounded-lg transition-colors"
          >
            {t('createEvent')}
          </button>
        )}
      </div>

      {feedback && (
        <div className="mb-4 px-4 py-2 bg-lime/10 border border-lime/30 rounded-lg text-lime text-sm">
          {feedback}
        </div>
      )}

      {showForm ? (
        <div className="bg-[#1E293B] rounded-lg p-6 mb-6">
          <EventForm
            event={editingEvent}
            onSubmit={editingEvent ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-700">
            {(['upcoming', 'past'] as Filter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`pb-2 text-sm font-medium transition-colors ${
                  filter === tab
                    ? 'text-lime border-b-2 border-lime'
                    : 'text-gray-400 hover:text-offwhite'
                }`}
              >
                {tab === 'upcoming' ? t('upcomingEventsTab') : t('pastEvents')}
              </button>
            ))}
          </div>

          {/* Events table */}
          {events.length === 0 ? (
            <p className="text-gray-400 text-center py-12">{t('noEvents')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="pb-3 pr-4">{t('eventTitle')}</th>
                    <th className="pb-3 pr-4">{t('eventType')}</th>
                    <th className="pb-3 pr-4">{t('eventDate')}</th>
                    <th className="pb-3 pr-4">{t('location')}</th>
                    <th className="pb-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-gray-800 hover:bg-[#1E293B]/50"
                    >
                      <td className="py-3 pr-4 text-offwhite font-medium">
                        {event.title_en}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            TYPE_COLORS[event.event_type] ?? 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {t(event.event_type)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        {new Date(event.event_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        {(event as Event & { locations?: { name: string } | null }).locations?.name ?? '-'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openEdit(event)}
                          className="text-lime hover:text-lime/80 text-xs mr-3"
                        >
                          {t('editEvent')}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(event.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          {t('deleteEvent')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('confirmDeleteEvent')}
        message={t('confirmDeleteEventMessage')}
        confirmLabel={t('confirm')}
        destructive
        loading={deleting}
      />
    </div>
  )
}
