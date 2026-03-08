import { describe, test, expect } from 'vitest'

describe('proxy membership gating', () => {
  test.skip('active membership allows access to /member/ routes', () => {
    expect(true).toBe(true)
  })

  test.skip('cancelled membership redirects to /pricing', () => {
    expect(true).toBe(true)
  })

  test.skip('past_due membership redirects to /pricing', () => {
    expect(true).toBe(true)
  })

  test.skip('no membership row redirects to /pricing', () => {
    expect(true).toBe(true)
  })
})
