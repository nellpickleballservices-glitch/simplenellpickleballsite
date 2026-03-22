'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getCourtsAction, updateCourtAddressAction, deleteCourtAction, type CourtWithLocation } from '@/app/actions/admin'
import { CourtForm } from './CourtForm'
import { MaintenanceForm } from './MaintenanceForm'
import { CourtConfigForm } from './CourtConfigForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

export default function AdminCourtsPage() {
  const t = useTranslations('Admin')
  const [courts, setCourts] = useState<CourtWithLocation[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [maintenanceCourtId, setMaintenanceCourtId] = useState<string | null>(null)
  const [configCourtId, setConfigCourtId] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressDraft, setAddressDraft] = useState('')
  const [addressSaving, setAddressSaving] = useState(false)
  const [deleteCourtId, setDeleteCourtId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCourts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCourtsAction()
      setCourts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourts()
  }, [loadCourts])

  async function saveAddress(courtId: string) {
    setAddressSaving(true)
    try {
      const result = await updateCourtAddressAction(courtId, addressDraft)
      if (result.success) {
        setEditingAddressId(null)
        loadCourts()
      }
    } catch {
      // ignore
    } finally {
      setAddressSaving(false)
    }
  }

  async function handleDeleteCourt() {
    if (!deleteCourtId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const result = await deleteCourtAction(deleteCourtId)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setDeleteCourtId(null)
        loadCourts()
      }
    } catch {
      setDeleteError('Failed to delete court')
    } finally {
      setDeleting(false)
    }
  }

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

      {error && (
        <p className="text-red-400 mt-4">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-400">{t('loading')}</p>
      ) : !error && (
        <div className="space-y-4 mt-4">
          {courts.map((court) => (
            <div key={court.id} className="bg-[#1E293B] rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-offwhite font-semibold">{court.name}</h3>
                    <p className="text-sm text-gray-400">
                      {court.locations?.name}{court.locations?.address ? ` — ${court.locations.address}` : ''}
                    </p>
                    {/* Editable court address */}
                    {editingAddressId === court.id ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          value={addressDraft}
                          onChange={(e) => setAddressDraft(e.target.value)}
                          placeholder={t('courtAddressPlaceholder')}
                          className="flex-1 bg-[#0F172A] border border-gray-700 rounded px-2 py-1 text-offwhite text-sm focus:outline-none focus:border-lime"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveAddress(court.id)
                            if (e.key === 'Escape') setEditingAddressId(null)
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => saveAddress(court.id)}
                          disabled={addressSaving}
                          className="text-xs text-lime hover:text-lime/80 font-semibold transition-colors disabled:opacity-50"
                        >
                          {addressSaving ? t('saving') : t('save')}
                        </button>
                        <button
                          onClick={() => setEditingAddressId(null)}
                          className="text-xs text-gray-400 hover:text-offwhite transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingAddressId(court.id)
                          setAddressDraft(court.address ?? '')
                        }}
                        className="text-xs text-gray-500 hover:text-lime mt-1 transition-colors"
                      >
                        {court.address
                          ? `📍 ${court.address}`
                          : `+ ${t('courtAddress')}`}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(court.status)}
                    <button
                      onClick={() =>
                        setConfigCourtId(configCourtId === court.id ? null : court.id)
                      }
                      className="text-sm text-gray-400 hover:text-lime transition-colors"
                    >
                      {t('courtSettingsBtn')}
                    </button>
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
                    <button
                      onClick={() => {
                        setDeleteError(null)
                        setDeleteCourtId(court.id)
                      }}
                      className="text-sm text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>

              {configCourtId === court.id && (
                <CourtConfigForm courtId={court.id} />
              )}

              {maintenanceCourtId === court.id && (
                <div className="p-4 border-t border-gray-700">
                  <MaintenanceForm
                    courtId={court.id}
                    courtName={court.name}
                    isInMaintenance={court.status === 'maintenance'}
                    onComplete={() => {
                      setMaintenanceCourtId(null)
                      loadCourts()
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteCourtId !== null}
        onClose={() => { setDeleteCourtId(null); setDeleteError(null) }}
        onConfirm={handleDeleteCourt}
        title={t('confirmDeleteCourt')}
        message={deleteError === 'cannot_delete_court_with_reservations'
          ? t('cannotDeleteCourtWithReservations')
          : t('confirmDeleteCourtMessage')}
        confirmLabel={deleteError ? t('cancel') : t('confirm')}
        destructive={!deleteError}
        loading={deleting}
      />
    </div>
  )
}
