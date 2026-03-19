import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCourtAvailability, getAppConfigs } from '@/lib/queries/reservations'
import { calculateSessionPrice, isTourist } from '@/lib/utils/pricing'
import CourtCard from '../CourtCard'
import Link from 'next/link'

export default async function LocationCourtsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>
  searchParams: Promise<{ paid?: string; payment_cancelled?: string }>
}) {
  const { locationId } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('Reservations')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch location details
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single()

  if (!location) {
    notFound()
  }

  // Fetch user's membership status
  const { data: membership } = await supabase
    .from('memberships')
    .select('plan_type, status, location_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isMember = !!membership && membership.status === 'active'
  const isVip = isMember && membership.plan_type === 'vip'

  // Basic members: enforce home location access
  if (isMember && !isVip) {
    if (!membership.location_id) {
      // Hasn't chosen a home location yet
      redirect('/reservations/select-location')
    }
    if (membership.location_id !== locationId) {
      // Trying to access a location that isn't their home
      redirect(`/reservations/${membership.location_id}`)
    }
  }

  // Get user country for pricing (server-side only, per PRIC-05)
  const { data: profile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', user.id)
    .single()
  const userIsTourist = isTourist(profile?.country ?? null)

  // Determine today's date in Santo Domingo timezone
  const today = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })

  // Fetch court availability for this location only
  const courtsRaw = await getCourtAvailability(today, undefined, locationId)

  // Compute displayPriceCents for each court (PRIC-05: server-side only)
  const courts = courtsRaw.map((courtData) => {
    const basePriceCents = courtData.sessionPriceCents ?? courtData.defaultPriceCents ?? 1000
    const surchargePercent = courtData.touristSurchargePct ?? 0
    const displayPriceCents = isMember
      ? 0
      : calculateSessionPrice({ basePriceCents, surchargePercent, isTourist: userIsTourist }).totalCents
    return { ...courtData, displayPriceCents }
  })

  // Fetch app config for advance booking windows
  const appConfigs = await getAppConfigs()
  const memberAdvanceHours = appConfigs['member_advance_booking_hours'] || 72
  const nonMemberAdvanceHours = appConfigs['non_member_advance_booking_hours'] || 24

  const advanceHours = isMember ? memberAdvanceHours : nonMemberAdvanceHours
  const maxAdvanceDays = Math.floor(advanceHours / 24)

  return (
    <main className="min-h-screen bg-[#0F172A] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back link */}
        <Link
          href="/reservations"
          className="text-gray-400 hover:text-lime text-sm mb-4 inline-block transition-colors"
        >
          ← {t('backToLocations')}
        </Link>

        {/* Location header */}
        <h1 className="font-bebas-neue text-4xl text-white mb-2 tracking-wide">
          {location.name}
        </h1>
        <p className="text-gray-400 mb-8 max-w-2xl">
          {t('locationCourtsIntro', { location: location.name })}
        </p>

        {/* Stripe payment return banners */}
        {sp.paid === 'true' && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
            <p className="text-green-400 font-semibold text-sm">{t('paidSuccess')}</p>
          </div>
        )}
        {sp.payment_cancelled === 'true' && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
            <p className="text-amber-400 font-semibold text-sm">{t('paymentCancelled')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((courtData) => (
            <CourtCard
              key={courtData.court.id}
              courtData={courtData}
              isMember={isMember}
              isVip={isVip}
              maxAdvanceDays={maxAdvanceDays}
              today={today}
            />
          ))}
        </div>

        {courts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">{t('noCourts')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
