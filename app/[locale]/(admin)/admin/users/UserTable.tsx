'use client'

import { useTranslations } from 'next-intl'
import type { UserWithDetails } from '@/lib/types/admin'

interface UserTableProps {
  users: UserWithDetails[]
  total: number
  page: number
  onPageChange: (page: number) => void
  onSelectUser: (userId: string) => void
}

function StatusBadge({ user, t }: { user: UserWithDetails; t: ReturnType<typeof useTranslations> }) {
  if (user.is_banned) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300">
        {t('userBanned')}
      </span>
    )
  }

  if (!user.membership_status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-white">
        {t('noMembership')}
      </span>
    )
  }

  const statusStyles: Record<string, string> = {
    active: 'bg-green-900/50 text-green-300',
    past_due: 'bg-yellow-900/50 text-yellow-300',
    cancelled: 'bg-red-900/50 text-red-300',
  }

  const statusLabels: Record<string, string> = {
    active: t('membershipActive'),
    past_due: t('membershipPastDue'),
    cancelled: t('membershipCancelled'),
  }

  const style = statusStyles[user.membership_status] ?? 'bg-gray-700 text-white'
  const label = statusLabels[user.membership_status] ?? user.membership_status

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}

export function UserTable({ users, total, page, onPageChange, onSelectUser }: UserTableProps) {
  const t = useTranslations('Admin')
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs font-medium text-white/90 uppercase tracking-wider py-3 px-4">
                {t('userName')}
              </th>
              <th className="text-left text-xs font-medium text-white/90 uppercase tracking-wider py-3 px-4">
                {t('userEmail')}
              </th>
              <th className="text-left text-xs font-medium text-white/90 uppercase tracking-wider py-3 px-4">
                {t('userPlan')}
              </th>
              <th className="text-left text-xs font-medium text-white/90 uppercase tracking-wider py-3 px-4">
                {t('userStatus')}
              </th>
              <th className="text-left text-xs font-medium text-white/90 uppercase tracking-wider py-3 px-4">
                {t('joinedDate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-white/90 py-8">
                  {t('noResults')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => onSelectUser(user.id)}
                  className="border-b border-gray-700/50 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-offwhite text-sm">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="py-3 px-4 text-white text-sm">
                    {user.email}
                  </td>
                  <td className="py-3 px-4 text-white text-sm capitalize">
                    {user.membership_plan ?? '-'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge user={user} t={t} />
                  </td>
                  <td className="py-3 px-4 text-white/90 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm text-white hover:text-offwhite disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('previousPage')}
          </button>
          <span className="text-sm text-white/90">
            {t('pageOf', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm text-white hover:text-offwhite disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('nextPage')}
          </button>
        </div>
      )}
    </div>
  )
}
