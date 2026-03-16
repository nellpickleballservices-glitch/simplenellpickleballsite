import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const ADMIN_DIR = join(ROOT, 'app/actions/admin')

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8')
}

describe('Admin barrel re-exports', () => {
  const barrelContent = read('app/actions/admin.ts')

  const expectedFunctions = [
    'requireAdmin',
    'getAdminStatsAction',
    'getEventsAction',
    'createEventAction',
    'updateEventAction',
    'deleteEventAction',
    'getCourtsAction',
    'addCourtAction',
    'getCourtConfigAction',
    'updateCourtConfigAction',
    'setMaintenanceAction',
    'clearMaintenanceAction',
    'searchUsersAction',
    'getUserDetailsAction',
    'disableUserAction',
    'enableUserAction',
    'triggerPasswordResetAction',
    'updateUserCountryAction',
    'getAllReservationsAction',
    'adminCancelReservationAction',
    'adminCreateReservationAction',
    'markCashPaidAction',
    'searchUsersForReservationAction',
    'getSessionPricePreviewAction',
    'getContentBlocksAction',
    'updateContentBlockAction',
    'reorderContentBlocksAction',
    'getSessionPricingAction',
    'upsertSessionPricingAction',
    'getTouristSurchargeAction',
    'updateTouristSurchargeAction',
    'getLocationsAction',
    'addLocationAction',
    'updateLocationAction',
    'deleteLocationAction',
  ]

  it('barrel file re-exports all action functions', () => {
    for (const fn of expectedFunctions) {
      expect(barrelContent, `Missing re-export for ${fn}`).toContain(fn)
    }
  })

  it('barrel file re-exports CourtWithLocation type', () => {
    expect(barrelContent).toContain('CourtWithLocation')
  })

  it('barrel file re-exports AdminReservation type', () => {
    expect(barrelContent).toContain('AdminReservation')
  })

  it('barrel file re-exports CourtConfigRow type', () => {
    expect(barrelContent).toContain('CourtConfigRow')
  })

  it('barrel file re-exports LocationRow type', () => {
    expect(barrelContent).toContain('LocationRow')
  })
})

describe('Admin domain files', () => {
  const domainFiles = [
    'app/actions/admin/auth.ts',
    'app/actions/admin/stats.ts',
    'app/actions/admin/events.ts',
    'app/actions/admin/courts.ts',
    'app/actions/admin/users.ts',
    'app/actions/admin/reservations.ts',
    'app/actions/admin/cms.ts',
    'app/actions/admin/pricing.ts',
    'app/actions/admin/locations.ts',
  ]

  for (const file of domainFiles) {
    it(`${file} has 'use server' directive`, () => {
      const content = read(file)
      expect(content.startsWith("'use server'"), `${file} missing 'use server' directive`).toBe(true)
    })
  }

  // All domain files except auth.ts should import requireAdmin
  const filesRequiringAuth = domainFiles.filter((f) => !f.endsWith('auth.ts'))

  for (const file of filesRequiringAuth) {
    it(`${file} imports requireAdmin from ./auth`, () => {
      const content = read(file)
      expect(content, `${file} missing requireAdmin import`).toContain("from './auth'")
    })
  }
})

describe('Admin query optimizations', () => {
  it('users.ts uses admin_users_view (not listUsers)', () => {
    const content = read('app/actions/admin/users.ts')
    expect(content).toContain('admin_users_view')
  })

  it('users.ts does NOT contain listUsers', () => {
    const content = read('app/actions/admin/users.ts')
    expect(content).not.toContain('listUsers')
  })

  it('users.ts uses 25-per-page pagination', () => {
    const content = read('app/actions/admin/users.ts')
    expect(content).toContain('USER_PAGE_SIZE = 25')
  })

  it('cms.ts uses batch_reorder_content_blocks RPC', () => {
    const content = read('app/actions/admin/cms.ts')
    expect(content).toContain('batch_reorder_content_blocks')
  })

  it('reservations.ts uses admin_users_view for user search', () => {
    const content = read('app/actions/admin/reservations.ts')
    expect(content).toContain('admin_users_view')
  })

  it('users.ts does NOT contain enrichProfilesWithAuthAndMembership', () => {
    const content = read('app/actions/admin/users.ts')
    expect(content).not.toContain('enrichProfilesWithAuthAndMembership')
  })
})
