'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function createCheckoutSessionAction(planType: 'vip' | 'basic') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const priceId = planType === 'vip'
    ? process.env.STRIPE_PRICE_ID_VIP!
    : process.env.STRIPE_PRICE_ID_BASIC!

  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Detect locale from referer URL or default to 'es'
  const referer = headersList.get('referer') || ''
  const locale = referer.includes('/en/') || referer.includes('/en?') ? 'en' : 'es'
  const localePrefix = locale === 'es' ? '' : `/${locale}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    success_url: `${origin}${localePrefix}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${localePrefix}/#membership-plans`,
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
      },
    },
  })

  redirect(session.url!)
}

export async function createPortalSessionAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (error || !membership?.stripe_customer_id) {
    // Manual membership without Stripe — redirect back to dashboard
    const headersList2 = await headers()
    const referer2 = headersList2.get('referer') || ''
    const loc = referer2.includes('/en/') || referer2.includes('/en?') ? 'en' : 'es'
    const prefix = loc === 'es' ? '' : `/${loc}`
    redirect(`${prefix}/dashboard`)
  }

  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Detect locale from referer URL or default to 'es'
  const referer = headersList.get('referer') || ''
  const locale = referer.includes('/en/') || referer.includes('/en?') ? 'en' : 'es'
  const localePrefix = locale === 'es' ? '' : `/${locale}`

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: membership.stripe_customer_id,
    return_url: `${origin}${localePrefix}/dashboard`,
  })

  redirect(portalSession.url)
}
