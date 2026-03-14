import { type NextRequest, NextResponse } from 'next/server'

const MEMBERSHIP_COOKIE = 'nell_membership_cache'
const SECRET = process.env.MEMBERSHIP_COOKIE_SECRET!
const TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface MembershipCache {
  active: boolean
  planType: string | null
  cachedAt: number
}

const encoder = new TextEncoder()

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

export async function sign(payload: string): Promise<string> {
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function verify(payload: string, signature: string): Promise<boolean> {
  const expected = await sign(payload)
  return expected === signature
}

export async function setMembershipCookie(
  response: NextResponse,
  data: MembershipCache
): Promise<void> {
  const payload = JSON.stringify(data)
  const signature = await sign(payload)
  response.cookies.set(MEMBERSHIP_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })
}

export async function getMembershipFromCookie(
  request: NextRequest
): Promise<MembershipCache | null> {
  const raw = request.cookies.get(MEMBERSHIP_COOKIE)?.value
  if (!raw) return null

  const dotIndex = raw.lastIndexOf('.')
  if (dotIndex === -1) return null

  const payload = raw.substring(0, dotIndex)
  const signature = raw.substring(dotIndex + 1)

  if (!(await verify(payload, signature))) return null

  const data: MembershipCache = JSON.parse(payload)

  // Check TTL (5 minutes)
  if (Date.now() - data.cachedAt > TTL_MS) return null

  return data
}
