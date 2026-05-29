import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { haikuJSON, PROMPTS, buildEmailHtml } from '@/lib/ai/haiku'
import { sendEmail } from '@/lib/email'
import { getEmailBaseUrl } from '@/lib/utils/app-url'

const COOLDOWN_DAYS = 7

export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { customer_id } = body ?? {}
  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString()

  const [customerRes, restaurantRes, recentRes, lastOrderRes] = await Promise.all([
    admin
      .from('customers')
      .select('id, first_name, last_name, name, email, last_seen_at, churn_risk_score, loyalty_points_balance')
      .eq('id', customer_id)
      .eq('restaurant_id', ctx.restaurantId)
      .single(),

    admin
      .from('restaurants')
      .select('name, slug')
      .eq('id', ctx.restaurantId)
      .single(),

    admin
      .from('ai_messages_log')
      .select('id')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('customer_id', customer_id)
      .eq('message_type', 'win_back')
      .gte('sent_at', cooldownCutoff)
      .limit(1)
      .maybeSingle(),

    // Last order item names for personalization
    admin
      .from('orders')
      .select('order_items(item_name_snapshot)')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('customer_id', customer_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!customerRes.data?.email) {
    return NextResponse.json({ error: 'Customer has no email' }, { status: 422 })
  }
  if (recentRes.data) {
    return NextResponse.json({ already_sent: true })
  }

  const customer = customerRes.data
  const restaurant = restaurantRes.data!
  const customerName = customer.first_name
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    : customer.name

  const daysSince = customer.last_seen_at
    ? Math.floor((Date.now() - new Date(customer.last_seen_at).getTime()) / 86_400_000)
    : null

  // Safely extract last ordered items
  const lastOrderItems: string[] = []
  const rawOrder = lastOrderRes.data as { order_items?: { item_name_snapshot: string }[] } | null
  if (rawOrder?.order_items) {
    for (const oi of rawOrder.order_items.slice(0, 2)) {
      lastOrderItems.push(oi.item_name_snapshot)
    }
  }

  const { subject, body: msgBody } = await haikuJSON<{ subject: string; body: string }>(
    PROMPTS.winBack,
    JSON.stringify({
      restaurant: restaurant.name,
      customer: customerName,
      days_since_last_visit: daysSince,
      last_ordered_items: lastOrderItems,
      has_loyalty_points: (customer.loyalty_points_balance ?? 0) > 0,
      loyalty_points: customer.loyalty_points_balance ?? 0,
    }),
  )

  const html = buildEmailHtml({
    restaurantName: restaurant.name,
    customerName,
    body: msgBody,
    ctaLabel: 'Order Now',
    ctaUrl: `${getEmailBaseUrl()}/restaurant/${restaurant.slug}`,
  })

  await sendEmail({ to: customer.email, subject, html })

  void admin.from('ai_messages_log').insert({
    restaurant_id: ctx.restaurantId,
    customer_id: customer.id,
    message_type: 'win_back',
    channel: 'email',
    subject,
  })

  return NextResponse.json({ sent: true, subject })
}
