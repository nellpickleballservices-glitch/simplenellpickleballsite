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
  const { court, location, config, pricing, timeSlots: initialSlots, availabilitySummary: initialSummary } = courtData

  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary>(initialSummary)

  const level = getAvailabilityLevel(availabilitySummary)

  // Google Maps thumbnail
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const lat = court.lat
  const lng = court.lng
  const hasCoords = lat !== null && lng !== null

  const mapThumbnailUrl = hasCoords && mapsApiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=400x200&markers=color:green|${lat},${lng}&key=${mapsApiKey}`
    : null

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : null

  // Operating hours from today's config
  const todayConfig = config[0]
  const operatingHours = todayConfig
    ? `${todayConfig.open_time} - ${todayConfig.close_time}`
    : ''

  // Pricing display
  const sessionPriceCents = pricing[0]?.price_cents ?? 1000
  const sessionPrice = sessionPriceCents / 100

  // Handle availability change from TimeSlotGrid date switching
  const handleAvailabilityChange = useCallback((newSummary: AvailabilitySummary) => {
    setAvailabilitySummary(newSummary)
  }, [])

  return (
    <div
      className={`bg-[#1E293B] rounded-xl shadow-lg border-l-4 ${borderColors[level]} overflow-hidden`}
    >
      {/* Google Maps Thumbnail */}
      {mapThumbnailUrl ? (
        <a
          href={directionsUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={mapThumbnailUrl}
            alt={`${court.name} location`}
            className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      ) : (
        <div className="w-full h-40 bg-[#334155] flex items-center justify-center">
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#38BDF8] hover:text-[#A3FF12] transition-colors text-sm"
            >
              {t('getDirections')}
            </a>
          ) : (
            <span className="text-gray-500 font-bebas-neue text-2xl tracking-wider">
              {court.name}
            </span>
          )}
        </div>
      )}

      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bebas-neue text-white tracking-wide">
              {court.name}
            </h2>
            {location?.address && (
              <p className="text-gray-400 text-xs mt-0.5">
                {location.address}
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
            {isMember ? t('pricingFree') : t('pricingSession', { price: String(sessionPrice) })}
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
        />
      </div>
    </div>
  )
}
