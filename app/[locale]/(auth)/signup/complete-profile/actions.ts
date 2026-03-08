'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthActionResult } from '@/app/actions/auth'

export async function completeOAuthProfileAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const phone = formData.get('phone') as string

  if (!phone || phone.trim().length === 0) {
    return { errors: { phone: 'Phone number is required' } }
  }

  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { message: 'Session expired — please sign in again' }

  // Upsert profile row for Google OAuth users
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    first_name: user.user_metadata?.full_name?.split(' ')[0] ?? '',
    last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? '',
    phone: phone.trim(),
    locale_pref: 'es',
  })

  if (error) return { message: error.message }

  redirect('/?welcome=1')
}
