import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit } from '@/lib/chat/rate-limit'

// Helper to create a mock Supabase client with chainable query builders
function createMockSupabase() {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdateEq = vi.fn()
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

  const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

  const mockFrom = vi.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }))

  return {
    from: mockFrom,
    _mocks: {
      mockFrom,
      mockSelect,
      mockEq,
      mockMaybeSingle,
      mockInsert,
      mockUpdate,
      mockUpdateEq,
    },
  }
}

describe('checkRateLimit', () => {
  let supabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    supabase = createMockSupabase()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T12:00:00Z'))
  })

  it('allows first message and inserts a new row', async () => {
    supabase._mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    supabase._mocks.mockInsert.mockResolvedValue({ error: null })

    const result = await checkRateLimit(supabase as any, 'session-1')

    expect(result).toEqual({ allowed: true })
    expect(supabase._mocks.mockInsert).toHaveBeenCalledWith({
      session_id: 'session-1',
      message_count: 1,
      window_start: new Date('2026-03-14T12:00:00Z').toISOString(),
    })
  })

  it('allows and increments when count < 20 and window not expired', async () => {
    supabase._mocks.mockMaybeSingle.mockResolvedValue({
      data: {
        message_count: 5,
        window_start: new Date('2026-03-14T11:30:00Z').toISOString(), // 30 min ago
      },
      error: null,
    })
    supabase._mocks.mockUpdateEq.mockResolvedValue({ error: null })

    const result = await checkRateLimit(supabase as any, 'session-1')

    expect(result).toEqual({ allowed: true })
    expect(supabase._mocks.mockUpdate).toHaveBeenCalledWith({ message_count: 6 })
    expect(supabase._mocks.mockUpdateEq).toHaveBeenCalledWith('session_id', 'session-1')
  })

  it('denies when count >= 20 and window not expired', async () => {
    supabase._mocks.mockMaybeSingle.mockResolvedValue({
      data: {
        message_count: 20,
        window_start: new Date('2026-03-14T11:30:00Z').toISOString(), // 30 min ago
      },
      error: null,
    })

    const result = await checkRateLimit(supabase as any, 'session-1')

    expect(result.allowed).toBe(false)
    expect(result.retryAfterMinutes).toBe(30) // ceil((60 - 30) / 1) = 30
  })

  it('resets count when window has expired (>1 hour)', async () => {
    supabase._mocks.mockMaybeSingle.mockResolvedValue({
      data: {
        message_count: 20,
        window_start: new Date('2026-03-14T10:00:00Z').toISOString(), // 2 hours ago
      },
      error: null,
    })
    supabase._mocks.mockUpdateEq.mockResolvedValue({ error: null })

    const result = await checkRateLimit(supabase as any, 'session-1')

    expect(result).toEqual({ allowed: true })
    expect(supabase._mocks.mockUpdate).toHaveBeenCalledWith({
      message_count: 1,
      window_start: new Date('2026-03-14T12:00:00Z').toISOString(),
    })
  })

  it('calculates retryAfterMinutes correctly using ceil', async () => {
    // Window started 50 minutes and 30 seconds ago -> 9.5 minutes remaining -> ceil = 10
    const windowStart = new Date('2026-03-14T11:09:30Z').toISOString()
    supabase._mocks.mockMaybeSingle.mockResolvedValue({
      data: { message_count: 20, window_start: windowStart },
      error: null,
    })

    const result = await checkRateLimit(supabase as any, 'session-1')

    expect(result.allowed).toBe(false)
    expect(result.retryAfterMinutes).toBe(10) // ceil(9.5) = 10
  })

  it('allows the 20th message (count at 19, increments to 20)', async () => {
    supabase._mocks.mockMaybeSingle.mockResolvedValue({
      data: {
        message_count: 19,
        window_start: new Date('2026-03-14T11:30:00Z').toISOString(),
      },
      error: null,
    })
    supabase._mocks.mockUpdateEq.mockResolvedValue({ error: null })

    const result = await checkRateLimit(supabase as any, 'session-1')

    expect(result).toEqual({ allowed: true })
    expect(supabase._mocks.mockUpdate).toHaveBeenCalledWith({ message_count: 20 })
  })
})
