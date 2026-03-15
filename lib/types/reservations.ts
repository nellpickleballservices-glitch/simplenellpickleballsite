// Reservation system type definitions
// Matches schema from supabase/migrations/0003_reservations.sql

export type BookingMode = 'full_court' | 'open_play' | 'vip_guest'

export type PaymentStatus = 'free' | 'pending_payment' | 'paid' | 'cash_pending'

export type PaymentMethod = 'stripe' | 'cash'

export type ReservationStatus =
  | 'confirmed'
  | 'pending_payment'
  | 'paid'
  | 'cancelled'
  | 'expired'

export type CourtStatus = 'open' | 'closed' | 'maintenance'

export type DayType = 'weekday' | 'weekend'

export interface Reservation {
  id: string
  user_id: string
  court_id: string
  starts_at: string
  ends_at: string
  reservation_user_first_name: string
  reservation_user_last_name: string
  status: ReservationStatus
  reminder_sent: boolean
  booking_mode: BookingMode
  spot_number: number | null
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  stripe_payment_id: string | null
  guest_name: string | null
  price_cents: number
  is_tourist_price: boolean
  created_at: string
}

export interface CourtConfig {
  id: string
  court_id: string
  day_type: DayType
  open_time: string
  close_time: string
  full_court_start: string | null
  full_court_end: string | null
  open_play_start: string | null
  open_play_end: string | null
}

export interface CourtPricing {
  id: string
  court_id: string
  mode: BookingMode
  price_cents: number
}

export type AppConfigKey =
  | 'member_advance_booking_hours'
  | 'non_member_advance_booking_hours'
  | 'cancellation_window_hours'
  | 'vip_guest_limit'
  | 'pending_payment_hold_hours'
  | 'session_price_default'

export interface AppConfig {
  key: AppConfigKey
  value: number
}

export interface SpotInfo {
  spotNumber: number
  isAvailable: boolean
  reservedBy?: string
}

export interface TimeSlot {
  startTime: string
  endTime: string
  mode: BookingMode
  spots: SpotInfo[]
}

export interface Court {
  id: string
  location_id: string
  name: string
  status: CourtStatus
  lat: number | null
  lng: number | null
  created_at: string
}

export interface Location {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  created_at: string
}

export interface AvailabilitySummary {
  total: number
  available: number
}

export interface CourtWithConfig {
  court: Court
  location: Location | null
  config: CourtConfig[]
  pricing: CourtPricing[]
  sessionPriceCents?: number
  defaultPriceCents?: number
  touristSurchargePct?: number
  displayPriceCents?: number
  timeSlots: TimeSlot[]
  availabilitySummary: AvailabilitySummary
}
