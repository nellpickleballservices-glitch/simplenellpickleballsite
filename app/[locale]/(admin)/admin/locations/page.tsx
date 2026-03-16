'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  getLocationsAction,
  updateLocationAction,
  deleteLocationAction,
  type LocationRow,
} from '@/app/actions/admin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { LocationForm } from './LocationForm'

export default function AdminLocationsPage() {
  const t = useTranslations('Admin')
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; courtCount: number } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadLocations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLocationsAction()
      setLocations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  async function handleDelete(locationId: string) {
    setDeleteLoading(true)
    const result = await deleteLocationAction(locationId)
    setDeleteLoading(false)
    setDeleteTarget(null)
    if (result.error) {
      setError(result.error)
    } else {
      loadLocations()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-offwhite">{t('locationManagement')}</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {showAddForm ? t('cancel') : t('addLocation')}
        </button>
      </div>

      {showAddForm && (
        <LocationForm
          onSuccess={() => {
            setShowAddForm(false)
            loadLocations()
          }}
        />
      )}

      {error && (
        <p className="text-red-400 mt-4">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-400">{t('loading')}</p>
      ) : locations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">{t('noLocationsYet')}</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-[#1E293B] rounded-lg overflow-hidden">
              {/* Location card header */}
              <div className="flex">
                {/* Hero image preview */}
                {loc.hero_image_url ? (
                  <img
                    src={loc.hero_image_url}
                    alt={loc.name}
                    className="w-32 h-32 object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-32 h-32 bg-[#334155] flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 text-xs">{t('noImage')}</span>
                  </div>
                )}

                <div className="flex-1 p-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-offwhite font-semibold">{loc.name}</h3>
                    {loc.address && (
                      <p className="text-sm text-gray-400 mt-0.5">{loc.address}</p>
                    )}
                    {loc.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{loc.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {t('courtCountLabel', { count: loc.courtCount })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(editingId === loc.id ? null : loc.id)}
                      className="text-sm text-gray-400 hover:text-lime transition-colors"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => {
                        if (loc.courtCount > 0) {
                          setError(t('cannotDeleteLocationWithCourts'))
                          return
                        }
                        setDeleteTarget({ id: loc.id, courtCount: loc.courtCount })
                      }}
                      className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === loc.id && (
                <EditLocationForm
                  location={loc}
                  onComplete={() => {
                    setEditingId(null)
                    loadLocations()
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id)
        }}
        title={t('confirmDeleteLocation')}
        message={t('confirmDeleteLocation')}
        confirmLabel={t('delete')}
        destructive
        loading={deleteLoading}
      />
    </div>
  )
}

function EditLocationForm({
  location,
  onComplete,
}: {
  location: LocationRow
  onComplete: () => void
}) {
  const t = useTranslations('Admin')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    const result = await updateLocationAction(location.id, formData)
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      onComplete()
    }
  }

  return (
    <form action={handleSubmit} className="border-t border-gray-700 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('locationName')}</label>
          <input
            name="name"
            defaultValue={location.name}
            required
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('address')}</label>
          <input
            name="address"
            defaultValue={location.address ?? ''}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
          />
        </div>
      </div>

      <input type="hidden" name="lat" value={location.lat ?? ''} />
      <input type="hidden" name="lng" value={location.lng ?? ''} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('heroImageUrl')}</label>
        <input
          name="heroImageUrl"
          type="url"
          defaultValue={location.hero_image_url ?? ''}
          placeholder="https://example.com/image.jpg"
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('locationDescription')}</label>
        <textarea
          name="description"
          defaultValue={location.description ?? ''}
          rows={3}
          className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-offwhite text-sm focus:outline-none focus:border-lime resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-lime hover:bg-lime/90 text-midnight font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? t('saving') : t('saveChanges')}
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="text-gray-400 hover:text-offwhite px-4 py-2 text-sm transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
