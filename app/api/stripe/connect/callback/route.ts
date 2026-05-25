import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Handles the OAuth redirect from Stripe after the restaurant owner authorizes.
export async function GET(request: Request) {
  // After OAuth, redirect back to where the user's session cookie lives.
  // In local dev this is localhost even though NEXT_PUBLIC_APP_URL points to ngrok.
  const appUrl = process.env.STRIPE_REDIRECT_BACK_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const restaurantId = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !restaurantId) {
    const reason = error ?? 'missing_params'
    return NextResponse.redirect(new URL(`/setup?stripe_error=${reason}`, appUrl))
  }

  const isTestConnect = process.env.STRIPE_CONNECT_MODE === 'test'
  const secretKey = isTestConnect
    ? process.env.STRIPE_TEST_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.redirect(new URL('/setup?stripe_error=not_configured', appUrl))
  }

  try {
    const stripe = new Stripe(secretKey)
    // Exchange the authorization code for the connected account's credentials
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })

    const accountId = response.stripe_user_id
    if (!accountId) {
      return NextResponse.redirect(new URL('/setup?stripe_error=no_account', appUrl))
    }

    const supabase = createAdminClient()
    const { error: upsertError } = await supabase
      .from('restaurant_payment_settings')
      .upsert(
        {
          restaurant_id: restaurantId,
          stripe_enabled: true,
          stripe_account_id: accountId,
          stripe_mode: isTestConnect ? 'test' : 'live',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id' }
      )

    if (upsertError) {
      console.error('Stripe Connect DB save error:', upsertError)
      return NextResponse.redirect(new URL(`/setup?stripe_error=db_save_failed&detail=${encodeURIComponent(upsertError.message)}`, appUrl))
    }

    return NextResponse.redirect(new URL('/setup?stripe_connected=1', appUrl))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Stripe Connect callback error:', msg)
    return NextResponse.redirect(new URL(`/setup?stripe_error=exchange_failed&detail=${encodeURIComponent(msg)}`, appUrl))
  }
}
