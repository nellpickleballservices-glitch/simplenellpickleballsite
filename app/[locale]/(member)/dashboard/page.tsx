import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import MembershipCard from './MembershipCard'
import ReservationsTable from './ReservationsTable'

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getTranslations('Billing')
  const tDash = await getTranslations('Dashboard')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('plan_type, status, current_period_end, stripe_customer_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const userName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : ''

  // Fetch upcoming reservations
  const now = new Date().toISOString()
  const { data: reservationsRaw } = await supabase
    .from('reservations')
    .select('id, starts_at, ends_at, status, payment_status, court_id')
    .eq('user_id', user.id)
    .gt('starts_at', now)
    .not('status', 'in', '("cancelled","expired")')
    .order('starts_at', { ascending: true })

  // Fetch court names for reservations
  const courtIds = [...new Set((reservationsRaw || []).map(r => r.court_id))]
  let courtNameMap: Record<string, string> = {}
  if (courtIds.length > 0) {
    const { data: courts } = await supabase
      .from('courts')
      .select('id, name')
      .in('id', courtIds)
    if (courts) {
      courtNameMap = Object.fromEntries(courts.map(c => [c.id, c.name]))
    }
  }

  const reservations = (reservationsRaw || []).map(r => ({
    id: r.id,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    status: r.status,
    payment_status: r.payment_status,
    court_name: courtNameMap[r.court_id] || 'Court',
  }))

  // Fetch cancellation window config
  const { data: windowConfig } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'cancellation_window_hours')
    .single()

  const cancellationWindowHours = windowConfig?.value ?? 2

  // No membership — show subscribe banner
  if (!membership) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-[#BFFF00]/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-[#BFFF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('noMembershipBanner')}</h1>
          <Link
            href="/#membership-plans"
            className="inline-block mt-4 px-6 py-3 rounded-lg bg-[#BFFF00] text-[#0F172A] font-semibold hover:bg-[#a8e600] transition-colors"
          >
            {t('viewPlans')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0F172A] py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">
            {userName ? `${userName}` : 'Dashboard'}
          </h1>
          <Link
            href="/dashboard/settings"
            className="text-white/90 hover:text-white transition-colors text-sm"
          >
            {tDash('settings')}
          </Link>
        </div>

        <MembershipCard membership={membership} userName={userName} />

        {/* Upcoming Reservations */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            {tDash('upcomingReservations')}
          </h2>
          <ReservationsTable
            reservations={reservations}
            cancellationWindowHours={cancellationWindowHours}
          />
        </div>
      </div>
    </main>
  )
}
