import { describe, it, expect } from 'vitest'

// Stub: verifies admin role is written to app_metadata (not user_metadata)
// Will use Supabase test client patterns once plan 01-02 creates the admin utility
describe('adminRole', () => {
  it.todo('assignAdminRole writes to app_metadata.role, not user_metadata.role')
  it.todo('a user cannot self-assign admin role via signUp metadata')
  it.todo('admin check reads from user.app_metadata.role')
})
