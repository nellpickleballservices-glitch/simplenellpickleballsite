'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import type { TimeSlot, AvailabilitySummary } from '@/lib/types/reservations'
import { formatTime } from '@/lib/utils/formatTime'
import { getAvailabilityAction } from './actions'
import CourtDiagram from './CourtDiagram'
import ReservationForm from './ReservationForm'

interface TimeSlotGridProps {
  initialTimeSlots: TimeSlot[]
  courtId: string
  today: string
  maxAdvanceDays: number
  isMember: boolean
  isVip: boolean
  onAvailabilityChange: (summary: AvailabilitySummary) => void
  onPriceChange?: (priceCents: number) => void
}

/** Add N days to a date string (YYYY-MM-DD) and return new date string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface DateTab {
  label: string
  date: string
  offset: number
}

export default function TimeSlotGrid({
  initialTimeSlots,
  courtId,
  today,
  maxAdvanceDays,
  isMember,
  isVip,
  onAvailabilityChange,
  onPriceChange,
}: TimeSlotGridProps) {
  const t = useTranslations('Reservations')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots)
  const [selectedDate, setSelectedDate] = useState(today)
  const [isPending, startTransition] = useTransition()

  // Court diagram modal state
  const [diagramSlot, setDiagramSlot] = useState<TimeSlot | null>(null)
  const [allSlotsForDiagram, setAllSlotsForDiagram] = useState<TimeSlot[]>([])

  // Full court booking inline form state
  const [fullCourtBookingSlot, setFullCourtBookingSlot] = useState<TimeSlot | null>(null)

  // Build date tabs
  const tabs: DateTab[] = []
  const tabLabels = [t('tabToday'), t('tabTomorrow')]

  for (let i = 0; i <= maxAdvanceDays && i <= 3; i++) {
    const date = addDays(today, i)
    let label: string
    if (i === 0) label = tabLabels[0]
    else if (i === 1) label = tabLabels[1]
    else {
      const d = new Date(date + 'T00:00:00')
      label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    }
    tabs.push({ label, date, offset: i })
  }

  // Handle date tab switch
  const handleDateChange = (date: string) => {
    if (date === selectedDate) return
    setSelectedDate(date)

    startTransition(async () => {
      const result = await getAvailabilityAction(courtId, date)
      setTimeSlots(result.timeSlots)
      onAvailabilityChange(result.availabilitySummary)
      if (onPriceChange && result.displayPriceCents !== undefined) {
        onPriceChange(result.displayPriceCents)
      }
    })
  }

  // Handle slot click for open play -- open court diagram
  const handleViewSpots = (slot: TimeSlot) => {
    setDiagramSlot(slot)
    setAllSlotsForDiagram(timeSlots.filter((s) => s.mode === 'open_play'))
  }

  // Handle full court booking -- toggle inline form
  const handleFullCourtBook = (slot: TimeSlot) => {
    setFullCourtBookingSlot(
      fullCourtBookingSlot?.startTime === slot.startTime ? null : slot
    )
  }

  return (
    <div>
      {/* Tab strip */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.date}
            onClick={() => handleDateChange(tab.date)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
              selectedDate === tab.date
                ? 'bg-[#A3FF12] text-[#0F172A] font-semibold'
                : 'bg-[#334155] text-gray-300 hover:bg-[#243352]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Time slots */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-[#A3FF12] border-t-transparent rounded-full" />
            <span className="ml-2 text-gray-400 text-sm">{t('loadingSlots')}</span>
          </div>
        ) : timeSlots.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">{t('noSlots')}</p>
        ) : (
          timeSlots.map((slot) => {
            const timeRange = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
            const isFullCourt = slot.mode === 'full_court'

            if (isFullCourt) {
              const isAvailable = slot.spots[0]?.isAvailable ?? false
              return (
                <div key={slot.startTime} className="space-y-1">
                  <div className="flex items-center justify-between bg-[#0F172A] rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white font-medium">
                        {timeRange}
                      </span>
                      <span className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] px-2 py-0.5 rounded-full">
                        {t('modeFullCourt')}
                      </span>
                    </div>
                    {isAvailable ? (
                      <button
                        onClick={() => handleFullCourtBook(slot)}
                        className="text-xs bg-[#A3FF12] text-[#0F172A] font-semibold px-3 py-1 rounded-full hover:opacity-90 transition-opacity"
                      >
                        {t('bookCourt')}
                      </button>
                    ) : (
                      <span className="text-xs text-red-400 font-medium">
                        {t('slotBooked')}
                      </span>
                    )}
                  </div>

                  {/* Inline reservation form for full court */}
                  {fullCourtBookingSlot?.startTime === slot.startTime && (
                    <div className="bg-[#1E293B] rounded-lg px-3 py-3">
                      <ReservationForm
                        courtId={courtId}
                        date={selectedDate}
                        startTime={slot.startTime}
                        endTime={slot.endTime}
                        bookingMode="full_court"
                        isVip={isVip}
                        isMember={isMember}
                      />
                    </div>
                  )}
                </div>
              )
            }

            // Open play mode
            const availableSpots = slot.spots.filter((s) => s.isAvailable).length
            const totalSpots = slot.spots.length

            return (
              <div
                key={slot.startTime}
                className="flex items-center justify-between bg-[#0F172A] rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-medium">
                    {timeRange}
                  </span>
                  <span className="text-[10px] bg-[#FF6B2C]/20 text-[#FF6B2C] px-2 py-0.5 rounded-full">
                    {t('modeOpenPlay')}
                  </span>
                  <div className="flex gap-1">
                    {slot.spots.map((spot) => (
                      <span
                        key={spot.spotNumber}
                        className={`h-2 w-2 rounded-full ${
                          spot.isAvailable ? 'bg-[#A3FF12]' : 'bg-red-500'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {t('spotsCount', {
                      available: String(availableSpots),
                      total: String(totalSpots),
                    })}
                  </span>
                </div>
                {availableSpots > 0 ? (
                  <button
                    onClick={() => handleViewSpots(slot)}
                    className="text-xs bg-[#38BDF8] text-[#0F172A] font-semibold px-3 py-1 rounded-full hover:opacity-90 transition-opacity"
                  >
                    {t('viewSpots')}
                  </button>
                ) : (
                  <span className="text-xs text-red-400 font-medium">
                    {t('slotBooked')}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Court Diagram Modal */}
      {diagramSlot && (
        <CourtDiagram
          slot={diagramSlot}
          allSlots={allSlotsForDiagram}
          courtId={courtId}
          date={selectedDate}
          isVip={isVip}
          isMember={isMember}
          onClose={() => setDiagramSlot(null)}
        />
      )}
    </div>
  )
}
