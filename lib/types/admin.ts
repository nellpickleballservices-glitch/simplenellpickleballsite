// Admin domain type definitions
// Matches schema from supabase/migrations/0005_admin_events_cms.sql

export type EventType = 'tournament' | 'training' | 'social'

export interface Event {
  id: string
  title_es: string
  title_en: string
  description_es: string | null
  description_en: string | null
  event_date: string
  location_id: string | null
  event_type: EventType
  start_time: string | null
  end_time: string | null
  image_url: string | null
  price_cents: number | null
  created_at: string
}

export interface ContentBlock {
  id: string
  block_key: string
  block_type: string
  content_es: string | null
  content_en: string | null
  sort_order: number
  updated_at: string
}

export interface AdminStats {
  totalUsers: number
  activeMembers: number
  todayReservations: number
  upcomingEvents: number
}

export interface UserWithDetails {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  country: string | null
  created_at: string
  membership_status: string | null
  membership_plan: string | null
  is_banned: boolean
}
