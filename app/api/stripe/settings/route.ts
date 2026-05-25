import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('restaurant_payment_settings')
    .select('id, restaurant_id, stripe_enabled, stripe_account_id, stripe_mode, connected_at, created_at, updated_at')
    .eq('restaurant_id', ctx.restaurantId)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

// PATCH is only used to update stripe_enabled (disable) — connection/disconnection
// is handled by the OAuth routes.
export async function PATCH(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stripe_enabled } = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('restaurant_payment_settings')
    .upsert(
      { restaurant_id: ctx.restaurantId, stripe_enabled, updated_at: new Date().toISOString() },
      { onConflict: 'restaurant_id' }
    )
    .select('id, restaurant_id, stripe_enabled, stripe_account_id, stripe_mode, connected_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
