// Supabase Edge Function: session-reminder
// Triggered every minute by pg_cron via pg_net
// Finds reservations ending in ~10 minutes, sends reminder email, sets reminder_sent=true
// Also cleans up expired pending_payment holds as a side effect

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ReservationRow {
  id: string
  user_id: string
  court_id: string
  starts_at: string
  ends_at: string
  reservation_user_first_name: string
  courts: { name: string }
  profiles: { first_name: string; locale_pref: string }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ----------------------------------------------------------------
    // 1. Send 10-minute session-end reminders
    // ----------------------------------------------------------------
    const now = new Date()
    const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
    const elevenMinLater = new Date(now.getTime() + 11 * 60 * 1000)

    const { data: reminders, error: reminderError } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        court_id,
        starts_at,
        ends_at,
        reservation_user_first_name,
        courts ( name ),
        profiles:user_id ( first_name, locale_pref )
      `)
      .eq('reminder_sent', false)
      .in('status', ['confirmed', 'paid'])
      .gte('ends_at', tenMinLater.toISOString())
      .lt('ends_at', elevenMinLater.toISOString())

    if (reminderError) {
      console.error('Error querying reminders:', reminderError.message)
    }

    const reservations = (reminders ?? []) as unknown as ReservationRow[]

    for (const reservation of reservations) {
      try {
        // Get user email from auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
          reservation.user_id,
        )
        if (authError || !authUser?.user?.email) {
          console.error(`Could not get email for user ${reservation.user_id}:`, authError?.message)
          continue
        }

        const email = authUser.user.email
        const locale = reservation.profiles?.locale_pref ?? 'es'
        const courtName = reservation.courts?.name ?? 'Court'
        const firstName = reservation.profiles?.first_name ?? reservation.reservation_user_first_name

        // Bilingual reminder text (NOTIF-03)
        const isSpanish = locale === 'es'
        const subject = isSpanish
          ? `Recordatorio: Tu sesion termina en 10 minutos`
          : `Reminder: Your session ends in 10 minutes`
        const body = isSpanish
          ? `Hola ${firstName},\n\nTu sesion de pickleball en ${courtName} termina en 10 minutos. Por favor, preparate para salir de la cancha para que el siguiente grupo pueda comenzar.\n\n— NELL Pickleball Club`
          : `Hi ${firstName},\n\nYour pickleball session at ${courtName} ends in 10 minutes. Please prepare to exit the court so the next group can begin.\n\n— NELL Pickleball Club`

        // Send via Resend REST API
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'NELL Pickleball Club <onboarding@resend.dev>',
            to: email,
            subject,
            text: body,
          }),
        })

        if (!resendResponse.ok) {
          const errText = await resendResponse.text()
          console.error(`Resend API error for reservation ${reservation.id}:`, errText)
          continue
        }

        // Mark reminder as sent (NOTIF-04)
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ reminder_sent: true })
          .eq('id', reservation.id)

        if (updateError) {
          console.error(`Failed to set reminder_sent for ${reservation.id}:`, updateError.message)
        }
      } catch (err) {
        // Individual email failures should not stop processing other reservations
        console.error(`Error processing reservation ${reservation.id}:`, err)
      }
    }

    // ----------------------------------------------------------------
    // 2. Clean up expired pending_payment holds
    // ----------------------------------------------------------------
    try {
      // Get hold window from app_config
      const { data: holdConfig } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'pending_payment_hold_hours')
        .single()

      const holdHours = holdConfig?.value ?? 2
      const holdMs = Number(holdHours) * 60 * 60 * 1000
      const expiryCutoff = new Date(now.getTime() - holdMs)

      const { error: expireError } = await supabase
        .from('reservations')
        .update({ status: 'expired' })
        .eq('status', 'pending_payment')
        .lt('created_at', expiryCutoff.toISOString())

      if (expireError) {
        console.error('Error expiring pending holds:', expireError.message)
      }
    } catch (err) {
      console.error('Error in hold cleanup:', err)
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('session-reminder function error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
