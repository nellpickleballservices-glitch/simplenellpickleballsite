'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { GalleryItemForm } from './GalleryItemForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  getGalleryItemsAction,
  createGalleryItemAction,
  updateGalleryItemAction,
  deleteGalleryItemAction,
} from '@/app/actions/admin'
import type { GalleryItem } from '@/lib/types/admin'

const MEDIA_BADGE: Record<string, string> = {
  image: 'bg-turquoise/20 text-turquoise',
  video: 'bg-sunset/20 text-sunset',
}

export default function AdminGalleryPage() {
  const t = useTranslations('Admin')
  const [items, setItems] = useState<GalleryItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    try {
      const data = await getGalleryItemsAction()
      setItems(data)
    } catch (err) {
      console.error('Failed to load gallery items:', err)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleCreate(formData: FormData) {
    await createGalleryItemAction(formData)
    setShowForm(false)
    showFeedback(t('galleryItemCreated'))
    await loadItems()
  }

  async function handleUpdate(formData: FormData) {
    if (!editingItem) return
    await updateGalleryItemAction(editingItem.id, formData)
    setEditingItem(undefined)
    setShowForm(false)
    showFeedback(t('galleryItemUpdated'))
    await loadItems()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteGalleryItemAction(deleteTarget)
      setDeleteTarget(null)
      showFeedback(t('galleryItemDeleted'))
      await loadItems()
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(item: GalleryItem) {
    setEditingItem(item)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingItem(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-offwhite">{t('gallery')}</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-lime hover:bg-lime/90 text-midnight rounded-lg transition-colors"
          >
            {t('addGalleryItem')}
          </button>
        )}
      </div>

      {feedback && (
        <div className="mb-4 px-4 py-2 bg-lime/10 border border-lime/30 rounded-lg text-lime text-sm">
          {feedback}
        </div>
      )}

      {showForm ? (
        <div className="bg-[#1E293B] rounded-lg p-6 mb-6">
          <GalleryItemForm
            item={editingItem}
            onSubmit={editingItem ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="text-white/90 text-center py-12">{t('noGalleryItems')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-white/90 border-b border-gray-700">
                  <tr>
                    <th className="pb-3 pr-4">Preview</th>
                    <th className="pb-3 pr-4">{t('galleryMediaType')}</th>
                    <th className="pb-3 pr-4">{t('galleryGridSize')}</th>
                    <th className="pb-3 pr-4">{t('galleryTitleEn')}</th>
                    <th className="pb-3 pr-4">{t('gallerySortOrder')}</th>
                    <th className="pb-3 pr-4">{t('galleryVisible')}</th>
                    <th className="pb-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-800 hover:bg-[#1E293B]/50"
                    >
                      <td className="py-3 pr-4">
                        {item.media_type === 'image' ? (
                          <img
                            src={item.url}
                            alt={item.title_en ?? ''}
                            className="w-16 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-charcoal rounded flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-sunset">
                              <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${MEDIA_BADGE[item.media_type] ?? 'bg-gray-700 text-white'}`}>
                          {t(item.media_type === 'image' ? 'galleryImage' : 'galleryVideo')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white font-mono text-xs">
                        {item.grid_size}
                      </td>
                      <td className="py-3 pr-4 text-offwhite font-medium">
                        {item.title_en || '-'}
                      </td>
                      <td className="py-3 pr-4 text-white">
                        {item.sort_order}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block w-2 h-2 rounded-full ${item.is_visible ? 'bg-lime' : 'bg-red-400'}`} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-lime hover:text-lime/80 text-xs mr-3"
                        >
                          {t('editGalleryItem')}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          {t('deleteGalleryItem')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('confirmDeleteGalleryItem')}
        message={t('confirmDeleteGalleryItemMessage')}
        confirmLabel={t('confirm')}
        destructive
        loading={deleting}
      />
    </div>
  )
}
