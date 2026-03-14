'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import type { UserWithDetails } from '@/lib/types/admin'

const USER_PAGE_SIZE = 25

/**
 * Search users by name, email, or phone. Returns paginated results.
 * Uses admin_users_view (Postgres view joining profiles + auth.users)
 * to eliminate N+1 listUsers(1000) pattern.
 */
export async function searchUsersAction(
  query: string,
  page: number = 1
): Promise<{ users: UserWithDetails[]; total: number; page: number }> {
  await requireAdmin()

  const offset = (page - 1) * USER_PAGE_SIZE
  const trimmed = query.trim()

  let q = supabaseAdmin
    .from('admin_users_view')
    .select('id, first_name, last_name, phone, email, last_sign_in_at, banned_until, created_at', { count: 'exact' })

  if (trimmed) {
    const term = `%${trimmed}%`
    q = q.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
  }

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + USER_PAGE_SIZE - 1)

  if (error) throw new Error(error.message)
  if (!data) return { users: [], total: 0, page }

  // Batch-fetch memberships for returned user IDs
  const userIds = data.map((u) => u.id)
  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select('user_id, status, plan')
    .in('user_id', userIds)

  const membershipMap = new Map(
    (memberships ?? []).map((m) => [m.user_id, m])
  )

  const users: UserWithDetails[] = data.map((u) => {
    const membership = membershipMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      created_at: u.created_at,
      membership_status: membership?.status ?? null,
      membership_plan: membership?.plan ?? null,
      is_banned: u.banned_until ? new Date(u.banned_until).getTime() > Date.now() : false,
    }
  })

  return { users, total: count ?? 0, page }
}

/**
 * Fetch full user details for the admin slide-out panel.
 * Uses admin_users_view for email/ban fields instead of auth admin API.
 */
export async function getUserDetailsAction(userId: string) {
  await requireAdmin()

  // Fetch user from admin_users_view (profile + auth fields in one query)
  const { data: viewUser, error: viewError } = await supabaseAdmin
    .from('admin_users_view')
    .select('id, first_name, last_name, phone, email, banned_until, created_at')
    .eq('id', userId)
    .single()

  if (viewError || !viewUser) throw new Error('User not found')

  // Fetch membership
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('plan, status, current_period_end, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()

  // Fetch reservation history (last 20)
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id, court_id, starts_at, ends_at, status, booking_mode, payment_status')
    .eq('user_id', userId)
    .order('starts_at', { ascending: false })
    .limit(20)

  return {
    id: viewUser.id,
    first_name: viewUser.first_name,
    last_name: viewUser.last_name,
    email: viewUser.email ?? '',
    phone: viewUser.phone,
    created_at: viewUser.created_at,
    is_banned: viewUser.banned_until
      ? new Date(viewUser.banned_until).getTime() > Date.now()
      : false,
    membership: membership
      ? {
          plan: membership.plan,
          status: membership.status,
          current_period_end: membership.current_period_end,
        }
      : null,
    reservations: reservations ?? [],
  }
}

/**
 * Disable a user account (ban) and auto-cancel their future reservations.
 */
export async function disableUserAction(userId: string) {
  await requireAdmin()

  // Ban the user for ~100 years
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })
  if (banError) throw banError

  // Auto-cancel future reservations
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .gt('starts_at', new Date().toISOString())
    .in('status', ['confirmed', 'pending_payment'])

  return { success: true }
}

/**
 * Re-enable a disabled (banned) user account.
 */
export async function enableUserAction(userId: string) {
  await requireAdmin()

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })
  if (error) throw error

  return { success: true }
}

/**
 * Trigger a password reset email for a user via Resend.
 */
export async function triggerPasswordResetAction(userId: string) {
  await requireAdmin()

  // Get user email from admin_users_view
  const { data: viewUser, error: viewError } = await supabaseAdmin
    .from('admin_users_view')
    .select('email')
    .eq('id', userId)
    .single()

  if (viewError || !viewUser) throw new Error('User not found')

  const email = viewUser.email
  if (!email) throw new Error('User has no email address')

  // Generate recovery link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  if (linkError) throw linkError

  const recoveryLink = linkData.properties.action_link

  // Send via Resend with bilingual template
  try {
    await resend.emails.send({
      from: 'NELL Pickleball Club <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset / Restablecer Contrasena — NELL Pickleball Club',
      text: `Password Reset / Restablecer Contrasena\n\nClick the link below to reset your password:\nHaz clic en el enlace para restablecer tu contrasena:\n\n${recoveryLink}\n\nThis link expires in 24 hours.\nEste enlace expira en 24 horas.\n\n— NELL Pickleball Club`,
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  return { success: true }
}
