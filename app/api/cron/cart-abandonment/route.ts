import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 120

// Fires every 30 minutes. Finds non-empty carts that have been idle for
// 30 min–24 hours without a corresponding completed/pending order, fires a
// cart_abandoned event, and marks the cart so it won't fire again.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // Window: idle for at least 30 min but no longer than 24 hours
  // (after 24 h we stop caring — the session is long cold)
  const windowEnd   = new Date(now.getTime() - 30 * 60 * 1000).toISOString()   // 30 min ago
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() // 24 h ago

  const { data: carts, error } = await admin
    .from('active_carts')
    .select('id, restaurant_id, auth_user_id, items, updated_at')
    .lte('updated_at', windowEnd)
    .gte('updated_at', windowStart)
    .is('abandoned_at', null)

  if (error) {
    console.error('[cart-abandonment] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let fired = 0

  for (const cart of carts ?? []) {
    // Skip empty carts (shouldn't happen but guard anyway)
    const items = Array.isArray(cart.items) ? cart.items : []
    if (items.length === 0) continue

    // Check if the customer placed an order at this restaurant after the cart
    // was last updated — if so it converted, not abandoned
    const { data: recentOrder } = await admin
      .from('orders')
      .select('id')
      .eq('restaurant_id', cart.restaurant_id)
      .eq('customer_user_id', cart.auth_user_id)
      .in('status', ['new', 'accepted', 'preparing', 'ready', 'completed'])
      .gte('created_at', cart.updated_at)
      .limit(1)
      .maybeSingle()

    if (recentOrder) continue // cart converted to an order

    // Resolve CRM customer_id
    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .eq('restaurant_id', cart.restaurant_id)
      .eq('auth_user_id', cart.auth_user_id)
      .maybeSingle()

    if (customer) {
      await admin.from('customer_events').insert({
        customer_id: customer.id,
        restaurant_id: cart.restaurant_id,
        event_type: 'cart_abandoned',
        event_at: cart.updated_at,
        recorded_at: now.toISOString(),
        device_type: 'mobile_web',
        metadata: {
          item_count: items.length,
          items: items.map((i: { name?: string; quantity?: number; line_total?: number }) => ({
            name: i.name,
            quantity: i.quantity,
            line_total: i.line_total,
          })),
        },
      })
    }

    // Mark as abandoned so we don't fire again for this cart session
    await admin
      .from('active_carts')
      .update({ abandoned_at: now.toISOString() })
      .eq('id', cart.id)

    fired++
  }

  return NextResponse.json({ checked: carts?.length ?? 0, fired })
}
