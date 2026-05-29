import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

const COOLDOWN_DAYS = 7

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString()

  // Run all queries in parallel
  const [
    restaurantRes,
    cartsRes,
    winBackRes,
    recentMessagesRes,
  ] = await Promise.all([
    admin
      .from('restaurants')
      .select('name, slug')
      .eq('id', ctx.restaurantId)
      .single(),

    // Abandoned carts (processed by cron, abandoned_at is set)
    admin
      .from('active_carts')
      .select('id, auth_user_id, items, updated_at, abandoned_at')
      .eq('restaurant_id', ctx.restaurantId)
      .not('abandoned_at', 'is', null)
      .order('abandoned_at', { ascending: false })
      .limit(30),

    // At-risk customers: churn_risk_score > 0.5, last scored, have email
    admin
      .from('customers')
      .select('id, first_name, last_name, name, email, phone, churn_risk_score, segment_ai_label, last_seen_at, last_ai_scored_at')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('is_blocked', false)
      .not('email', 'is', null)
      .not('email', 'eq', '')
      .gt('churn_risk_score', 0.5)
      .order('churn_risk_score', { ascending: false })
      .limit(25),

    // Recent ai_messages_log to check cooldowns
    admin
      .from('ai_messages_log')
      .select('customer_id, message_type, reference_id')
      .eq('restaurant_id', ctx.restaurantId)
      .gte('sent_at', cooldownCutoff),
  ])

  const restaurant = restaurantRes.data
  const carts = cartsRes.data ?? []
  const winBackCustomers = winBackRes.data ?? []
  const recentMessages = recentMessagesRes.data ?? []

  // Build cooldown lookup sets
  const recentCartRecovery = new Set(
    recentMessages.filter(m => m.message_type === 'cart_recovery').map(m => m.reference_id),
  )
  const recentWinBack = new Set(
    recentMessages.filter(m => m.message_type === 'win_back').map(m => m.customer_id),
  )

  // Resolve auth_user_ids → customers for cart entries
  const authUserIds = [...new Set(carts.map(c => c.auth_user_id).filter(Boolean))]
  const customersByAuthId = new Map<string, { id: string; first_name: string | null; last_name: string | null; name: string; email: string | null; phone: string | null }>()

  if (authUserIds.length > 0) {
    const { data: cartCustomers } = await admin
      .from('customers')
      .select('id, auth_user_id, first_name, last_name, name, email, phone')
      .eq('restaurant_id', ctx.restaurantId)
      .in('auth_user_id', authUserIds)

    for (const c of cartCustomers ?? []) {
      if (c.auth_user_id) customersByAuthId.set(c.auth_user_id, c)
    }
  }

  // Build cart recovery list
  const now = Date.now()
  const cartRecovery = carts
    .map(cart => {
      const customer = customersByAuthId.get(cart.auth_user_id)
      if (!customer?.email) return null

      const items = Array.isArray(cart.items) ? cart.items as { name?: string; quantity?: number }[] : []
      const hoursAgo = Math.round((now - new Date(cart.abandoned_at!).getTime()) / 3_600_000)

      return {
        cart_id: cart.id,
        customer_id: customer.id,
        customer_name: customer.first_name
          ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
          : customer.name,
        email: customer.email,
        phone: customer.phone,
        item_count: items.length,
        items: items.slice(0, 3).map(i => ({ name: i.name ?? 'Item', quantity: i.quantity ?? 1 })),
        hours_ago: hoursAgo,
        recently_messaged: recentCartRecovery.has(cart.id),
      }
    })
    .filter(Boolean)

  // Build win-back list
  const winBack = winBackCustomers.map(c => {
    const displayName = c.first_name
      ? [c.first_name, c.last_name].filter(Boolean).join(' ')
      : c.name
    const daysSince = c.last_seen_at
      ? Math.floor((now - new Date(c.last_seen_at).getTime()) / 86_400_000)
      : null

    return {
      customer_id: c.id,
      customer_name: displayName,
      email: c.email,
      phone: c.phone,
      churn_risk_score: Math.round((c.churn_risk_score ?? 0) * 100),
      segment_ai_label: c.segment_ai_label,
      last_seen_at: c.last_seen_at,
      days_since_seen: daysSince,
      recently_messaged: recentWinBack.has(c.id),
    }
  })

  return NextResponse.json({
    restaurant_name: restaurant?.name ?? '',
    restaurant_slug: restaurant?.slug ?? '',
    cart_recovery: cartRecovery,
    win_back: winBack,
  })
}
