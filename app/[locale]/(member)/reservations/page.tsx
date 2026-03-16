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

  const locations = await getLocationsWithCourtCounts()

  return (
    <main className="min-h-screen bg-[#0F172A] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-bebas-neue text-4xl text-white mb-2 tracking-wide">
          {t('pageTitle')}
        </h1>
        <p className="text-gray-400 mb-8 max-w-2xl">
          {t('locationsIntro')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>

        {locations.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">{t('noLocations')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
