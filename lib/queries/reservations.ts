import { createClient } from '@/lib/supabase/server'
import type {
  BookingMode,
  CourtConfig,
  CourtWithConfig,
  Reservation,
  SpotInfo,
  TimeSlot,
  AvailabilitySummary,
} from '@/lib/types/reservations'

/**
 * Determine day type from a date string (YYYY-MM-DD).
 * Saturday/Sunday = weekend, else weekday.
 */
function getDayType(date: string): 'weekday' | 'weekend' {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

/**
 * Parse a time string like "07:00" into total minutes from midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Pre-parsed mode boundaries for a court config. */
interface ParsedModeBounds {
  practiceStart: number | null
  practiceEnd: number | null
  fullCourtStart: number | null
  fullCourtEnd: number | null
  openPlayStart: number | null
  openPlayEnd: number | null
}

function parseModeBounds(config: CourtConfig): ParsedModeBounds {
  return {
    practiceStart: config.practice_start ? timeToMinutes(config.practice_start) : null,
    practiceEnd: config.practice_end ? timeToMinutes(config.practice_end) : null,
    fullCourtStart: config.full_court_start ? timeToMinutes(config.full_court_start) : null,
    fullCourtEnd: config.full_court_end ? timeToMinutes(config.full_court_end) : null,
    openPlayStart: config.open_play_start ? timeToMinutes(config.open_play_start) : null,
    openPlayEnd: config.open_play_end ? timeToMinutes(config.open_play_end) : null,
  }
}

/**
 * Determine the booking mode for a given minute offset based on pre-parsed bounds.
 */
function getModeForMinute(bounds: ParsedModeBounds, minute: number): BookingMode {
  if (
    bounds.practiceStart !== null &&
    bounds.practiceEnd !== null &&
    minute >= bounds.practiceStart &&
    minute < bounds.practiceEnd
  ) {
    return 'practice'
  }

  if (
    bounds.fullCourtStart !== null &&
    bounds.fullCourtEnd !== null &&
    minute >= bounds.fullCourtStart &&
    minute < bounds.fullCourtEnd
  ) {
    return 'full_court'
  }

  if (
    bounds.openPlayStart !== null &&
    bounds.openPlayEnd !== null &&
    minute >= bounds.openPlayStart &&
    minute < bounds.openPlayEnd
  ) {
    return 'open_play'
  }

  // Default: if minute is within operating hours but no explicit mode, use open_play
  return 'open_play'
}

/**
 * Get session duration in minutes for a given booking mode.
 */
function getDurationForMode(config: CourtConfig, mode: BookingMode): number {
  switch (mode) {
    case 'full_court':
      return config.full_court_duration_minutes ?? 60
    case 'open_play':
      return config.open_play_duration_minutes ?? 60
    case 'practice':
      return config.practice_duration_minutes ?? 30
    default:
      return 60
  }
}

/**
 * Check if a pending_payment reservation has an expired hold.
 * Expired holds should NOT count as occupied.
 */
function isHoldExpired(reservation: Reservation, holdHours: number): boolean {
  if (reservation.status !== 'pending_payment') return false
  const createdAt = new Date(reservation.created_at)
  const expiry = new Date(createdAt.getTime() + holdHours * 60 * 60 * 1000)
  return new Date() > expiry
}

/**
 * Format minutes from midnight into a time string like "07:30:00".
 */
function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

/**
 * Generate time slots from court config for a given date,
 * using per-mode session durations and checking against existing reservations.
 */
export function generateTimeSlots(
  config: CourtConfig,
  date: string,
  reservations: Reservation[],
  holdHours: number
): TimeSlot[] {
  const openMinutes = timeToMinutes(config.open_time)
  const closeMinutes = timeToMinutes(config.close_time)
  const slots: TimeSlot[] = []
  const bounds = parseModeBounds(config)

  // Filter out cancelled, expired, and expired-hold reservations
  // Pre-parse timestamps to avoid repeated Date construction in the hot loop
  const activeReservations = reservations
    .filter(
      (r) =>
        r.status !== 'cancelled' &&
        r.status !== 'expired' &&
        !isHoldExpired(r, holdHours)
    )
    .map((r) => ({
      ...r,
      _startMs: new Date(r.starts_at).getTime(),
      _endMs: new Date(r.ends_at).getTime(),
    }))

  let currentMinute = openMinutes
  while (currentMinute < closeMinutes) {
    const mode = getModeForMinute(bounds, currentMinute)
    const duration = getDurationForMode(config, mode)

    // Don't create a slot that extends past closing time
    const slotEnd = Math.min(currentMinute + duration, closeMinutes)

    const startTime = `${date}T${minutesToTimeStr(currentMinute)}`
    const endTime = `${date}T${minutesToTimeStr(slotEnd)}`

    // Find reservations overlapping this slot
    const sStartMs = new Date(startTime).getTime()
    const sEndMs = new Date(endTime).getTime()
    const slotReservations = activeReservations.filter((r) => {
      return r._startMs < sEndMs && r._endMs > sStartMs
    })

    let spots: SpotInfo[]

    if (mode === 'full_court' || mode === 'practice') {
      // Full court / practice: single booking per slot
      const isBooked = slotReservations.some(
        (r) => r.booking_mode === mode
      )
      spots = [
        {
          spotNumber: 1,
          isAvailable: !isBooked,
          reservedBy: isBooked
            ? slotReservations.find((r) => r.booking_mode === mode)
                ?.reservation_user_first_name
            : undefined,
        },
      ]
    } else {
      // Open play: check each of 4 spots
      spots = [1, 2, 3, 4].map((spotNum) => {
        const taken = slotReservations.find(
          (r) =>
            r.booking_mode === 'open_play' && r.spot_number === spotNum
        )
        return {
          spotNumber: spotNum,
          isAvailable: !taken,
          reservedBy: taken?.reservation_user_first_name,
        }
      })
    }

    slots.push({ startTime, endTime, mode, spots })
    currentMinute += duration
  }

  return slots
}

/**
 * Compute availability summary for a set of time slots.
 */
function computeAvailabilitySummary(
  timeSlots: TimeSlot[]
): AvailabilitySummary {
  let total = 0
  let available = 0

  for (const slot of timeSlots) {
    if (slot.mode === 'full_court' || slot.mode === 'practice') {
      total += 1
      if (slot.spots[0]?.isAvailable) available += 1
    } else {
      total += slot.spots.length
      available += slot.spots.filter((s) => s.isAvailable).length
    }
  }

  return { total, available }
}

/**
 * Fetch all courts with their configs, pricing, and availability for a given date.
 * Optionally filter to a single court by courtId.
 */
export async function getCourtAvailability(
  date: string,
  courtId?: string,
  locationId?: string
): Promise<CourtWithConfig[]> {
  const supabase = await createClient()
  const dayType = getDayType(date)

  // Build courts query
  let courtsQuery = supabase
    .from('courts')
    .select('*, location:locations(*)')
    .eq('status', 'open')

  if (courtId) {
    courtsQuery = courtsQuery.eq('id', courtId)
  }

  if (locationId) {
    courtsQuery = courtsQuery.eq('location_id', locationId)
  }

  // Build reservations query — scope to specific court when courtId provided
  let reservationsQueryBuilder = supabase
    .from('reservations')
    .select('*')
    .gte('starts_at', `${date}T00:00:00`)
    .lt('starts_at', `${date}T23:59:59`)
    .not('status', 'in', '(cancelled,expired)')

  if (courtId) {
    reservationsQueryBuilder = reservationsQueryBuilder.eq('court_id', courtId)
  }

  const dayOfWeek = new Date(date + 'T12:00:00').getDay() // noon to avoid TZ rollover

  const [courtsResult, configResult, pricingResult, reservationsResult, appConfigBatchResult, sessionPricingResult] =
    await Promise.all([
      courtsQuery,
      supabase
        .from('court_config')
        .select('*')
        .eq('day_type', dayType),
      supabase.from('court_pricing').select('*'),
      reservationsQueryBuilder,
      supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['pending_payment_hold_hours', 'default_session_price_cents', 'tourist_surcharge_pct']),
      supabase
        .from('session_pricing')
        .select('court_id, day_of_week, price_cents')
        .eq('day_of_week', dayOfWeek),
    ])

  const courts = courtsResult.data ?? []
  const configs = configResult.data ?? []
  const pricing = pricingResult.data ?? []
  const sessionPricingRows = sessionPricingResult.data ?? []
  const reservations = (reservationsResult.data ?? []) as Reservation[]

  // Parse app_config batch result
  const appConfigMap: Record<string, number> = {}
  for (const row of appConfigBatchResult.data ?? []) {
    appConfigMap[row.key] = typeof row.value === 'number' ? row.value : Number(row.value) || 0
  }
  const holdHours = appConfigMap['pending_payment_hold_hours'] || 2
  const defaultPriceCents = appConfigMap['default_session_price_cents'] || 1000
  const touristSurchargePct = appConfigMap['tourist_surcharge_pct'] || 25

  return courts.map((court) => {
    const courtConfigs = configs.filter(
      (c) => c.court_id === court.id
    )
    const courtPricing = pricing.filter(
      (p) => p.court_id === court.id
    )
    const courtReservations = reservations.filter(
      (r) => r.court_id === court.id
    )

    // Find session pricing for this court on the queried day-of-week
    const sessionPricingRow = sessionPricingRows.find(
      (sp) => sp.court_id === court.id
    )
    const sessionPriceCents = sessionPricingRow?.price_cents ?? undefined

    const config = courtConfigs[0] // one config per day_type per court
    const timeSlots = config
      ? generateTimeSlots(config, date, courtReservations, holdHours)
      : []

    const availabilitySummary = computeAvailabilitySummary(timeSlots)

    // Extract location from joined query
    const location = court.location ?? null

    return {
      court: {
        id: court.id,
        location_id: court.location_id,
        name: court.name,
        address: court.address ?? null,
        status: court.status,
        lat: court.lat,
        lng: court.lng,
        created_at: court.created_at,
      },
      location,
      config: courtConfigs,
      pricing: courtPricing,
      sessionPriceCents,
      defaultPriceCents,
      touristSurchargePct,
      timeSlots,
      availabilitySummary,
    }
  })
}

/**
 * Fetch app_config values for booking windows.
 */
export async function getAppConfigs(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase.from('app_config').select('*')
  const configs: Record<string, number> = {}
  for (const row of data ?? []) {
    configs[row.key] =
      typeof row.value === 'number' ? row.value : Number(row.value) || 0
  }
  return configs
}
