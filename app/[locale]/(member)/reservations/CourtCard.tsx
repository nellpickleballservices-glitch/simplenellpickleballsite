'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { CourtWithConfig, TimeSlot, AvailabilitySummary } from '@/lib/types/reservations'
import TimeSlotGrid from './TimeSlotGrid'

interface CourtCardProps {
  courtData: CourtWithConfig
  isMember: boolean
  isVip: boolean
  maxAdvanceDays: number
  today: string
}

type AvailabilityLevel = 'available' | 'limited' | 'fully_booked' | 'closed'

function getAvailabilityLevel(summary: AvailabilitySummary): AvailabilityLevel {
  if (summary.total === 0) return 'closed'
  if (summary.available === 0) return 'fully_booked'
  if (summary.available / summary.total > 0.5) return 'available'
  return 'limited'
}

const borderColors: Record<AvailabilityLevel, string> = {
  available: 'border-l-green-500',
  limited: 'border-l-amber-500',
  fully_booked: 'border-l-red-500',
  closed: 'border-l-gray-500',
}

const badgeBgColors: Record<AvailabilityLevel, string> = {
  available: 'bg-green-500/20 text-green-400',
  limited: 'bg-amber-500/20 text-amber-400',
  fully_booked: 'bg-red-500/20 text-red-400',
  closed: 'bg-gray-500/20 text-gray-400',
}

const badgeKeys: Record<AvailabilityLevel, string> = {
  available: 'badgeAvailable',
  limited: 'badgeLimited',
  fully_booked: 'badgeFullyBooked',
  closed: 'badgeClosed',
}

export default function CourtCard({
  courtData,
  isMember,
  isVip,
  maxAdvanceDays,
  today,
}: CourtCardProps) {
  const t = useTranslations('Reservations')
  const { court, location, config, timeSlots: initialSlots, availabilitySummary: initialSummary } = courtData

  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary>(initialSummary)

  // Dynamic pricing state -- initialized from server-computed value (PRIC-05)
  const [displayPriceCents, setDisplayPriceCents] = useState<number>(
    courtData.displayPriceCents ?? courtData.sessionPriceCents ?? courtData.defaultPriceCents ?? 1000
  )

  const level = getAvailabilityLevel(availabilitySummary)

  // Directions link (opens native maps / Google Maps)
  const lat = court.lat
  const lng = court.lng
  const hasCoords = lat !== null && lng !== null

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : null

  // Operating hours from today's config
  const todayConfig = config[0]
  const operatingHours = todayConfig
    ? `${todayConfig.open_time} - ${todayConfig.close_time}`
    : ''

  // Pricing display -- uses server-computed displayPriceCents (PRIC-05)
  const sessionPrice = (displayPriceCents / 100).toFixed(2)

  // Handle availability change from TimeSlotGrid date switching
  const handleAvailabilityChange = useCallback((newSummary: AvailabilitySummary) => {
    setAvailabilitySummary(newSummary)
  }, [])

  // Handle price update from TimeSlotGrid date switching (server-computed)
  const handlePriceChange = useCallback((newPriceCents: number) => {
    setDisplayPriceCents(newPriceCents)
  }, [])

  return (
    <div
      className={`bg-[#1E293B] rounded-xl shadow-lg border-l-4 ${borderColors[level]} overflow-hidden`}
    >
      {/* Court header image */}
      {location?.hero_image_url ? (
        <img
          src={location.hero_image_url}
          alt={`${court.name} location`}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-[#334155] flex items-center justify-center">
          <span className="text-gray-500 font-bebas-neue text-2xl tracking-wider">
            {court.name}
          </span>
        </div>
      )}

      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bebas-neue text-white tracking-wide">
              {court.name}
            </h2>
            {(court.address || location?.address) && (
              <p className="text-gray-400 text-xs mt-0.5">
                {court.address ?? location?.address}
              </p>
            )}
          </div>
          {/* Availability badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBgColors[level]}`}
          >
            {t(badgeKeys[level])}
          </span>
        </div>

        {/* Operating hours & pricing */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          {operatingHours && (
            <span>{t('operatingHours', { open: todayConfig?.open_time, close: todayConfig?.close_time })}</span>
          )}
          <span className="text-[#A3FF12]">
            {isMember ? t('pricingFree') : t('pricingSession', { price: sessionPrice })}
          </span>
        </div>

        {/* Time Slot Grid */}
        <TimeSlotGrid
          initialTimeSlots={initialSlots}
          courtId={court.id}
          today={today}
          maxAdvanceDays={maxAdvanceDays}
          isMember={isMember}
          isVip={isVip}
          onAvailabilityChange={handleAvailabilityChange}
          onPriceChange={handlePriceChange}
        />

        {/* Directions link */}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-1.5 text-[#38BDF8] hover:text-[#A3FF12] transition-colors text-sm font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
            </svg>
            {t('howToGetThere')}
          </a>
        )}
      </div>
    </div>
  )
}
