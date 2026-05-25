import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public endpoint — no auth required.
// Returns the platform's publishable key + whether this restaurant has Stripe connected.
// Secret keys are NEVER returned.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ stripe_enabled: false, publishable_key: null })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('restaurant_payment_settings')
    .select('stripe_enabled, stripe_account_id, stripe_mode')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  if (!data?.stripe_enabled || !data.stripe_account_id) {
    return NextResponse.json({ stripe_enabled: false, publishable_key: null, is_test_mode: false })
  }

  const isTestMode = data.stripe_mode === 'test'
  const publishableKey = isTestMode
    ? process.env.STRIPE_TEST_PUBLISHABLE_KEY
    : process.env.STRIPE_PUBLISHABLE_KEY

  return NextResponse.json({
    stripe_enabled: !!publishableKey,
    publishable_key: publishableKey ?? null,
    is_test_mode: isTestMode,
  })
}
