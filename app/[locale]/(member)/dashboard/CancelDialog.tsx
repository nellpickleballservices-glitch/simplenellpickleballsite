'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { cancelReservationAction } from '@/app/actions/reservations'

interface CancelDialogProps {
  reservationId: string
  courtName: string
  date: string
  time: string
  onClose: () => void
  onCancelled: () => void
}

export default function CancelDialog({
  reservationId,
  courtName,
  date,
  time,
  onClose,
  onCancelled,
}: CancelDialogProps) {
  const t = useTranslations('Dashboard')
  const [state, formAction, isPending] = useActionState(cancelReservationAction, {})

  // On success, notify parent and close
  if (state.success) {
    onCancelled()
    onClose()
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#111b2e] rounded-xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
        <div className="p-6">
          <h3 className="text-white font-semibold text-lg mb-2">
            {t('cancelTitle')}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {t('cancelConfirmation')}
          </p>

          {/* Reservation details */}
          <div className="bg-[#0a1628] rounded-lg p-3 mb-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('court')}</span>
              <span className="text-white">{courtName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('date')}</span>
              <span className="text-white">{date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t('time')}</span>
              <span className="text-white">{time}</span>
            </div>
          </div>

          {/* Error display */}
          {state.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
              <p className="text-red-400 text-xs">
                {t(`errors.${state.error}`)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="reservationId" value={reservationId} />
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {t('cancelYes')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#1a2744] text-gray-300 font-semibold py-2.5 rounded-lg hover:bg-[#243352] transition-colors"
            >
              {t('cancelNo')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
