import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getLocationsWithCourtCounts } from '@/lib/queries/locations'
import SelectLocationForm from './SelectLocationForm'

export default async function SelectLocationPage() {
  const supabase = await createClient()
  const t = await getTranslations('Reservations')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user has basic membership without a location set
  const { data: membership } = await supabase
    .from('memberships')
    .select('plan_type, status, location_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/pricing')
  }

  // VIP members don't need to select a home location
  if (membership.plan_type === 'vip') {
    redirect('/r3s-x7m1')
  }

  // If they already have a location set, redirect to their courts
  if (membership.location_id) {
    redirect(`/r3s-x7m1/${membership.location_id}`)
  }

  const locations = await getLocationsWithCourtCounts()

  return (
    <main className="min-h-screen bg-[#0F172A] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-bebas-neue text-4xl text-white mb-2 tracking-wide">
          {t('selectHomeTitle')}
        </h1>
        <p className="text-white/90 mb-8 max-w-2xl">
          {t('selectHomeDescription')}
        </p>

        <SelectLocationForm locations={locations} />
      </div>
    </main>
  )
}
