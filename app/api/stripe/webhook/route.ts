import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  handleCheckoutCompleted,
  handleOneTimePaymentCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
} from '@/lib/stripe/webhookHandlers'

export async function POST(request: Request) {
  // Step 1: Raw body extraction — MUST use .text() not .json()
  // Using .json() re-serializes the body and corrupts the byte sequence
  // needed for Stripe signature verification.
  const body = await request.text()

  // Step 2: Signature verification
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // Step 3: Idempotency guard — deduplicate via webhook_events table
  const { error: insertError } = await supabaseAdmin
    .from('webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
    })

  if (insertError) {
    // 23505 = unique_violation — this event was already processed
    if (insertError.code === '23505') {
      return new Response('Duplicate event', { status: 200 })
    }
    console.error(`[Stripe Webhook] DB insert error for ${event.type} (${event.id}):`, insertError)
    return new Response('DB error', { status: 500 })
  }

  // Step 4: Event dispatch — route to appropriate handler
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'payment') {
          await handleOneTimePaymentCompleted(session, supabaseAdmin)
        } else {
          await handleCheckoutCompleted(session, supabaseAdmin)
        }
        break
      }
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabaseAdmin
        )
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabaseAdmin
        )
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          supabaseAdmin
        )
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabaseAdmin
        )
        break
      default:
        // Unhandled event type — acknowledge receipt
        break
    }
  } catch (err) {
    // Handler error — log details and return 500 so Stripe will retry
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
