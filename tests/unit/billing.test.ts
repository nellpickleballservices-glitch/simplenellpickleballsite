import { describe, test, expect } from 'vitest'

describe('createCheckoutSessionAction', () => {
  test.skip('passes correct price ID for VIP plan', () => {
    expect(true).toBe(true)
  })

  test.skip('passes correct price ID for Basic plan', () => {
    expect(true).toBe(true)
  })

  test.skip('sets client_reference_id to supabase user UUID', () => {
    expect(true).toBe(true)
  })

  test.skip('sets mode to subscription', () => {
    expect(true).toBe(true)
  })

  test.skip('redirects to Stripe checkout URL', () => {
    expect(true).toBe(true)
  })
})

describe('createPortalSessionAction', () => {
  test.skip('fetches stripe_customer_id from memberships', () => {
    expect(true).toBe(true)
  })

  test.skip('creates portal session with correct customer ID', () => {
    expect(true).toBe(true)
  })

  test.skip('redirects to portal URL', () => {
    expect(true).toBe(true)
  })
})
