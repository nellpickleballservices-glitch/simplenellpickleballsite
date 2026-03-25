'use client'

import { useTranslations } from 'next-intl'
import { createCheckoutSessionAction } from '@/app/actions/billing'

interface PlanConfirmationProps {
  planType: 'vip' | 'basic'
  onCancel: () => void
}

export function PlanConfirmation({ planType, onCancel }: PlanConfirmationProps) {
  const t = useTranslations('Billing')

  const planName = planType === 'vip' ? t('vipName') : t('basicName')
  const planPrice = planType === 'vip'
    ? `${t('vipPrice')}${t('vipPeriod')}`
    : `${t('basicPrice')}${t('basicPeriod')}`

  const handleProceed = async () => {
    await createCheckoutSessionAction(planType)
  }

  return (
    <div className="bg-charcoal border border-charcoal/50 rounded-2xl p-8 text-center">
      <h2 className="font-bebas-neue text-3xl text-offwhite tracking-wide mb-6">
        {t('confirmTitle')}
      </h2>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center border-b border-offwhite/10 pb-3">
          <span className="text-white/90 text-sm">{t('confirmPlan')}</span>
          <span className="text-offwhite font-semibold">{planName}</span>
        </div>
        <div className="flex justify-between items-center border-b border-offwhite/10 pb-3">
          <span className="text-white/90 text-sm">{t('confirmPrice')}</span>
          <span className="text-lime font-semibold">{planPrice}</span>
        </div>
      </div>

      <p className="text-white/80 text-xs mb-6">{t('confirmBilling')}</p>

      <div className="space-y-3">
        <form action={handleProceed}>
          <button
            type="submit"
            className="w-full bg-lime text-midnight font-semibold py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            {t('confirmProceed')}
          </button>
        </form>

        <button
          onClick={onCancel}
          className="w-full text-white/90 hover:text-offwhite text-sm py-2 transition-colors"
        >
          {t('confirmCancel')}
        </button>
      </div>

      <p className="text-offwhite/30 text-xs mt-4">{t('securedByStripe')}</p>
    </div>
  )
}
