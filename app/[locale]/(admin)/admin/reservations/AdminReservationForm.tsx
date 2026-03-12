'use client'

import { useState, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import {
  adminCreateReservationAction,
  searchUsersForReservationAction,
  type CourtWithLocation,
} from '@/app/actions/admin'

interface AdminReservationFormProps {
  courts: CourtWithLocation[]
  onSuccess: () => void
}

export function AdminReservationForm({ courts, onSuccess }: AdminReservationFormProps) {
  const t = useTranslations('Admin')
  const [state, formAction, isPending] = useActionState(adminCreateReservationAction, null)
  const [mode, setMode] = useState<'registered' | 'guest'>('registered')
  const [bookingMode, setBookingMode] = useState<'full_court' | 'open_play'>('full_court')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    { id: string; first_name: string; last_name: string; email: string }[]
  >([])
  const [selectedUser, setSelectedUser] = useState<{
    id: string
    first_name: string
    last_name: string
    email: string
  } | null>(null)
  const [searching, setSearching] = useState(false)

  if (state?.success) {
    onSuccess()
  }

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const results = await searchUsersForReservationAction(query)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <form action={formAction} className="bg-[#111b2e] rounded-lg p-6 space-y-4 mt-4">
      {/* Mode toggle */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-offwhite cursor-pointer">
          <input
            type="radio"
            name="reservationMode"
            checked={mode === 'registered'}
            onChange={() => setMode('registered')}
            className="accent-lime"
          />
          {t('registeredUser')}
        </label>
        <label className="flex items-center gap-2 text-sm text-offwhite cursor-pointer">
          <input
            type="radio"
            name="reservationMode"
            checked={mode === 'guest'}
            onChange={() => setMode('guest')}
            className="accent-lime"
          />
          {t('guestWalkIn')}
        </label>
      </div>

      {/* User selection */}
      {mode === 'registered' ? (
        <div className="relative">
          <label className="block text-sm text-gray-400 mb-1">{t('onBehalf')}</label>
          <input
            type="text"
            value={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.email})` : searchQuery}
            onChange={(e) => {
              setSelectedUser(null)
              handleSearch(e.target.value)
            }}
            placeholder={t('selectUser')}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
          <input type="hidden" name="userId" value={selectedUser?.id ?? ''} />
          {searchResults.length > 0 && !selectedUser && (
            <div className="absolute z-10 w-full mt-1 bg-[#0a1628] border border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(user)
                    setSearchResults([])
                    setSearchQuery('')
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-offwhite hover:bg-[#111b2e] transition-colors"
                >
                  {user.first_name} {user.last_name}
                  <span className="text-gray-500 ml-2">{user.email}</span>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <p className="text-xs text-gray-500 mt-1">{t('loading')}</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('guestName')}</label>
          <input
            name="guestName"
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      )}

      {/* Court selection */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('court')}</label>
        <select
          name="courtId"
          required
          className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
        >
          <option value="">{t('allCourts')}</option>
          {courts
            .filter((c) => c.status === 'open')
            .map((court) => (
              <option key={court.id} value={court.id}>
                {court.name} — {court.locations?.name}
              </option>
            ))}
        </select>
      </div>

      {/* Date and time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('date')}</label>
          <input
            name="date"
            type="date"
            required
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('timeStart')}</label>
          <input
            name="timeStart"
            type="time"
            required
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('timeEnd')}</label>
          <input
            name="timeEnd"
            type="time"
            required
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>

      {/* Hidden fields to compose startsAt/endsAt from date + time */}
      <input type="hidden" name="startsAt" id="startsAt" />
      <input type="hidden" name="endsAt" id="endsAt" />

      {/* Booking mode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('bookingMode')}</label>
          <select
            name="bookingMode"
            value={bookingMode}
            onChange={(e) => setBookingMode(e.target.value as 'full_court' | 'open_play')}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          >
            <option value="full_court">{t('fullCourt')}</option>
            <option value="open_play">{t('openPlay')}</option>
          </select>
        </div>
        {bookingMode === 'open_play' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('spotNumber')}</label>
            <select
              name="spotNumber"
              className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        )}
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        onClick={(e) => {
          // Compose startsAt and endsAt before submit
          const form = (e.target as HTMLButtonElement).closest('form')
          if (!form) return
          const date = (form.querySelector('[name="date"]') as HTMLInputElement).value
          const timeStart = (form.querySelector('[name="timeStart"]') as HTMLInputElement).value
          const timeEnd = (form.querySelector('[name="timeEnd"]') as HTMLInputElement).value
          if (date && timeStart && timeEnd) {
            ;(form.querySelector('#startsAt') as HTMLInputElement).value = `${date}T${timeStart}:00`
            ;(form.querySelector('#endsAt') as HTMLInputElement).value = `${date}T${timeEnd}:00`
          }
        }}
        className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {isPending ? t('saving') : t('createReservation')}
      </button>
    </form>
  )
}
