import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

/**
 * Determine plan type from Stripe price ID.
 * Matches against STRIPE_PRICE_ID_VIP; everything else is 'basic'.
 */
function determinePlanType(priceId: string): 'vip' | 'basic' {
  return priceId === process.env.STRIPE_PRICE_ID_VIP ? 'vip' : 'basic'
}

/**
 * Map Stripe subscription status to app membership status.
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'cancelled' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    default:
      return 'past_due'
  }
}

/**
 * Extract subscription ID from an Invoice's parent field.
 * In Stripe API 2026-02-25.clover, subscription moved from invoice.subscription
 * to invoice.parent.subscription_details.subscription.
 */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

/**
 * checkout.session.completed — upsert membership row with status active.
 * This is the initial subscription creation event.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
): Promise<void> {
  const userId = session.client_reference_id
  if (!userId) {
    throw new Error('Missing client_reference_id')
  }

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0].price.id
  const planType = determinePlanType(priceId)
  // In API 2026-02-25.clover, current_period_end moved to subscription items
  const periodEnd = new Date(subscription.items.data[0].current_period_end * 1000).toISOString()

  const { error } = await supabase.from('memberships').upsert(
    {
      user_id: userId,
      plan_type: planType,
      status: 'active',
      payment_method: 'stripe',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert membership: ${error.message}`)
  }
}

/**
 * customer.subscription.updated — reflects plan change and status change.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<void> {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0].price.id
  const planType = determinePlanType(priceId)
  const status = mapStripeStatus(subscription.status)
  const periodEnd = new Date(subscription.items.data[0].current_period_end * 1000).toISOString()

  const { error } = await supabase
    .from('memberships')
    .update({
      plan_type: planType,
      status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    throw new Error(`Failed to update membership: ${error.message}`)
  }
}

/**
 * customer.subscription.deleted — sets membership status to cancelled.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw new Error(`Failed to cancel membership: ${error.message}`)
  }
}

/**
 * invoice.payment_succeeded — updates current_period_end and sets status active.
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return // one-time invoices don't apply

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const periodEnd = new Date(subscription.items.data[0].current_period_end * 1000).toISOString()

  const { error } = await supabase
    .from('memberships')
    .update({
      current_period_end: periodEnd,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    throw new Error(`Failed to update membership period: ${error.message}`)
  }
}

/**
 * checkout.session.completed with mode=payment — updates reservation from pending_payment to paid/confirmed.
 * Called when a non-member completes a per-session Stripe Checkout payment.
 */
export async function handleOneTimePaymentCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
): Promise<void> {
  const reservationId = session.metadata?.reservation_id
  if (!reservationId) {
    // No reservation_id means this is a subscription checkout, not per-session
    return
  }

  const { error } = await supabase
    .from('reservations')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      stripe_payment_id: session.id,
    })
    .eq('id', reservationId)
    .eq('status', 'pending_payment')

  if (error) {
    // Log warning but do not throw — reservation may have been cancelled
    console.warn(`Failed to update reservation ${reservationId} after payment:`, error.message)
  }
}

/**
 * invoice.payment_failed — sets membership status to past_due.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return // one-time invoices don't apply

  const { error } = await supabase
    .from('memberships')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    throw new Error(`Failed to update membership status: ${error.message}`)
  }
}
