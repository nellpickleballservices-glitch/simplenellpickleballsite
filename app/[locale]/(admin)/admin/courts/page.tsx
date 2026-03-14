'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getCourtsAction, type CourtWithLocation } from '@/app/actions/admin'
import { CourtForm } from './CourtForm'
import { MaintenanceForm } from './MaintenanceForm'

export default function AdminCourtsPage() {
  const t = useTranslations('Admin')
  const [courts, setCourts] = useState<CourtWithLocation[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [maintenanceCourtId, setMaintenanceCourtId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadCourts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCourtsAction()
      setCourts(data)
    } catch {
      // Error loading courts
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourts()
  }, [loadCourts])

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400">
            {t('courtOpen')}
          </span>
        )
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400">
            {t('maintenanceActive')}
          </span>
        )
      case 'closed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-400">
            {t('courtClosed')}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-offwhite">{t('courtManagement')}</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {showAddForm ? t('cancel') : t('addCourt')}
        </button>
      </div>

      {showAddForm && (
        <CourtForm
          onSuccess={() => {
            setShowAddForm(false)
            loadCourts()
          }}
        />
      )}

      {loading ? (
        <p className="text-gray-400">{t('loading')}</p>
      ) : (
        <div className="space-y-4 mt-4">
          {courts.map((court) => (
            <div key={court.id} className="bg-[#1E293B] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-offwhite font-semibold">{court.name}</h3>
                  <p className="text-sm text-gray-400">
                    {court.locations?.name}{court.locations?.address ? ` — ${court.locations.address}` : ''}
                  </p>
                  {(court.lat || court.lng) && (
                    <p className="text-xs text-gray-500 mt-1">
                      GPS: {court.lat}, {court.lng}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(court.status)}
                  <button
                    onClick={() =>
                      setMaintenanceCourtId(
                        maintenanceCourtId === court.id ? null : court.id
                      )
                    }
                    className="text-sm text-gray-400 hover:text-offwhite transition-colors"
                  >
                    {t('maintenanceMode')}
                  </button>
                </div>
              </div>

              {maintenanceCourtId === court.id && (
                <MaintenanceForm
                  courtId={court.id}
                  courtName={court.name}
                  isInMaintenance={court.status === 'maintenance'}
                  onComplete={() => {
                    setMaintenanceCourtId(null)
                    loadCourts()
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
