import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import MembershipCard from './MembershipCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getTranslations('Billing')

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

  // No membership — show subscribe banner
  if (!membership) {
    return (
      <main className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-[#BFFF00]/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-[#BFFF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('noMembershipBanner')}</h1>
          <Link
            href="/pricing"
            className="inline-block mt-4 px-6 py-3 rounded-lg bg-[#BFFF00] text-[#0a1628] font-semibold hover:bg-[#a8e600] transition-colors"
          >
            {t('viewPlans')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a1628] py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-8">
          {userName ? `${userName}` : 'Dashboard'}
        </h1>
        <MembershipCard membership={membership} userName={userName} />
      </div>
    </main>
  )
}
