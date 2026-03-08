import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { PricingCards } from './PricingCards'

type SearchParams = Promise<{ cancelled?: string }>

export default async function PricingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const t = await getTranslations('Billing')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let membership: { status: string; plan_type: string } | null = null

  if (user) {
    const { data } = await supabase
      .from('memberships')
      .select('status, plan_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    membership = data
  }

  const params = await searchParams
  const showCancelledMessage = params.cancelled === 'true'

  return (
    <main className="min-h-screen bg-midnight py-16 px-4">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="font-bebas-neue text-5xl md:text-6xl text-offwhite tracking-wide mb-4">
          {t('pricingTitle')}
        </h1>
        <p className="text-lg text-offwhite/70">
          {t('pricingSubtitle')}
        </p>
      </div>

      <PricingCards
        user={user ? { id: user.id, email: user.email ?? '' } : null}
        membership={membership}
        showCancelledMessage={showCancelledMessage}
      />
    </main>
  )
}
