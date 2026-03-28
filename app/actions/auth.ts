'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normalizeName, validateName } from '@/lib/utils/normalizeName'
import { validatePasswordLength, validatePasswordMatch } from '@/lib/utils/passwordValidation'
import { extractCountry, validateCountryCode } from '@/lib/utils/countryValidation'

export type AuthActionResult = {
  errors?: Record<string, string>
  message?: string
}

// useActionState requires signature: (prevState: State, formData: FormData) => Promise<State>
export async function signUpAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const rawFirstName = formData.get('firstName') as string
  const rawLastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const planType = formData.get('planType') as string | null  // optional
  const country = extractCountry(formData)

  // Server-side validation
  const errors: Record<string, string> = {}
  const firstNameError = validateName(rawFirstName)
  const lastNameError = validateName(rawLastName)
  const passwordError = validatePasswordLength(password)
  const confirmError = validatePasswordMatch(password, confirmPassword)
  const countryError = validateCountryCode(country)

  if (firstNameError) errors.firstName = firstNameError
  if (lastNameError) errors.lastName = lastNameError
  if (passwordError) errors.password = passwordError
  if (confirmError) errors.confirmPassword = confirmError
  if (countryError) errors.country = countryError
  if (phone) {
    const phoneTrimmed = phone.trim()
    if (phoneTrimmed.length < 7 || phoneTrimmed.length > 20 || !/^[0-9\s\-+()]+$/.test(phoneTrimmed)) {
      errors.phone = 'Invalid phone number'
    }
  }
  if (Object.keys(errors).length > 0) return { errors }

  // Normalize names before creating account
  const firstName = normalizeName(rawFirstName)
  const lastName = normalizeName(rawLastName)

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  })

  if (error) return { message: error.message }
  if (!data.user) return { message: 'Signup failed — no user returned' }

  // Insert profile row via admin client — regular client has no session yet
  // until email is confirmed, so auth.uid() is null and RLS would block the insert.
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: data.user.id,
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    locale_pref: 'es',
    country,
  })

  if (profileError) return { message: profileError.message }

  // ?welcome=1 triggers the WelcomeBanner component in app/[locale]/page.tsx
  redirect('/?welcome=1')
}

export async function loginAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { message: error.message }

  redirect('/')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPasswordAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/update`,
  })

  if (error) return { message: error.message }
  return { message: 'Check your email for a password reset link' }
}

export async function updatePasswordAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  const errors: Record<string, string> = {}
  const passwordError = validatePasswordLength(password)
  const confirmError = validatePasswordMatch(password, confirmPassword)

  if (passwordError) errors.password = passwordError
  if (confirmError) errors.confirmPassword = confirmError
  if (Object.keys(errors).length > 0) return { errors }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { message: error.message }

  redirect('/login')
}
