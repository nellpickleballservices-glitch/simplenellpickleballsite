'use client'

import { useState, useEffect, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import {
  adminCreateReservationAction,
  searchUsersForReservationAction,
  getSessionPricePreviewAction,
  type CourtWithLocation,
} from '@/app/actions/admin'
import { calculateSessionPrice, isTourist as isTouristFn } from '@/lib/utils/pricing'

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
    { id: string; first_name: string; last_name: string; email: string; country?: string | null }[]
  >([])
  const [selectedUser, setSelectedUser] = useState<{
    id: string
    first_name: string
    last_name: string
    email: string
    country?: string | null
  } | null>(null)
  const [searching, setSearching] = useState(false)

  // Local/Tourist toggle for guest walk-ins
  const [isTouristToggle, setIsTouristToggle] = useState(false)

  // Court and date for price preview
  const [selectedCourtId, setSelectedCourtId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  // Price preview state
  const [pricePreview, setPricePreview] = useState<{ priceCents: number; surchargePercent: number } | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // Effective tourist status
  const effectiveIsTourist = mode === 'guest'
    ? isTouristToggle
    : isTouristFn(selectedUser?.country ?? null)

  // Fetch price preview when court or date changes
  useEffect(() => {
    if (!selectedCourtId || !selectedDate) {
      setPricePreview(null)
      return
    }

    const timeout = setTimeout(async () => {
      setPriceLoading(true)
      try {
        const result = await getSessionPricePreviewAction(selectedCourtId, selectedDate)
        setPricePreview(result)
      } catch {
        setPricePreview(null)
      } finally {
        setPriceLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [selectedCourtId, selectedDate])

  // Calculate displayed price
  const displayPrice = pricePreview
    ? calculateSessionPrice({
        basePriceCents: pricePreview.priceCents,
        surchargePercent: pricePreview.surchargePercent,
        isTourist: effectiveIsTourist,
      })
    : null

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
    <form action={formAction} className="bg-[#1E293B] rounded-lg p-6 space-y-4 mt-4">
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
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
          <input type="hidden" name="userId" value={selectedUser?.id ?? ''} />
          {searchResults.length > 0 && !selectedUser && (
            <div className="absolute z-10 w-full mt-1 bg-[#0F172A] border border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(user)
                    setSearchResults([])
                    setSearchQuery('')
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-offwhite hover:bg-[#1E293B] transition-colors"
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
          {/* Read-only Local/Tourist indicator for registered users */}
          {selectedUser && (
            <div className="mt-2">
              {selectedUser.country === 'DO' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400">
                  {t('local')}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400">
                  {t('tourist')}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('guestName')}</label>
          <input
            name="guestName"
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
          {/* Local/Tourist toggle for guest walk-ins */}
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm text-offwhite cursor-pointer">
              <input
                type="radio"
                checked={!isTouristToggle}
                onChange={() => setIsTouristToggle(false)}
                className="accent-lime"
              />
              {t('local')}
            </label>
            <label className="flex items-center gap-2 text-sm text-offwhite cursor-pointer">
              <input
                type="radio"
                checked={isTouristToggle}
                onChange={() => setIsTouristToggle(true)}
                className="accent-lime"
              />
              {t('tourist')}
            </label>
          </div>
        </div>
      )}

      {/* Hidden isTourist field */}
      <input type="hidden" name="isTourist" value={effectiveIsTourist ? 'true' : 'false'} />

      {/* Court selection */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('court')}</label>
        <select
          name="courtId"
          required
          value={selectedCourtId}
          onChange={(e) => setSelectedCourtId(e.target.value)}
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
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
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('timeStart')}</label>
          <input
            name="timeStart"
            type="time"
            required
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('timeEnd')}</label>
          <input
            name="timeEnd"
            type="time"
            required
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>

      {/* Live price preview */}
      {selectedCourtId && selectedDate && (
        <div className="bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2">
          {priceLoading ? (
            <p className="text-sm text-gray-400">{t('loading')}</p>
          ) : displayPrice ? (
            <p className="text-sm text-offwhite font-medium">
              {t('pricePreview', { price: `$${(displayPrice.totalCents / 100).toFixed(2)}` })}
            </p>
          ) : null}
        </div>
      )}

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
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
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
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
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
