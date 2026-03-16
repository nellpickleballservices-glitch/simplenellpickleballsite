export interface SessionPricing {
  id: string
  court_id: string
  day_of_week: number  // 0=Sunday, 6=Saturday
  price_cents: number
}

export interface PricingByDay {
  day_of_week: number
  day_name: string
  price_cents: number
}

export interface CourtPricingGrid {
  court_id: string
  court_name: string
  days: PricingByDay[]
}

export const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const

export interface PriceCalculationInput {
  basePriceCents: number
  surchargePercent: number
  isTourist: boolean
}

export interface PriceCalculationResult {
  basePriceCents: number
  surchargePercent: number
  surchargeAmountCents: number
  totalCents: number
  isTourist: boolean
}
