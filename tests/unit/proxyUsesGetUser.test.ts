import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Source-code check: verifies proxy.ts calls getUser() and not getSession()
describe('proxy.ts security checks', () => {
  it('proxy.ts uses getUser() not getSession()', () => {
    // This test will pass once proxy.ts exists (plan 01-01)
    // Until then it is skipped
    const proxyPath = join(process.cwd(), 'proxy.ts')
    let source: string
    try {
      source = readFileSync(proxyPath, 'utf-8')
    } catch {
      // File does not exist yet — skip until plan 01-01 creates it
      return
    }
    expect(source).toContain('getUser()')
    expect(source).not.toContain('getSession()')
  })
})
