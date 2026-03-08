import { test, expect } from '@playwright/test'

test.describe('Locale routing (I18N-01)', () => {
  test.skip('GET / responds 200 and renders Spanish content (no locale prefix)', async () => {})
  test.skip('GET /en/ responds 200 and renders English content', async () => {})
  test.skip('GET /es/ redirects to / (default locale has no prefix)', async () => {})
  test.skip('language switcher in nav changes locale and redirects to same page in other language', async () => {})
  test.skip('language preference cookie is set when switching language as guest', async () => {})
})
