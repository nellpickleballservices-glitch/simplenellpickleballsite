/**
 * In-memory sliding-window IP rate limiter.
 * Burst limiter: 10 requests per 60 seconds per IP.
 * The existing DB-backed session limit (20/hr) is the durable limit.
 */

const IP_LIMIT = 10
const WINDOW_MS = 60_000 // 60 seconds

interface Entry {
  timestamps: number[]
}

const store = new Map<string, Entry>()

export function checkIpRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  // Clean stale entries on each check
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)
    if (entry.timestamps.length === 0) store.delete(key)
  }

  const entry = store.get(ip)

  if (!entry) {
    store.set(ip, { timestamps: [now] })
    return { allowed: true }
  }

  if (entry.timestamps.length >= IP_LIMIT) {
    return { allowed: false }
  }

  entry.timestamps.push(now)
  return { allowed: true }
}
