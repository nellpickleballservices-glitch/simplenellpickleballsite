import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCourtAvailability, getAppConfigs } from '@/lib/queries/reservations'
import CourtCard from './CourtCard'

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; payment_cancelled?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('Reservations')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's membership status
  const { data: membership } = await supabase
    .from('memberships')
    .select('plan_type, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isMember = !!membership && membership.status === 'active'
  const isVip = isMember && membership.plan_type === 'vip'

  // Determine today's date in Santo Domingo timezone
  const today = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })

  // Fetch court availability for today
  const courts = await getCourtAvailability(today)

  // Fetch app config for advance booking windows
  const appConfigs = await getAppConfigs()
  const memberAdvanceHours = appConfigs['member_advance_booking_hours'] || 72
  const nonMemberAdvanceHours = appConfigs['non_member_advance_booking_hours'] || 24

  // Calculate max advance days based on membership
  const advanceHours = isMember ? memberAdvanceHours : nonMemberAdvanceHours
  const maxAdvanceDays = Math.floor(advanceHours / 24)

  return (
    <main className="min-h-screen bg-[#0a1628] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-bebas-neue text-4xl text-white mb-8 tracking-wide">
          {t('pageTitle')}
        </h1>

        {/* Stripe payment return banners */}
        {params.paid === 'true' && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
            <p className="text-green-400 font-semibold text-sm">{t('paidSuccess')}</p>
          </div>
        )}
        {params.payment_cancelled === 'true' && (
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
