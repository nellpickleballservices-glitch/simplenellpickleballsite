import { test, expect } from '@playwright/test'

test.describe('Route protection (SEC-05)', () => {
  test.skip('unauthenticated GET /dashboard redirects to /login', async () => {})
  test.skip('unauthenticated GET /en/dashboard redirects to /en/login', async () => {})
  test.skip('unauthenticated GET /admin redirects to /login', async () => {})
  test.skip('authenticated non-admin GET /admin is rejected (403 or redirect)', async () => {})
})
