'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

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
        <p className="text-white/90 text-xs mt-1">
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
          <p className="text-[#A3FF12] text-lg font-bold">{priceDisplay}</p>
        )}
      </div>

      {/* Cash payment option */}
      <button
        onClick={() => setCashConfirmed(true)}
        className="w-full bg-[#334155] text-white font-semibold py-2.5 rounded-lg border border-gray-600 hover:bg-[#243352] transition-colors"
      >
        {t('payment.payWithCash')}
      </button>
    </div>
  )
}
