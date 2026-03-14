'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  getAllReservationsAction,
  getCourtsAction,
  adminCancelReservationAction,
  markCashPaidAction,
  type AdminReservation,
  type CourtWithLocation,
} from '@/app/actions/admin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { AdminReservationForm } from './AdminReservationForm'

export default function AdminReservationsPage() {
  const t = useTranslations('Admin')
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [courts, setCourts] = useState<CourtWithLocation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [courtId, setCourtId] = useState('')
  const [status, setStatus] = useState('')

  // Confirm dialog
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  const perPage = 20
  const totalPages = Math.ceil(total / perPage)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [reservationData, courtData] = await Promise.all([
        getAllReservationsAction({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          courtId: courtId || undefined,
          status: status || undefined,
          page,
        }),
        getCourtsAction(),
      ])
      setReservations(reservationData.reservations)
      setTotal(reservationData.total)
      setCourts(courtData)
    } catch {
      // Error loading data
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, courtId, status, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCancel(reservationId: string) {
    setActionLoading(true)
    try {
      await adminCancelReservationAction(reservationId)
      setMessage(t('reservationCancelled'))
      setCancelTarget(null)
      loadData()
    } catch {
      setMessage('Error cancelling reservation')
    } finally {
      setActionLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleMarkPaid(reservationId: string) {
    setActionLoading(true)
    try {
      await markCashPaidAction(reservationId)
      setMessage(t('cashMarkedPaid'))
      loadData()
    } catch {
      setMessage('Error marking payment')
    } finally {
      setActionLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  function getStatusBadge(s: string) {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-900/50 text-green-400',
      pending_payment: 'bg-yellow-900/50 text-yellow-400',
      cancelled: 'bg-red-900/50 text-red-400',
      expired: 'bg-gray-700/50 text-gray-400',
    }
    const labels: Record<string, string> = {
      confirmed: t('confirmed'),
      pending_payment: t('pendingPayment'),
      cancelled: t('cancelled'),
      expired: t('expired'),
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[s] ?? 'bg-gray-700/50 text-gray-400'}`}>
        {labels[s] ?? s}
      </span>
    )
  }

  function getPaymentBadge(ps: string) {
    const styles: Record<string, string> = {
      free: 'bg-gray-700/50 text-gray-400',
      paid: 'bg-green-900/50 text-green-400',
      pending_payment: 'bg-yellow-900/50 text-yellow-400',
      cash_pending: 'bg-orange-900/50 text-orange-400',
    }
    const labels: Record<string, string> = {
      free: 'Free',
      paid: t('paid'),
      pending_payment: t('pendingPayment'),
      cash_pending: t('cashPending'),
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[ps] ?? 'bg-gray-700/50 text-gray-400'}`}>
        {labels[ps] ?? ps}
      </span>
    )
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('en-CA'),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-offwhite">{t('allReservations')}</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {showCreateForm ? t('cancel') : t('createReservation')}
        </button>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 bg-green-900/30 text-green-400 rounded-lg text-sm">
          {message}
        </div>
      )}

      {showCreateForm && (
        <AdminReservationForm
          courts={courts}
          onSuccess={() => {
            setShowCreateForm(false)
            setMessage(t('reservationCreated'))
            loadData()
            setTimeout(() => setMessage(''), 3000)
          }}
        />
      )}

      {/* Filters */}
      <div className="bg-[#1E293B] rounded-lg p-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('startDate')}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('endDate')}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('filterByCourt')}</label>
          <select
            value={courtId}
            onChange={(e) => { setCourtId(e.target.value); setPage(1) }}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          >
            <option value="">{t('allCourts')}</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('filterByStatus')}</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="confirmed">{t('confirmed')}</option>
            <option value="pending_payment">{t('pendingPayment')}</option>
            <option value="cancelled">{t('cancelled')}</option>
            <option value="expired">{t('expired')}</option>
          </select>
        </div>
      </div>

      {/* Reservation table */}
      {loading ? (
        <p className="text-gray-400 mt-6">{t('loading')}</p>
      ) : reservations.length === 0 ? (
        <p className="text-gray-400 mt-6">{t('noReservations')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-3 px-2">{t('user')}</th>
                <th className="py-3 px-2">{t('court')}</th>
                <th className="py-3 px-2">{t('date')}</th>
                <th className="py-3 px-2">{t('time')}</th>
                <th className="py-3 px-2">{t('status')}</th>
                <th className="py-3 px-2">{t('paymentStatus')}</th>
                <th className="py-3 px-2">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const start = formatDateTime(r.starts_at)
                const end = formatDateTime(r.ends_at)
                const userName = r.created_by_admin && r.guest_name
                  ? `${r.guest_name} (${t('guest')})`
                  : `${r.reservation_user_first_name} ${r.reservation_user_last_name}`

                return (
                  <tr key={r.id} className="border-b border-gray-800 text-offwhite">
                    <td className="py-3 px-2">{userName}</td>
                    <td className="py-3 px-2">{r.courts?.name ?? '—'}</td>
                    <td className="py-3 px-2">{start.date}</td>
                    <td className="py-3 px-2">{start.time} - {end.time}</td>
                    <td className="py-3 px-2">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-2">{getPaymentBadge(r.payment_status)}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        {r.status !== 'cancelled' && r.status !== 'expired' && (
                          <button
                            onClick={() => setCancelTarget(r.id)}
                            className="text-red-400 hover:text-red-300 text-xs transition-colors"
                          >
                            {t('cancelReservation')}
                          </button>
                        )}
                        {r.payment_status === 'cash_pending' && (
                          <button
                            onClick={() => handleMarkPaid(r.id)}
                            disabled={actionLoading}
                            className="text-lime hover:text-lime/80 text-xs transition-colors"
                          >
                            {t('markCashPaid')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="text-sm text-gray-400 hover:text-offwhite disabled:opacity-50 transition-colors"
          >
            {t('previous')}
          </button>
          <span className="text-sm text-gray-400">
            {t('page', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="text-sm text-gray-400 hover:text-offwhite disabled:opacity-50 transition-colors"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
        title={t('confirmCancelReservation')}
        message={t('confirmCancelReservationMessage')}
        confirmLabel={t('cancelReservation')}
        destructive
        loading={actionLoading}
      />
    </div>
  )
}
