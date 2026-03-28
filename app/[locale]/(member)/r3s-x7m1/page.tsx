import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getLocationsWithCourtCounts } from '@/lib/queries/locations'
import LocationCard from './LocationCard'

export default async function ReservationsPage() {
  const supabase = await createClient()
  const t = await getTranslations('Reservations')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check membership for location-based access control
  const { data: membership } = await supabase
    .from('memberships')
    .select('plan_type, status, location_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isMember = !!membership
  const isVip = isMember && membership.plan_type === 'vip'

  // Basic members: redirect to their home location or to location selection
  if (isMember && !isVip) {
    if (membership.location_id) {
      // Already has a home location — go straight to their courts
      redirect(`/r3s-x7m1/${membership.location_id}`)
    } else {
      // Needs to choose a home location first
      redirect('/r3s-x7m1/select-location')
    }
  }

  // VIP members and non-members see all locations
  const locations = await getLocationsWithCourtCounts()

  return (
    <main className="min-h-screen bg-[#0F172A] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-bebas-neue text-4xl text-white mb-2 tracking-wide">
          {t('pageTitle')}
        </h1>
        <p className="text-white/90 mb-6 max-w-2xl">
          {t('locationsIntro')}
        </p>

        {/* How to Book — visual stepper */}
        <div className="relative mb-10 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-charcoal/80 to-midnight p-6 sm:p-8 overflow-hidden">
          {/* Subtle glow accent */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-lime/[0.06] blur-3xl" />

          <h2 className="font-bebas-neue text-2xl tracking-wider text-white mb-6 relative z-10">
            {t('howToBookTitle')}
          </h2>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { step: 1, icon: '📍', text: t('howToBookStep1') },
              { step: 2, icon: '🏟️', text: t('howToBookStep2') },
              { step: 3, icon: '⏰', text: t('howToBookStep3') },
              { step: 4, icon: '✅', text: t('howToBookStep4') },
            ].map(({ step, icon, text }) => (
              <div key={step} className="group flex items-start gap-3">
                {/* Step number badge */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime/10 border border-lime/20 text-lg group-hover:bg-lime/20 transition-colors duration-300">
                    <span>{icon}</span>
                  </div>
                  {/* Step number */}
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-[10px] font-bold text-midnight">
                    {step}
                  </span>
                </div>
                {/* Step text */}
                <p className="text-sm text-white leading-relaxed pt-2">
                  {text}
                </p>
              </div>
            ))}
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>

        {locations.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/90 text-lg">{t('noLocations')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
