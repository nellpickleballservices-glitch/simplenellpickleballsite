'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { setMaintenanceAction, clearMaintenanceAction } from '@/app/actions/admin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface MaintenanceFormProps {
  courtId: string
  courtName: string
  isInMaintenance: boolean
  onComplete: () => void
}

export function MaintenanceForm({
  courtId,
  courtName,
  isInMaintenance,
  onComplete,
}: MaintenanceFormProps) {
  const t = useTranslations('Admin')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSetMaintenance() {
    setLoading(true)
    setConfirmOpen(false)
    try {
      const result = await setMaintenanceAction(courtId, startDate, endDate)
      if (result.success) {
        setMessage(
          `${t('maintenanceSet')}. ${t('cancelledCount', { count: result.cancelledCount })}`
        )
        setTimeout(() => onComplete(), 1500)
      }
    } catch {
      setMessage('Error setting maintenance')
    } finally {
      setLoading(false)
    }
  }

  async function handleClearMaintenance() {
    setLoading(true)
    try {
      const result = await clearMaintenanceAction(courtId)
      if (result.success) {
        setMessage(t('maintenanceCleared'))
        setTimeout(() => onComplete(), 1500)
      }
    } catch {
      setMessage('Error clearing maintenance')
    } finally {
      setLoading(false)
    }
  }

  if (isInMaintenance) {
    return (
      <div className="bg-[#111b2e] rounded-lg p-4 mt-2 space-y-3">
        <p className="text-yellow-400 text-sm font-medium">
          {courtName} — {t('maintenanceActive')}
        </p>
        {message && <p className="text-green-400 text-sm">{message}</p>}
        <button
          onClick={handleClearMaintenance}
          disabled={loading}
          className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? t('saving') : t('clearMaintenance')}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#111b2e] rounded-lg p-4 mt-2 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('startDate')}</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('endDate')}</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>
      {message && <p className="text-green-400 text-sm">{message}</p>}
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={loading || !startDate || !endDate}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {t('setMaintenance')}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSetMaintenance}
        title={t('confirmMaintenanceTitle')}
        message={t('confirmMaintenanceMessage')}
        confirmLabel={t('setMaintenance')}
        destructive
        loading={loading}
      />
    </div>
  )
}
