import { getTranslations } from 'next-intl/server'
import { getAdminStatsAction } from '@/app/actions/admin'
import { StatCard } from '@/components/admin/StatCard'

export default async function AdminDashboardPage() {
  const t = await getTranslations('Admin')
  const stats = await getAdminStatsAction()

  return (
    <div>
      <h1 className="text-2xl font-bold text-offwhite mb-6">{t('dashboard')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('totalUsers')}
          value={stats.totalUsers}
          icon={'\u2603'}
        />
        <StatCard
          title={t('activeMembers')}
          value={stats.activeMembers}
          icon={'\u2605'}
        />
        <StatCard
          title={t('todayReservations')}
          value={stats.todayReservations}
          icon={'\u2637'}
        />
        <StatCard
          title={t('upcomingEvents')}
          value={stats.upcomingEvents}
          icon={'\u2302'}
        />
      </div>
    </div>
  )
}
