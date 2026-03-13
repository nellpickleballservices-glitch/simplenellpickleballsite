'use client'

import { useEffect, useState } from 'react'

interface ChatBubbleProps {
  onClick: () => void
  isOpen: boolean
}

export function ChatBubble({ onClick, isOpen }: ChatBubbleProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat with Nelly'}
      className={`fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
        isOpen
          ? 'bg-gray-700 hover:bg-gray-800'
          : 'bg-[#39FF14] hover:scale-110 hover:bg-[#2de010]'
      } ${mounted ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
    >
      {isOpen ? (
        /* X close icon */
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        /* Pickleball paddle icon */
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          {/* Paddle head */}
          <ellipse cx="16" cy="12" rx="9" ry="10" fill="#0B1D3A" />
          {/* Paddle holes */}
          <circle cx="13" cy="9" r="1.5" fill="#39FF14" opacity="0.6" />
          <circle cx="19" cy="9" r="1.5" fill="#39FF14" opacity="0.6" />
          <circle cx="16" cy="13" r="1.5" fill="#39FF14" opacity="0.6" />
          {/* Handle */}
          <rect x="14" y="21" width="4" height="8" rx="2" fill="#0B1D3A" />
          {/* Chat bubble indicator */}
          <circle cx="24" cy="6" r="4" fill="#1ED6C3" />
          <text
            x="24"
            y="8"
            textAnchor="middle"
            fill="white"
            fontSize="6"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            ?
          </text>
        </svg>
      )}
    </button>
  )
}
