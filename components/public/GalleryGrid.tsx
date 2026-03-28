'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, m } from 'motion/react'
import type { GalleryItem } from '@/lib/types/admin'

interface GalleryGridProps {
  items: GalleryItem[]
  locale: string
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
  } catch { /* not a youtube url */ }
  return null
}

const GRID_SPAN: Record<string, string> = {
  '1x1': 'col-span-1 row-span-1',
  '1x2': 'col-span-1 row-span-2',
  '2x1': 'col-span-2 row-span-1',
  '2x2': 'col-span-2 row-span-2',
}

export function GalleryGrid({ items, locale }: GalleryGridProps) {
  const t = useTranslations('Gallery')
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null)

  const title = (item: GalleryItem) =>
    locale === 'en' ? (item.title_en ?? item.title_es) : (item.title_es ?? item.title_en)
  const caption = (item: GalleryItem) =>
    locale === 'en' ? (item.caption_en ?? item.caption_es) : (item.caption_es ?? item.caption_en)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[200px] md:auto-rows-[250px] gap-3">
        {items.map((item) => {
          const ytId = item.media_type === 'video' ? getYouTubeId(item.url) : null
          const thumb = item.thumbnail_url ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null)

          return (
            <button
              key={item.id}
              onClick={() => setLightbox(item)}
              className={`relative group overflow-hidden rounded-xl cursor-pointer ${GRID_SPAN[item.grid_size] ?? 'col-span-1 row-span-1'}`}
            >
              {item.media_type === 'image' ? (
                <img
                  src={item.url}
                  alt={title(item) ?? ''}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <>
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={title(item) ?? ''}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-charcoal flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-sunset">
                        <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-white ml-1">
                        <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                      </svg>
                    </div>
                  </div>
                </>
              )}

              {/* Hover overlay with title/caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                {title(item) && (
                  <p className="text-white font-semibold text-sm leading-tight">{title(item)}</p>
                )}
                {caption(item) && (
                  <p className="text-white/80 text-xs mt-1 line-clamp-2">{caption(item)}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Lightbox modal */}
      <AnimatePresence>
        {lightbox && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
              aria-label={t('close')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox.media_type === 'image' ? (
                <img
                  src={lightbox.url}
                  alt={title(lightbox) ?? ''}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              ) : (
                (() => {
                  const ytId = getYouTubeId(lightbox.url)
                  return ytId ? (
                    <div className="w-full aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                        title={title(lightbox) ?? 'Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                  ) : (
                    <video
                      src={lightbox.url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[80vh] rounded-lg"
                    />
                  )
                })()
              )}

              {/* Caption below media */}
              {(title(lightbox) || caption(lightbox)) && (
                <div className="mt-4 text-center">
                  {title(lightbox) && (
                    <p className="text-white font-semibold text-lg">{title(lightbox)}</p>
                  )}
                  {caption(lightbox) && (
                    <p className="text-white/70 text-sm mt-1">{caption(lightbox)}</p>
                  )}
                </div>
              )}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
