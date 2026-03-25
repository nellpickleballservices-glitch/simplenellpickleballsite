'use client'

import { useTranslations } from 'next-intl'

interface ContentPreviewProps {
  html: string
}

export function ContentPreview({ html }: ContentPreviewProps) {
  const t = useTranslations('Admin')

  return (
    <div>
      <p className="text-xs text-white/90 mb-2 font-medium">{t('preview')}</p>
      <div
        className="bg-offwhite text-charcoal p-6 rounded-lg prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
