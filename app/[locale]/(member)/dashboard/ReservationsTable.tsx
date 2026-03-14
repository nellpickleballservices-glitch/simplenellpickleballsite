'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CancelDialog from './CancelDialog'

interface ReservationRow {
  id: string
  starts_at: string
  ends_at: string
  status: string
  payment_status: string
  court_name: string
}

interface ReservationsTableProps {
  reservations: ReservationRow[]
  cancellationWindowHours: number
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400',
  pending_payment: 'bg-amber-500/20 text-amber-400',
  paid: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(isoString))
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(isoString))
}

export default function ReservationsTable({
  reservations,
  cancellationWindowHours,
}: ReservationsTableProps) {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<ReservationRow | null>(null)

  if (reservations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm mb-3">{t('noReservations')}</p>
        <Link
          href="/reservations"
          className="text-[#A3FF12] text-sm font-semibold hover:underline"
        >
          {t('bookNow')}
        </Link>
      </div>
    )
  }

  const canCancel = (startsAt: string): boolean => {
    const start = new Date(startsAt)
    const now = new Date()
    const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntil >= cancellationWindowHours
  }

  const statusLabels: Record<string, string> = {
    confirmed: t('statusConfirmed'),
    pending_payment: t('statusPendingPayment'),
    paid: t('statusPaid'),
    cancelled: t('statusCancelled'),
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="space-y-3 sm:hidden">
        {reservations.map((r) => (
          <div key={r.id} className="bg-[#0F172A] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">{r.court_name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || statusColors.confirmed}`}>
                {statusLabels[r.status] || r.status}
              </span>
            </div>
            <div className="text-gray-400 text-xs">
              {formatDate(r.starts_at)} &middot; {formatTime(r.starts_at)} - {formatTime(r.ends_at)}
            </div>
            <div className="flex items-center justify-end gap-2">
              {r.status === 'pending_payment' && (
                <Link
                  href={`/reservations?pay=${r.id}`}
                  className="text-xs text-amber-400 font-semibold hover:underline"
                >
                  {t('payNow')}
                </Link>
              )}
              {r.status !== 'cancelled' && r.status !== 'pending_payment' && (
                canCancel(r.starts_at) ? (
                  <button
                    onClick={() => setCancelTarget(r)}
                    className="text-xs text-red-400 font-semibold hover:underline"
                  >
                    {t('cancelButton')}
                  </button>
                ) : (
                  <span
                    className="text-xs text-gray-500 cursor-not-allowed"
                    title={t('cancelWindowPassed')}
                  >
                    {t('cancelButton')}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-700">
              <th className="text-left py-2 font-medium">{t('headerDate')}</th>
              <th className="text-left py-2 font-medium">{t('headerTime')}</th>
              <th className="text-left py-2 font-medium">{t('headerCourt')}</th>
              <th className="text-left py-2 font-medium">{t('headerStatus')}</th>
              <th className="text-right py-2 font-medium">{t('headerActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {reservations.map((r) => (
              <tr key={r.id} className="text-white">
                <td className="py-2.5">{formatDate(r.starts_at)}</td>
                <td className="py-2.5">{formatTime(r.starts_at)} - {formatTime(r.ends_at)}</td>
                <td className="py-2.5">{r.court_name}</td>
                <td className="py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || statusColors.confirmed}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  {r.status === 'pending_payment' && (
                    <Link
                      href={`/reservations?pay=${r.id}`}
                      className="text-xs text-amber-400 font-semibold hover:underline mr-3"
                    >
                      {t('payNow')}
                    </Link>
                  )}
                  {r.status !== 'cancelled' && r.status !== 'pending_payment' && (
                    canCancel(r.starts_at) ? (
                      <button
                        onClick={() => setCancelTarget(r)}
                        className="text-xs text-red-400 font-semibold hover:underline"
                      >
                        {t('cancelButton')}
                      </button>
                    ) : (
                      <span
                        className="text-xs text-gray-500 cursor-not-allowed"
                        title={t('cancelWindowPassed')}
                      >
                        {t('cancelButton')}
                      </span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cancel confirmation dialog */}
      {cancelTarget && (
        <CancelDialog
          reservationId={cancelTarget.id}
          courtName={cancelTarget.court_name}
          date={formatDate(cancelTarget.starts_at)}
          time={`${formatTime(cancelTarget.starts_at)} - ${formatTime(cancelTarget.ends_at)}`}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => {
            setCancelTarget(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
