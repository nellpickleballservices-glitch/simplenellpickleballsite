import type { SupabaseClient } from '@supabase/supabase-js'

const SESSION_LIMIT = 20
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check (and update) the rate limit for a chat session using the
 * `chat_rate_limits` Supabase table. Returns whether the request is
 * allowed and, if not, how many minutes until the window resets.
 *
 * Uses SELECT-then-INSERT/UPDATE (not upsert) because the count
 * increment is not idempotent.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{ allowed: boolean; retryAfterMinutes?: number }> {
  const { data } = await supabase
    .from('chat_rate_limits')
    .select('message_count, window_start')
    .eq('session_id', sessionId)
    .maybeSingle()

  const now = new Date()

  // First message in session — insert new row
  if (!data) {
    await supabase.from('chat_rate_limits').insert({
      session_id: sessionId,
      message_count: 1,
      window_start: now.toISOString(),
    })
    return { allowed: true }
  }

  const windowStart = new Date(data.window_start)
  const elapsed = now.getTime() - windowStart.getTime()

  // Window expired — reset
  if (elapsed > WINDOW_MS) {
    await supabase
      .from('chat_rate_limits')
      .update({ message_count: 1, window_start: now.toISOString() })
      .eq('session_id', sessionId)
    return { allowed: true }
  }

  // Limit reached
  if (data.message_count >= SESSION_LIMIT) {
    const retryAfterMinutes = Math.ceil((WINDOW_MS - elapsed) / 60000)
    return { allowed: false, retryAfterMinutes }
  }

  // Increment
  await supabase
    .from('chat_rate_limits')
    .update({ message_count: data.message_count + 1 })
    .eq('session_id', sessionId)
  return { allowed: true }
}
