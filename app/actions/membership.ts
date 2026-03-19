'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type MembershipActionResult = {
  success?: boolean
  error?: string
}

export async function setHomeLocationAction(
  _prevState: MembershipActionResult,
  formData: FormData,
): Promise<MembershipActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const locationId = formData.get('locationId') as string
  if (!locationId) return { error: 'missing_location' }

  // Verify user has an active basic membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, plan_type, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return { error: 'no_active_membership' }
  if (membership.plan_type !== 'basic') return { error: 'not_basic_plan' }

  // Verify the location exists
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .single()

  if (!location) return { error: 'invalid_location' }

  // Update membership with home location (use admin client — no UPDATE RLS for users on memberships)
  const { error: updateError } = await supabaseAdmin
    .from('memberships')
    .update({ location_id: locationId })
    .eq('id', membership.id)

  if (updateError) {
    console.error('Failed to set home location:', updateError)
    return { error: 'unexpected_error' }
  }

  return { success: true }
}
