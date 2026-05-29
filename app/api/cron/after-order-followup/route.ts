import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCampaign, sendCampaignEmail, finalizeCampaign,
  alreadySentCampaign, getAutomationSettings, verifyCronSecret,
} from '@/lib/ai/campaigns'

const DAYS_AFTER_ORDER = 3
const COOLDOWN_DAYS = 30

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - (DAYS_AFTER_ORDER + 1) * 86_400_000).toISOString()
  const windowEnd = new Date(Date.now() - DAYS_AFTER_ORDER * 86_400_000).toISOString()

  // Find completed orders placed exactly 3 days ago with known customers
  const { data: orders } = await admin
    .from('orders')
    .select(`
      id, customer_id, restaurant_id, total_amount,
      order_items(item_name_snapshot),
      customers!inner(id, first_name, last_name, name, email, marketing_opt_in),
      restaurants!inner(id, name, slug)
    `)
    .eq('status', 'completed')
    .gte('created_at', windowStart)
    .lt('created_at', windowEnd)
    .not('customer_id', 'is', null)
    .eq('customers.marketing_opt_in', true)
    .not('customers.email', 'is', null)

  if (!orders?.length) return NextResponse.json({ sent: 0 })

  // Group by restaurant and deduplicate by customer (take first order per customer)
  const seen = new Set<string>()
  const byRestaurant = new Map<string, { restaurant: { id: string; name: string; slug: string }; customers: typeof orders }>()

  for (const order of orders) {
    const key = `${order.restaurant_id}:${order.customer_id}`
    if (seen.has(key)) continue
    seen.add(key)

    const rid = order.restaurant_id as string
    if (!byRestaurant.has(rid)) {
      byRestaurant.set(rid, {
        restaurant: order.restaurants as unknown as { id: string; name: string; slug: string },
        customers: [],
      })
    }
    byRestaurant.get(rid)!.customers.push(order)
  }

  let totalSent = 0

  for (const [restaurantId, { restaurant, customers: customerOrders }] of byRestaurant) {
    const settings = await getAutomationSettings(restaurantId)
    if (!settings.after_order_enabled) continue

    const campaignId = await createCampaign({
      restaurantId,
      campaignType: 'after_order',
      name: `After-Order Follow-up — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    })

    let sent = 0
    for (const order of customerOrders) {
      const customer = order.customers as unknown as {
        id: string; first_name?: string; last_name?: string; name?: string; email: string
      }

      const alreadySent = await alreadySentCampaign({
        restaurantId,
        customerId: customer.id,
        campaignType: 'after_order',
        withinDays: COOLDOWN_DAYS,
      })
      if (alreadySent) continue

      const items = ((order.order_items as { item_name_snapshot: string }[]) ?? [])
        .slice(0, 3).map(i => i.item_name_snapshot)

      const customerName = customer.first_name
        ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        : customer.name ?? 'there'

      try {
        await sendCampaignEmail({
          campaignId,
          restaurantId,
          customerId: customer.id,
          customerEmail: customer.email,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          customerName,
          promptKey: 'afterOrder',
          promptContext: {
            restaurant: restaurant.name,
            customer: customerName,
            ordered_items: items,
            days_ago: DAYS_AFTER_ORDER,
          },
          ctaLabel: 'Order Again',
          highlight: {
            emoji: '🍽️',
            label: 'Your last order',
            value: items[0] ?? 'Your meal',
            note: items.length > 1 ? `+ ${items.slice(1).join(', ')}` : undefined,
            accentColor: '#059669',
            bgColor: '#ecfdf5',
          },
        })
        sent++
        totalSent++
      } catch (err) {
        console.error('[after-order-followup] send failed for', customer.id, err)
      }
    }

    if (sent > 0) await finalizeCampaign(campaignId, sent)
  }

  return NextResponse.json({ sent: totalSent })
}
