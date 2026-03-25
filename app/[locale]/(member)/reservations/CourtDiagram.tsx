'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TimeSlot } from '@/lib/types/reservations'
import { formatTime } from '@/lib/utils/formatTime'
import ReservationForm from './ReservationForm'

interface CourtDiagramProps {
  slot: TimeSlot
  allSlots: TimeSlot[]
  courtId: string
  date: string
  isVip: boolean
  isMember: boolean
  onClose: () => void
}

export default function CourtDiagram({
  slot: initialSlot,
  allSlots,
  courtId,
  date,
  isVip,
  isMember,
  onClose,
}: CourtDiagramProps) {
  const t = useTranslations('Reservations')
  const [currentSlot, setCurrentSlot] = useState<TimeSlot>(initialSlot)
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null)

  const currentIndex = allSlots.findIndex(
    (s) => s.startTime === currentSlot.startTime
  )

  const handlePrevSlot = () => {
    if (currentIndex > 0) {
      setCurrentSlot(allSlots[currentIndex - 1])
      setSelectedSpot(null)
    }
  }

  const handleNextSlot = () => {
    if (currentIndex < allSlots.length - 1) {
      setCurrentSlot(allSlots[currentIndex + 1])
      setSelectedSpot(null)
    }
  }

  // 2x2 quadrant positions
  const quadrantPositions = [
    { row: 0, col: 0 }, // Spot 1: top-left
    { row: 0, col: 1 }, // Spot 2: top-right
    { row: 1, col: 0 }, // Spot 3: bottom-left
    { row: 1, col: 1 }, // Spot 4: bottom-right
  ]

  return (
    // Modal backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#1E293B] rounded-xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
        {/* Modal header */}
        <div className="bg-[#0F172A] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bebas-neue text-lg tracking-wide">
              {t('selectTimeSlot')}
            </h3>
            <p className="text-white/90 text-xs mt-0.5">
              {formatTime(currentSlot.startTime)} - {formatTime(currentSlot.endTime)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white transition-colors text-xl leading-none"
            aria-label={t('closeModal')}
          >
            &times;
          </button>
        </div>

        {/* Time slot navigation */}
        {allSlots.length > 1 && (
          <div className="flex items-center justify-between px-5 py-2 bg-[#0F172A]">
            <button
              onClick={handlePrevSlot}
              disabled={currentIndex <= 0}
              className="text-white/90 hover:text-white disabled:opacity-30 transition-colors text-sm"
            >
              &larr; Prev
            </button>
            <span className="text-white text-xs">
              {currentIndex + 1} / {allSlots.length}
            </span>
            <button
              onClick={handleNextSlot}
              disabled={currentIndex >= allSlots.length - 1}
              className="text-white/90 hover:text-white disabled:opacity-30 transition-colors text-sm"
            >
              Next &rarr;
            </button>
          </div>
        )}

        {/* Court diagram: 2x2 quadrant grid */}
        <div className="p-5">
          <div className="relative border-2 border-[#38BDF8]/30 rounded-lg p-3">
            {/* Court net line */}
            <div className="absolute left-1/2 top-3 bottom-3 w-px bg-[#38BDF8]/40" />
            <div className="absolute top-1/2 left-3 right-3 h-px bg-[#38BDF8]/40" />

            <div className="grid grid-cols-2 gap-3">
              {currentSlot.spots.map((spot, idx) => {
                const pos = quadrantPositions[idx]
                if (!pos) return null
                const isAvailable = spot.isAvailable
                const isSelected = selectedSpot === spot.spotNumber

                return (
                  <button
                    key={spot.spotNumber}
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedSpot(
                          isSelected ? null : spot.spotNumber
                        )
                      }
                    }}
                    disabled={!isAvailable}
                    className={`
                      relative aspect-square rounded-lg flex flex-col items-center justify-center
                      transition-all duration-200 text-sm font-semibold
                      ${
                        isAvailable
                          ? isSelected
                            ? 'bg-[#A3FF12] text-[#0F172A] ring-2 ring-white scale-105'
                            : 'bg-[#A3FF12]/20 text-[#A3FF12] hover:bg-[#A3FF12]/40 cursor-pointer'
                          : 'bg-red-500/20 text-red-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <span className="text-base font-bold">
                      {t('spotLabel', { number: String(spot.spotNumber) })}
                    </span>
                    <span className="text-[10px] mt-1">
                      {isAvailable
                        ? t('slotAvailable')
                        : spot.reservedBy || t('spotOccupied')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Reservation form when spot is selected */}
        {selectedSpot !== null && (
          <div className="px-5 pb-5">
            <ReservationForm
              courtId={courtId}
              date={date}
              startTime={currentSlot.startTime}
              endTime={currentSlot.endTime}
              bookingMode="open_play"
              spotNumber={selectedSpot}
              isVip={isVip}
              isMember={isMember}
            />
          </div>
        )}
      </div>
    </div>
  )
}
