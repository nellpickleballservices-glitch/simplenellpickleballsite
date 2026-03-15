import { describe, it, expect } from 'vitest'
import { calculateSessionPrice, isTourist } from '@/lib/utils/pricing'

describe('isTourist', () => {
  it('returns false for "DO"', () => {
    expect(isTourist('DO')).toBe(false)
  })

  it('returns true for "US"', () => {
    expect(isTourist('US')).toBe(true)
  })

  it('returns true for null (conservative)', () => {
    expect(isTourist(null)).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isTourist('')).toBe(true)
  })
})

describe('calculateSessionPrice', () => {
  it('returns base price only for non-tourist', () => {
    const result = calculateSessionPrice({
      basePriceCents: 1000,
      surchargePercent: 25,
      isTourist: false,
    })
    expect(result).toEqual({
      basePriceCents: 1000,
      surchargePercent: 25,
      surchargeAmountCents: 0,
      totalCents: 1000,
      isTourist: false,
    })
  })

  it('returns base + surcharge for tourist', () => {
    const result = calculateSessionPrice({
      basePriceCents: 1000,
      surchargePercent: 25,
      isTourist: true,
    })
    expect(result).toEqual({
      basePriceCents: 1000,
      surchargePercent: 25,
      surchargeAmountCents: 250,
      totalCents: 1250,
      isTourist: true,
    })
  })

  it('rounds fractional cents with Math.round', () => {
    const result = calculateSessionPrice({
      basePriceCents: 750,
      surchargePercent: 25,
      isTourist: true,
    })
    // 750 * 25 / 100 = 187.5 -> Math.round = 188
    expect(result).toEqual({
      basePriceCents: 750,
      surchargePercent: 25,
      surchargeAmountCents: 188,
      totalCents: 938,
      isTourist: true,
    })
  })

  it('handles zero base price (member $0 case)', () => {
    const result = calculateSessionPrice({
      basePriceCents: 0,
      surchargePercent: 25,
      isTourist: true,
    })
    expect(result).toEqual({
      basePriceCents: 0,
      surchargePercent: 25,
      surchargeAmountCents: 0,
      totalCents: 0,
      isTourist: true,
    })
  })

  it('result always includes all fields', () => {
    const result = calculateSessionPrice({
      basePriceCents: 500,
      surchargePercent: 10,
      isTourist: false,
    })
    expect(result).toHaveProperty('basePriceCents')
    expect(result).toHaveProperty('surchargePercent')
    expect(result).toHaveProperty('surchargeAmountCents')
    expect(result).toHaveProperty('totalCents')
    expect(result).toHaveProperty('isTourist')
  })
})
