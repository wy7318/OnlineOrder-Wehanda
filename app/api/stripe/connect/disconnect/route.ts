import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function POST() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: settings } = await supabase
    .from('restaurant_payment_settings')
    .select('stripe_account_id')
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  // Deauthorize the connected account from the platform
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (secretKey && settings?.stripe_account_id) {
    try {
      const stripe = new Stripe(secretKey)
      await stripe.oauth.deauthorize({
        client_id: process.env.STRIPE_CLIENT_ID!,
        stripe_user_id: settings.stripe_account_id,
      })
    } catch {
      // Deauthorize may fail if account was already disconnected from Stripe's side — continue
    }
  }

  await supabase
    .from('restaurant_payment_settings')
    .update({
      stripe_enabled: false,
      stripe_account_id: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('restaurant_id', ctx.restaurantId)

  return NextResponse.json({ ok: true })
}
