'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface UserSearchBarProps {
  onSearch: (query: string) => void
}

export function UserSearchBar({ onSearch }: UserSearchBarProps) {
  const t = useTranslations('Admin')
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, 300)

    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/90"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full pl-10 pr-4 py-2.5 bg-[#1E293B] border border-gray-700 rounded-lg text-offwhite placeholder-gray-500 focus:outline-none focus:border-lime/50 transition-colors"
      />
    </div>
  )
}
