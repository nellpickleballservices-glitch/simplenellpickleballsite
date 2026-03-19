import { describe, it, expect } from 'vitest'

/**
 * Tests for membership location access control logic.
 *
 * The rules (from app/actions/reservations.ts lines 99-110):
 *   - Basic members have a location_id → can only book courts at that location
 *   - VIP members have null location_id → can book at any location
 *   - Non-members → can book at any location (pay per session)
 *
 * We test the pure logic here, extracted from the server action.
 */

interface MembershipInfo {
  plan_type: 'basic' | 'vip' | 'day_pass'
  location_id: string | null
  status: string
}

/**
 * Mirrors the location restriction check in createReservationAction (lines 99-110).
 * Returns 'location_restricted' if the member cannot book at this court's location.
 */
function checkLocationAccess(
  membership: MembershipInfo | null,
  courtLocationId: string
): 'location_restricted' | null {
  const isMember = !!membership && membership.status === 'active'
  const memberLocationId = membership?.location_id ?? null

  // Exact logic from reservations.ts lines 100-109
  if (isMember && membership!.plan_type === 'basic' && memberLocationId) {
    if (courtLocationId !== memberLocationId) {
      return 'location_restricted'
    }
  }

  return null
}

const LOCATION_A = 'loc-aaa'
const LOCATION_B = 'loc-bbb'

describe('Membership location access control', () => {
  describe('Basic membership (single location)', () => {
    const basicAtA: MembershipInfo = { plan_type: 'basic', location_id: LOCATION_A, status: 'active' }

    it('allows booking at the assigned location', () => {
      const result = checkLocationAccess(basicAtA, LOCATION_A)
      expect(result).toBeNull()
    })

    it('blocks booking at a different location', () => {
      const result = checkLocationAccess(basicAtA, LOCATION_B)
      expect(result).toBe('location_restricted')
    })

    it('basic member assigned to B is blocked from A', () => {
      const basicAtB: MembershipInfo = { plan_type: 'basic', location_id: LOCATION_B, status: 'active' }
      const result = checkLocationAccess(basicAtB, LOCATION_A)
      expect(result).toBe('location_restricted')
    })

    it('basic member with null location_id can book anywhere (location not yet chosen)', () => {
      const basicNoLoc: MembershipInfo = { plan_type: 'basic', location_id: null, status: 'active' }
      expect(checkLocationAccess(basicNoLoc, LOCATION_A)).toBeNull()
      expect(checkLocationAccess(basicNoLoc, LOCATION_B)).toBeNull()
    })

    it('inactive basic member is not restricted (isMember = false)', () => {
      const inactiveBasic: MembershipInfo = { plan_type: 'basic', location_id: LOCATION_A, status: 'cancelled' }
      expect(checkLocationAccess(inactiveBasic, LOCATION_B)).toBeNull()
    })
  })

  describe('VIP membership (all locations)', () => {
    const vip: MembershipInfo = { plan_type: 'vip', location_id: null, status: 'active' }

    it('allows booking at location A', () => {
      expect(checkLocationAccess(vip, LOCATION_A)).toBeNull()
    })

    it('allows booking at location B', () => {
      expect(checkLocationAccess(vip, LOCATION_B)).toBeNull()
    })

    it('VIP never gets location_restricted regardless of location', () => {
      const locations = ['loc-1', 'loc-2', 'loc-3', 'loc-4', 'loc-5']
      for (const loc of locations) {
        expect(checkLocationAccess(vip, loc)).toBeNull()
      }
    })
  })

  describe('Non-member (no membership)', () => {
    it('can book at any location', () => {
      expect(checkLocationAccess(null, LOCATION_A)).toBeNull()
      expect(checkLocationAccess(null, LOCATION_B)).toBeNull()
    })
  })

  describe('Access matrix', () => {
    // Comprehensive matrix test
    const cases: Array<{
      label: string
      membership: MembershipInfo | null
      courtLocation: string
      expected: 'location_restricted' | null
    }> = [
      // Basic at A
      { label: 'Basic@A → court@A', membership: { plan_type: 'basic', location_id: LOCATION_A, status: 'active' }, courtLocation: LOCATION_A, expected: null },
      { label: 'Basic@A → court@B', membership: { plan_type: 'basic', location_id: LOCATION_A, status: 'active' }, courtLocation: LOCATION_B, expected: 'location_restricted' },
      // Basic at B
      { label: 'Basic@B → court@A', membership: { plan_type: 'basic', location_id: LOCATION_B, status: 'active' }, courtLocation: LOCATION_A, expected: 'location_restricted' },
      { label: 'Basic@B → court@B', membership: { plan_type: 'basic', location_id: LOCATION_B, status: 'active' }, courtLocation: LOCATION_B, expected: null },
      // VIP (no location restriction)
      { label: 'VIP → court@A', membership: { plan_type: 'vip', location_id: null, status: 'active' }, courtLocation: LOCATION_A, expected: null },
      { label: 'VIP → court@B', membership: { plan_type: 'vip', location_id: null, status: 'active' }, courtLocation: LOCATION_B, expected: null },
      // Non-member
      { label: 'Non-member → court@A', membership: null, courtLocation: LOCATION_A, expected: null },
      { label: 'Non-member → court@B', membership: null, courtLocation: LOCATION_B, expected: null },
      // Edge: basic with no location chosen
      { label: 'Basic(no loc) → court@A', membership: { plan_type: 'basic', location_id: null, status: 'active' }, courtLocation: LOCATION_A, expected: null },
      // Edge: cancelled membership
      { label: 'Cancelled Basic@A → court@B', membership: { plan_type: 'basic', location_id: LOCATION_A, status: 'cancelled' }, courtLocation: LOCATION_B, expected: null },
    ]

    for (const { label, membership, courtLocation, expected } of cases) {
      it(label, () => {
        expect(checkLocationAccess(membership, courtLocation)).toBe(expected)
      })
    }
  })
})
