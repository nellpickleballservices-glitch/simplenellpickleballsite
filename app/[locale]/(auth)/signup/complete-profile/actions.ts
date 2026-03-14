'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthActionResult } from '@/app/actions/auth'
import { extractCountry, validateCountryCode } from '@/lib/utils/countryValidation'

export async function completeOAuthProfileAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const phone = formData.get('phone') as string
  const country = extractCountry(formData)

  if (!phone || phone.trim().length === 0) {
    return { errors: { phone: 'Phone number is required' } }
  }

  const countryError = validateCountryCode(country)
  if (countryError) {
    return { errors: { country: 'Invalid country code' } }
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
    country,
  })

  if (error) return { message: error.message }

  redirect('/?welcome=1')
}
