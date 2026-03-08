import { describe, it, expect } from 'vitest'

// Stub: will use Supabase test client with anon key to verify RLS
// Tests run against a real Supabase project (requires NEXT_PUBLIC_SUPABASE_URL etc.)
describe('RLS policies', () => {
  describe('profiles table', () => {
    it.todo('RLS is enabled on profiles table')
    it.todo('user can read their own profile row')
    it.todo('user cannot read another user\'s profile row')
  })
  describe('memberships table', () => {
    it.todo('RLS is enabled on memberships table')
    it.todo('user can read their own membership row')
    it.todo('user cannot read another user\'s membership row')
  })
  describe('reservations table', () => {
    it.todo('RLS is enabled on reservations table')
    it.todo('user can read their own reservation rows')
    it.todo('user cannot read another user\'s reservation rows')
  })
})
