import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { restaurant_id, amount_cents } = await request.json()

    if (!restaurant_id || !amount_cents || amount_cents < 50) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: settings } = await supabase
      .from('restaurant_payment_settings')
      .select('stripe_enabled, stripe_account_id, stripe_mode')
      .eq('restaurant_id', restaurant_id)
      .single()

    if (!settings?.stripe_enabled || !settings.stripe_account_id) {
      return NextResponse.json({ error: 'Stripe not connected for this restaurant' }, { status: 400 })
    }

    const isTestMode = settings.stripe_mode === 'test'
    const secretKey = isTestMode
      ? process.env.STRIPE_TEST_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      return NextResponse.json({ error: 'Stripe not configured on platform' }, { status: 500 })
    }

    const stripe = new Stripe(secretKey)

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount_cents),
      currency: 'usd',
      metadata: { restaurant_id },
    }

    // In live mode, route funds directly to the restaurant's connected account
    if (!isTestMode) {
      paymentIntentParams.transfer_data = { destination: settings.stripe_account_id }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)
    return NextResponse.json({ client_secret: paymentIntent.client_secret })
  } catch (err) {
    console.error('PaymentIntent error:', err)
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 })
  }
}
