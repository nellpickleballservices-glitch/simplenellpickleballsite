'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeName, validateName } from '@/lib/utils/normalizeName'
import { validatePasswordLength, validatePasswordMatch } from '@/lib/utils/passwordValidation'

export type ProfileActionResult = {
  success?: boolean
  error?: string
  details?: string[]
}

export async function updateProfileAction(
  _prevState: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const rawFirstName = formData.get('firstName') as string
  const rawLastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string

  // Validate
  const details: string[] = []
  const firstNameError = validateName(rawFirstName)
  const lastNameError = validateName(rawLastName)
  if (firstNameError) details.push(firstNameError)
  if (lastNameError) details.push(lastNameError)
  if (details.length > 0) return { error: 'validation_error', details }

  // Normalize
  const firstName = normalizeName(rawFirstName)
  const lastName = normalizeName(rawLastName)

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: phone?.trim() || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}

export async function changePasswordAction(
  _prevState: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validate new password
  const passwordError = validatePasswordLength(newPassword)
  if (passwordError) return { error: 'password_too_short' }

  const matchError = validatePasswordMatch(newPassword, confirmPassword)
  if (matchError) return { error: 'passwords_dont_match' }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (signInError) return { error: 'current_password_wrong' }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (updateError) return { error: updateError.message }

  return { success: true }
}
