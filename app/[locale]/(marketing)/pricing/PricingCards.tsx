'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createPortalSessionAction } from '@/app/actions/billing'
import { PlanConfirmation } from './PlanConfirmation'

type PlanType = 'vip' | 'basic'

interface PricingCardsProps {
  user: { id: string; email: string } | null
  membership: { status: string; plan_type: string } | null
  showCancelledMessage: boolean
}

export function PricingCards({ user, membership, showCancelledMessage }: PricingCardsProps) {
  const t = useTranslations('Billing')
  const [confirmingPlan, setConfirmingPlan] = useState<PlanType | null>(null)

  const isActiveMember = !!membership && membership.status === 'active'

  if (confirmingPlan) {
    return (
      <div className="max-w-md mx-auto">
        <PlanConfirmation
          planType={confirmingPlan}
          onCancel={() => setConfirmingPlan(null)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cancelled checkout banner */}
      {showCancelledMessage && (
        <div className="mb-8 border border-lime/40 bg-lime/5 rounded-xl px-6 py-4 text-center">
          <p className="text-offwhite/90 text-sm">{t('cancelledMessage')}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* VIP Plan Card */}
        <div className={`relative bg-charcoal border rounded-2xl p-8 flex flex-col ${
          isActiveMember && membership.plan_type === 'vip'
            ? 'border-lime shadow-lg shadow-lime/10'
            : 'border-charcoal/50'
        }`}>
          {/* Recommended badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-lime text-midnight text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
              Recommended
            </span>
          </div>

          {isActiveMember && membership.plan_type === 'vip' && (
            <div className="absolute -top-3 right-4">
              <span className="bg-turquoise text-midnight text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                {t('currentPlan')}
              </span>
            </div>
          )}

          <h3 className="font-bebas-neue text-3xl text-offwhite tracking-wide mt-4 mb-2">
            {t('vipName')}
          </h3>

          <div className="flex items-baseline gap-1 mb-6">
            <span className="font-bebas-neue text-5xl text-lime">{t('vipPrice')}</span>
            <span className="text-offwhite/50 text-sm">{t('vipPeriod')}</span>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {(['vipFeature1', 'vipFeature2', 'vipFeature3', 'vipFeature4'] as const).map((key) => (
              <li key={key} className="flex items-center gap-3 text-offwhite/80 text-sm">
                <span className="text-lime">&#10003;</span>
                {t(key)}
              </li>
            ))}
          </ul>

          <PlanCTA
            planType="vip"
            user={user}
            isActiveMember={isActiveMember}
            isCurrentPlan={isActiveMember && membership?.plan_type === 'vip'}
            onSubscribe={() => setConfirmingPlan('vip')}
            t={t}
          />

          <p className="text-offwhite/30 text-xs text-center mt-3">
            {t('securedByStripe')}
          </p>
        </div>

        {/* Basic Plan Card */}
        <div className={`relative bg-charcoal border rounded-2xl p-8 flex flex-col ${
          isActiveMember && membership.plan_type === 'basic'
            ? 'border-lime shadow-lg shadow-lime/10'
            : 'border-charcoal/50'
        }`}>
          {isActiveMember && membership.plan_type === 'basic' && (
            <div className="absolute -top-3 right-4">
              <span className="bg-turquoise text-midnight text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                {t('currentPlan')}
              </span>
            </div>
          )}

          <h3 className="font-bebas-neue text-3xl text-offwhite tracking-wide mt-4 mb-2">
            {t('basicName')}
          </h3>

          <div className="flex items-baseline gap-1 mb-6">
            <span className="font-bebas-neue text-5xl text-lime">{t('basicPrice')}</span>
            <span className="text-offwhite/50 text-sm">{t('basicPeriod')}</span>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {(['basicFeature1', 'basicFeature2', 'basicFeature3', 'basicFeature4'] as const).map((key) => (
              <li key={key} className="flex items-center gap-3 text-offwhite/80 text-sm">
                <span className="text-lime">&#10003;</span>
                {t(key)}
              </li>
            ))}
          </ul>

          <PlanCTA
            planType="basic"
            user={user}
            isActiveMember={isActiveMember}
            isCurrentPlan={isActiveMember && membership?.plan_type === 'basic'}
            onSubscribe={() => setConfirmingPlan('basic')}
            t={t}
          />

          <p className="text-offwhite/30 text-xs text-center mt-3">
            {t('securedByStripe')}
          </p>
        </div>
      </div>
    </div>
  )
}

function PlanCTA({
  planType,
  user,
  isActiveMember,
  isCurrentPlan,
  onSubscribe,
  t,
}: {
  planType: PlanType
  user: { id: string; email: string } | null
  isActiveMember: boolean
  isCurrentPlan: boolean
  onSubscribe: () => void
  t: ReturnType<typeof useTranslations<'Billing'>>
}) {
  // Guest: sign up CTA
  if (!user) {
    return (
      <Link
        href="/signup"
        className="block w-full text-center bg-lime text-midnight font-semibold py-3 rounded-full hover:opacity-90 transition-opacity"
      >
        {t('signupCta')}
      </Link>
    )
  }

  // Active member viewing current plan: manage subscription
  if (isCurrentPlan) {
    return (
      <form action={createPortalSessionAction}>
        <button
          type="submit"
          className="w-full bg-turquoise text-midnight font-semibold py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          {t('manageCta')}
        </button>
      </form>
    )
  }

  // Active member viewing other plan: also manage (portal handles upgrades/downgrades)
  if (isActiveMember) {
    return (
      <form action={createPortalSessionAction}>
        <button
          type="submit"
          className="w-full bg-lime/80 text-midnight font-semibold py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          {t('manageCta')}
        </button>
      </form>
    )
  }

  // Logged in, no plan: subscribe CTA
  return (
    <button
      onClick={onSubscribe}
      className="w-full bg-lime text-midnight font-semibold py-3 rounded-full hover:opacity-90 transition-opacity"
    >
      {t('subscribeCta')}
    </button>
  )
}
