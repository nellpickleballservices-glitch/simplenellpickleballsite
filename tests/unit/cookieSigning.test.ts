import { describe, it, expect, beforeAll, vi } from 'vitest'

// Set env before importing module
vi.stubEnv('MEMBERSHIP_COOKIE_SECRET', 'test-secret-key-for-hmac-signing-32b')

// Dynamic import after env is set
let sign: (payload: string) => Promise<string>
let verify: (payload: string, signature: string) => Promise<boolean>
let setMembershipCookie: any
let getMembershipFromCookie: any
type MembershipCache = { active: boolean; planType: string | null; cachedAt: number }

beforeAll(async () => {
  const mod = await import('@/lib/middleware/cookie-signing')
  sign = mod.sign
  verify = mod.verify
  setMembershipCookie = mod.setMembershipCookie
  getMembershipFromCookie = mod.getMembershipFromCookie
})

describe('sign and verify', () => {
  it('sign(payload) produces a base64 string', async () => {
    const sig = await sign('hello')
    expect(sig).toBeTruthy()
    // Base64 characters only
    expect(sig).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  it('verify(payload, signature) returns true for valid signatures', async () => {
    const payload = 'test-payload'
    const sig = await sign(payload)
    const result = await verify(payload, sig)
    expect(result).toBe(true)
  })

  it('verify(payload, wrongSignature) returns false', async () => {
    const payload = 'test-payload'
    const result = await verify(payload, 'wrongsignature')
    expect(result).toBe(false)
  })

  it('verify(tamperedPayload, originalSignature) returns false', async () => {
    const payload = 'original-payload'
    const sig = await sign(payload)
    const result = await verify('tampered-payload', sig)
    expect(result).toBe(false)
  })
})

// Lightweight mock helpers for NextRequest/NextResponse cookies
function createMockRequest(cookies: Record<string, string> = {}) {
  return {
    cookies: {
      get(name: string) {
        return cookies[name] ? { value: cookies[name] } : undefined
      },
    },
  } as any
}

function createMockResponse() {
  const cookieStore: Record<string, { value: string; options: any }> = {}
  return {
    cookies: {
      set(name: string, value: string, options: any) {
        cookieStore[name] = { value, options }
      },
    },
    _cookieStore: cookieStore,
  } as any
}

describe('getMembershipFromCookie', () => {
  it('returns null when cookie is missing', async () => {
    const req = createMockRequest()
    const result = await getMembershipFromCookie(req)
    expect(result).toBeNull()
  })

  it('returns null when signature is invalid', async () => {
    const payload = JSON.stringify({ active: true, planType: 'vip', cachedAt: Date.now() })
    const req = createMockRequest({ nell_membership_cache: `${payload}.invalidsig` })
    const result = await getMembershipFromCookie(req)
    expect(result).toBeNull()
  })

  it('returns null when TTL (5 minutes) has expired', async () => {
    const data: MembershipCache = {
      active: true,
      planType: 'vip',
      cachedAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago
    }
    const payload = JSON.stringify(data)
    const sig = await sign(payload)
    const req = createMockRequest({ nell_membership_cache: `${payload}.${sig}` })
    const result = await getMembershipFromCookie(req)
    expect(result).toBeNull()
  })

  it('returns MembershipCache when cookie is valid and within TTL', async () => {
    const data: MembershipCache = {
      active: true,
      planType: 'vip',
      cachedAt: Date.now(), // fresh
    }
    const payload = JSON.stringify(data)
    const sig = await sign(payload)
    const req = createMockRequest({ nell_membership_cache: `${payload}.${sig}` })
    const result = await getMembershipFromCookie(req)
    expect(result).toEqual(data)
  })
})

describe('setMembershipCookie', () => {
  it('sets httpOnly, secure, sameSite=lax, maxAge=300, path=/', async () => {
    const res = createMockResponse()
    const data: MembershipCache = { active: true, planType: 'basic', cachedAt: Date.now() }
    await setMembershipCookie(res, data)

    const cookie = res._cookieStore['nell_membership_cache']
    expect(cookie).toBeDefined()
    expect(cookie.options.httpOnly).toBe(true)
    expect(cookie.options.secure).toBe(true)
    expect(cookie.options.sameSite).toBe('lax')
    expect(cookie.options.maxAge).toBe(300)
    expect(cookie.options.path).toBe('/')

    // Value should be payload.signature format
    const dotIndex = cookie.value.lastIndexOf('.')
    expect(dotIndex).toBeGreaterThan(0)
    const payloadPart = cookie.value.substring(0, dotIndex)
    const parsed = JSON.parse(payloadPart)
    expect(parsed.active).toBe(true)
    expect(parsed.planType).toBe('basic')
  })
})
