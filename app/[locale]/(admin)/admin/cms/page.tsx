'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ContentEditor } from './ContentEditor'
import { ContentPreview } from './ContentPreview'
import {
  getContentBlocksAction,
  updateContentBlockAction,
  reorderContentBlocksAction,
} from '@/app/actions/admin'
import type { ContentBlock } from '@/lib/types/admin'

type PageTab = 'home' | 'about' | 'learn' | 'faq'

const PAGE_TABS: { key: PageTab; labelKey: string }[] = [
  { key: 'home', labelKey: 'homeBlocks' },
  { key: 'about', labelKey: 'aboutBlocks' },
  { key: 'learn', labelKey: 'learnBlocks' },
  { key: 'faq', labelKey: 'faqBlocks' },
]

function formatBlockKey(key: string): string {
  // Remove page prefix (e.g., 'home_hero' -> 'Hero')
  const parts = key.split('_').slice(1)
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export default function AdminCmsPage() {
  const t = useTranslations('Admin')
  const [activeTab, setActiveTab] = useState<PageTab>('home')
  const [blocks, setBlocks] = useState<Record<PageTab, ContentBlock[]>>({
    home: [],
    about: [],
    learn: [],
    faq: [],
  })
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [langTab, setLangTab] = useState<'es' | 'en'>('es')
  const [editEs, setEditEs] = useState('')
  const [editEn, setEditEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  useEffect(() => {
    loadBlocks()
  }, [])

  async function loadBlocks() {
    try {
      const grouped = await getContentBlocksAction()
      setBlocks(grouped)
    } catch (err) {
      console.error('Failed to load content blocks:', err)
    }
  }

  function startEditing(block: ContentBlock) {
    setEditingBlockId(block.id)
    setEditEs(block.content_es ?? '')
    setEditEn(block.content_en ?? '')
    setLangTab('es')
  }

  function cancelEditing() {
    setEditingBlockId(null)
  }

  async function handleSave(blockId: string) {
    setSaving(true)
    try {
      await updateContentBlockAction(blockId, editEs, editEn)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
      await loadBlocks()
    } catch (err) {
      console.error('Failed to save content block:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleReorder(direction: 'up' | 'down', index: number) {
    const currentBlocks = [...blocks[activeTab]]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentBlocks.length) return

    // Swap
    const temp = currentBlocks[index]
    currentBlocks[index] = currentBlocks[targetIndex]
    currentBlocks[targetIndex] = temp

    // Optimistic update
    setBlocks((prev) => ({ ...prev, [activeTab]: currentBlocks }))

    try {
      await reorderContentBlocksAction(currentBlocks.map((b) => b.id))
    } catch (err) {
      console.error('Failed to reorder:', err)
      await loadBlocks() // revert
    }
  }

  const currentBlocks = blocks[activeTab]
  const currentContent = langTab === 'es' ? editEs : editEn

  return (
    <div>
      <h1 className="text-2xl font-bold text-offwhite mb-6">{t('contentBlocks')}</h1>

      {/* Page tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        {PAGE_TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key)
              setEditingBlockId(null)
            }}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'text-lime border-b-2 border-lime'
                : 'text-gray-400 hover:text-offwhite'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Block list */}
      {currentBlocks.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No content blocks found for this page.</p>
      ) : (
        <div className="space-y-4">
          {currentBlocks.map((block, index) => {
            const isEditing = editingBlockId === block.id

            return (
              <div key={block.id} className="bg-[#1E293B] rounded-lg overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-offwhite font-medium">
                      {formatBlockKey(block.block_key)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('lastUpdated')}: {new Date(block.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Reorder buttons */}
                    <button
                      onClick={() => handleReorder('up', index)}
                      disabled={index === 0}
                      className="text-xs text-gray-400 hover:text-offwhite disabled:opacity-30 px-2 py-1"
                      title={t('moveUp')}
                    >
                      {'\u2191'}
                    </button>
                    <button
                      onClick={() => handleReorder('down', index)}
                      disabled={index === currentBlocks.length - 1}
                      className="text-xs text-gray-400 hover:text-offwhite disabled:opacity-30 px-2 py-1"
                      title={t('moveDown')}
                    >
                      {'\u2193'}
                    </button>
                    <button
                      onClick={() => (isEditing ? cancelEditing() : startEditing(block))}
                      className="text-xs text-lime hover:text-lime/80 px-3 py-1"
                    >
                      {isEditing ? t('cancel') : t('editContent')}
                    </button>
                  </div>
                </div>

                {/* Expanded editor */}
                {isEditing && (
                  <div className="border-t border-gray-700 p-4 space-y-4">
                    {/* Language tabs */}
                    <div className="flex gap-3">
                      {(['es', 'en'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLangTab(lang)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            langTab === lang
                              ? 'bg-lime/10 text-lime'
                              : 'text-gray-400 hover:text-offwhite'
                          }`}
                        >
                          {lang === 'es' ? t('spanishContent') : t('englishContent')}
                        </button>
                      ))}
                    </div>

                    {/* Editor */}
                    <ContentEditor
                      content={currentContent}
                      onChange={(html) => {
                        if (langTab === 'es') setEditEs(html)
                        else setEditEn(html)
                      }}
                    />

                    {/* Preview */}
                    <ContentPreview html={currentContent} />

                    {/* Save button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSave(block.id)}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-semibold bg-lime hover:bg-lime/90 text-midnight rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? t('saving') : t('save')}
                      </button>
                      {savedFeedback && (
                        <span className="text-lime text-sm">{t('saved')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
