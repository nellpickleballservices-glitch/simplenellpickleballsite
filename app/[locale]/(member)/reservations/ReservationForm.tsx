'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { createReservationAction } from '@/app/actions/reservations'
import PaymentPanel from './PaymentPanel'

interface ReservationFormProps {
  courtId: string
  date: string
  startTime: string
  endTime: string
  bookingMode: 'full_court' | 'open_play'
  spotNumber?: number
  isVip: boolean
  isMember: boolean
  onSuccess?: () => void
}

export default function ReservationForm({
  courtId,
  date,
  startTime,
  endTime,
  bookingMode,
  spotNumber,
  isVip,
  isMember,
  onSuccess,
}: ReservationFormProps) {
  const t = useTranslations('Reservations')
  const [state, formAction, isPending] = useActionState(createReservationAction, {})

  // Show payment panel for non-members after successful booking
  if (state.success && state.needsPayment && state.reservationId) {
    return (
      <PaymentPanel
        reservationId={state.reservationId}
        priceCents={0} // Price is fetched server-side by the action
      />
    )
  }

  // Show success message for members
  if (state.success && !state.needsPayment) {
    if (onSuccess) onSuccess()
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
        <svg
          className="mx-auto h-8 w-8 text-green-400 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-green-400 font-semibold text-sm">
          {t('bookingConfirmed')}
        </p>
        <p className="text-white/90 text-xs mt-1">
          {t('bookingConfirmedSubtext')}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      {/* Hidden fields */}
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="startTime" value={startTime} />
      <input type="hidden" name="endTime" value={endTime} />
      <input type="hidden" name="bookingMode" value={bookingMode} />
      {spotNumber !== undefined && (
        <input type="hidden" name="spotNumber" value={spotNumber} />
      )}

      {/* VIP guest name input */}
      {isVip && (
        <div>
          <label className="text-white/90 text-xs block mb-1">
            {t('addGuest')}
          </label>
          <input
            type="text"
            name="guestName"
            placeholder={t('guestNamePlaceholder')}
            className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A3FF12] transition-colors"
          />
        </div>
      )}

      {/* Error display */}
      {state.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-red-400 text-xs">
            {t(`errors.${state.error}`)}
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#A3FF12] text-[#0F172A] font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending && (
          <div className="animate-spin h-4 w-4 border-2 border-[#0F172A] border-t-transparent rounded-full" />
        )}
        {isPending ? t('reservingSpot') : t('reserveSpot')}
      </button>
    </form>
  )
}
