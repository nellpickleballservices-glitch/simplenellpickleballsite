'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

interface SessionPaymentActionState {
  error?: string
}

export async function createSessionPaymentAction(
  _prevState: unknown,
  formData: FormData
): Promise<SessionPaymentActionState> {
  const supabase = await createClient()

  // Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const reservationId = formData.get('reservationId') as string

  // Fetch reservation, verify ownership and pending_payment status
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('id, user_id, status, payment_status, price_cents, court_id')
    .eq('id', reservationId)
    .single()

  if (fetchError || !reservation) {
    return { error: 'not_found' }
  }

  if (reservation.user_id !== user.id) {
    return { error: 'unauthorized' }
  }

  if (reservation.status !== 'pending_payment') {
    return { error: 'invalid_status' }
  }

  // Get court name for line item description
  const { data: court } = await supabase
    .from('courts')
    .select('name')
    .eq('id', reservation.court_id)
    .single()

  const courtName = court?.name ?? 'Court'

  // Detect locale and origin from headers
  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const referer = headersList.get('referer') || ''
  const locale = referer.includes('/en/') || referer.includes('/en?') ? 'en' : 'es'
  const localePrefix = locale === 'es' ? '' : `/${locale}`

  // Create Stripe Checkout session with mode: payment (one-time, not subscription)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: reservation.price_cents,
          product_data: {
            name: `Court Session - ${courtName}`,
          },
        },
        quantity: 1,
      },
    ],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: {
      reservation_id: reservationId,
    },
    success_url: `${origin}${localePrefix}/r3s-x7m1?paid=true`,
    cancel_url: `${origin}${localePrefix}/r3s-x7m1?payment_cancelled=true`,
  })

  redirect(session.url!)
}
