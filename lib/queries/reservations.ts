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

/**
 * Determine the booking mode for a given hour based on court config.
 */
function getModeForHour(config: CourtConfig, hour: number): BookingMode {
  const hourMinutes = hour * 60

  if (
    config.full_court_start &&
    config.full_court_end &&
    hourMinutes >= timeToMinutes(config.full_court_start) &&
    hourMinutes < timeToMinutes(config.full_court_end)
  ) {
    return 'full_court'
  }

  if (
    config.open_play_start &&
    config.open_play_end &&
    hourMinutes >= timeToMinutes(config.open_play_start) &&
    hourMinutes < timeToMinutes(config.open_play_end)
  ) {
    return 'open_play'
  }

  // Default: if hour is within operating hours but no explicit mode, use open_play
  return 'open_play'
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
 * Generate time slots from court config for a given date,
 * checking each 1-hour slot against existing reservations.
 */
export function generateTimeSlots(
  config: CourtConfig,
  date: string,
  reservations: Reservation[],
  holdHours: number
): TimeSlot[] {
  const openHour = timeToMinutes(config.open_time) / 60
  const closeHour = timeToMinutes(config.close_time) / 60
  const slots: TimeSlot[] = []

  // Filter out cancelled, expired, and expired-hold reservations
  const activeReservations = reservations.filter(
    (r) =>
      r.status !== 'cancelled' &&
      r.status !== 'expired' &&
      !isHoldExpired(r, holdHours)
  )

  for (let hour = openHour; hour < closeHour; hour++) {
    const startTime = `${date}T${String(hour).padStart(2, '0')}:00:00`
    const endTime = `${date}T${String(hour + 1).padStart(2, '0')}:00:00`
    const mode = getModeForHour(config, hour)

    // Find reservations overlapping this slot
    const slotReservations = activeReservations.filter((r) => {
      const rStart = new Date(r.starts_at)
      const rEnd = new Date(r.ends_at)
      const sStart = new Date(startTime)
      const sEnd = new Date(endTime)
      return rStart < sEnd && rEnd > sStart
    })

    let spots: SpotInfo[]

    if (mode === 'full_court') {
      // Full court: check if any full_court reservation exists for this slot
      const isBooked = slotReservations.some(
        (r) => r.booking_mode === 'full_court'
      )
      spots = [
        {
          spotNumber: 1,
          isAvailable: !isBooked,
          reservedBy: isBooked
            ? slotReservations.find((r) => r.booking_mode === 'full_court')
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
    if (slot.mode === 'full_court') {
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
  courtId?: string
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

  const [courtsResult, configResult, pricingResult, reservationsResult, appConfigResult] =
    await Promise.all([
      courtsQuery,
      supabase
        .from('court_config')
        .select('*')
        .eq('day_type', dayType),
      supabase.from('court_pricing').select('*'),
      supabase
        .from('reservations')
        .select('*')
        .gte('starts_at', `${date}T00:00:00`)
        .lt('starts_at', `${date}T23:59:59`)
        .not('status', 'in', '(cancelled,expired)'),
      supabase
        .from('app_config')
        .select('*')
        .eq('key', 'pending_payment_hold_hours')
        .single(),
    ])

  const courts = courtsResult.data ?? []
  const configs = configResult.data ?? []
  const pricing = pricingResult.data ?? []
  const reservations = (reservationsResult.data ?? []) as Reservation[]
  const holdHours =
    typeof appConfigResult.data?.value === 'number'
      ? appConfigResult.data.value
      : Number(appConfigResult.data?.value) || 2

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
        status: court.status,
        lat: court.lat,
        lng: court.lng,
        created_at: court.created_at,
      },
      location,
      config: courtConfigs,
      pricing: courtPricing,
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
