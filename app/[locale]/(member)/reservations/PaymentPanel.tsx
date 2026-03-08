'use client'

import { useState, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { createSessionPaymentAction } from '@/app/actions/sessionPayment'

interface PaymentPanelProps {
  reservationId: string
  priceCents: number
}

export default function PaymentPanel({
  reservationId,
  priceCents,
}: PaymentPanelProps) {
  const t = useTranslations('Reservations')
  const [cashConfirmed, setCashConfirmed] = useState(false)
  const [stripeState, stripeAction, isStripePending] = useActionState(
    createSessionPaymentAction,
    {}
  )

  if (cashConfirmed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
        <svg
          className="mx-auto h-8 w-8 text-amber-400 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-amber-400 font-semibold text-sm">
          {t('payment.cashReserved')}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {t('payment.cashInstructions')}
        </p>
      </div>
    )
  }

  const priceDisplay = priceCents > 0
    ? `$${(priceCents / 100).toFixed(2)}`
    : ''

  return (
    <div className="space-y-3">
      <div className="text-center mb-2">
        <p className="text-white font-semibold text-sm">
          {t('payment.title')}
        </p>
        {priceDisplay && (
          <p className="text-[#39FF14] text-lg font-bold">{priceDisplay}</p>
        )}
      </div>

      {/* Stripe payment option */}
      <form action={stripeAction}>
        <input type="hidden" name="reservationId" value={reservationId} />
        <button
          type="submit"
          disabled={isStripePending}
          className="w-full bg-[#635BFF] text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isStripePending && (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          )}
          {t('payment.payWithStripe')}
        </button>
      </form>

      {/* Stripe error */}
      {stripeState.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-red-400 text-xs">
            {t(`errors.${stripeState.error}`)}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-500 text-xs">{t('payment.or')}</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      {/* Cash payment option */}
      <button
        onClick={() => setCashConfirmed(true)}
        className="w-full bg-[#1a2744] text-gray-300 font-semibold py-2.5 rounded-lg border border-gray-600 hover:bg-[#243352] transition-colors"
      >
        {t('payment.payWithCash')}
      </button>
    </div>
  )
}
