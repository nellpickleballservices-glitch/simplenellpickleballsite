import { describe, it, expect } from 'vitest'
import {
  validateDayOfWeek,
  validatePriceCents,
  validateSurchargePct,
} from '@/lib/utils/pricingValidation'

describe('pricing validation helpers', () => {
  describe('validateDayOfWeek', () => {
    it('accepts 0 (Sunday)', () => {
      expect(validateDayOfWeek(0)).toBe(true)
    })

    it('accepts 6 (Saturday)', () => {
      expect(validateDayOfWeek(6)).toBe(true)
    })

    it('accepts values 1-5', () => {
      for (let d = 1; d <= 5; d++) {
        expect(validateDayOfWeek(d)).toBe(true)
      }
    })

    it('rejects -1', () => {
      expect(validateDayOfWeek(-1)).toBe(false)
    })

    it('rejects 7', () => {
      expect(validateDayOfWeek(7)).toBe(false)
    })

    it('rejects non-integer', () => {
      expect(validateDayOfWeek(1.5)).toBe(false)
    })
  })

  describe('validatePriceCents', () => {
    it('accepts 0', () => {
      expect(validatePriceCents(0)).toBe(true)
    })

    it('accepts positive integer', () => {
      expect(validatePriceCents(1000)).toBe(true)
    })

    it('rejects negative value', () => {
      expect(validatePriceCents(-1)).toBe(false)
    })

    it('rejects non-integer', () => {
      expect(validatePriceCents(10.5)).toBe(false)
    })
  })

  describe('validateSurchargePct', () => {
    it('accepts 0', () => {
      expect(validateSurchargePct(0)).toBe(true)
    })

    it('accepts 100', () => {
      expect(validateSurchargePct(100)).toBe(true)
    })

    it('accepts 25', () => {
      expect(validateSurchargePct(25)).toBe(true)
    })

    it('rejects -1', () => {
      expect(validateSurchargePct(-1)).toBe(false)
    })

    it('rejects 101', () => {
      expect(validateSurchargePct(101)).toBe(false)
    })

    it('rejects non-integer', () => {
      expect(validateSurchargePct(25.5)).toBe(false)
    })
  })
})
