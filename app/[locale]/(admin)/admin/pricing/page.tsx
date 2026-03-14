import { getTranslations } from 'next-intl/server'
import { getSessionPricingAction, getTouristSurchargeAction } from '@/app/actions/admin/pricing'
import { PricingGrid } from './PricingGrid'
import { SurchargeEditor } from './SurchargeEditor'

export default async function AdminPricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('Admin')

  const [pricingData, surchargeValue] = await Promise.all([
    getSessionPricingAction(),
    getTouristSurchargeAction(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-offwhite mb-6">{t('pricingConfig')}</h1>
      <SurchargeEditor initialValue={surchargeValue} />
      <PricingGrid initialData={pricingData} locale={locale} />
    </div>
  )
}
