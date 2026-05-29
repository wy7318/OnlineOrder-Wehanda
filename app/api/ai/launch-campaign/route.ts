import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import {
  createCampaign, sendCampaignEmail, finalizeCampaign,
  alreadySentCampaign,
} from '@/lib/ai/campaigns'

const CUSTOMER_LOOKBACK_DAYS = 90
const MAX_SENDS = 200

export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { menu_item_id } = body ?? {}
  if (!menu_item_id) {
    return NextResponse.json({ error: 'menu_item_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const [itemRes, restaurantRes] = await Promise.all([
    admin
      .from('menu_items')
      .select('id, name, price, category_id, description')
      .eq('id', menu_item_id)
      .eq('restaurant_id', ctx.restaurantId)
      .single(),

    admin
      .from('restaurants')
      .select('name, slug')
      .eq('id', ctx.restaurantId)
      .single(),
  ])

  if (!itemRes.data) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const item = itemRes.data
  const restaurant = restaurantRes.data!

  // Find customers who ordered from the same category in last 90 days
  const since = new Date(Date.now() - CUSTOMER_LOOKBACK_DAYS * 86_400_000).toISOString()

  const { data: recentOrderItems } = await admin
    .from('order_items')
    .select('orders!inner(customer_id, restaurant_id, created_at, status)')
    .eq('category_id', item.category_id)
    .eq('orders.restaurant_id', ctx.restaurantId)
    .eq('orders.status', 'completed')
    .gte('orders.created_at', since)
    .limit(MAX_SENDS * 3)

  // Unique customer ids
  const customerIds = Array.from(
    new Set(
      (recentOrderItems ?? [])
        .map(oi => (oi.orders as unknown as { customer_id: string }).customer_id)
        .filter(Boolean),
    ),
  ).slice(0, MAX_SENDS * 2)

  if (!customerIds.length) return NextResponse.json({ sent: 0, reason: 'no_eligible_customers' })

  // Fetch customer details
  const { data: customers } = await admin
    .from('customers')
    .select('id, first_name, last_name, name, email, marketing_opt_in')
    .in('id', customerIds)
    .eq('restaurant_id', ctx.restaurantId)
    .eq('marketing_opt_in', true)
    .not('email', 'is', null)

  if (!customers?.length) return NextResponse.json({ sent: 0, reason: 'no_opted_in_customers' })

  const campaignId = await createCampaign({
    restaurantId: ctx.restaurantId,
    campaignType: 'new_item_launch',
    name: `New Item: ${item.name as string}`,
    metadata: { menu_item_id, item_name: item.name },
  })

  let sent = 0
  const errors: string[] = []

  for (const customer of customers.slice(0, MAX_SENDS)) {
    const alreadySent = await alreadySentCampaign({
      restaurantId: ctx.restaurantId,
      customerId: customer.id as string,
      campaignType: 'new_item_launch',
      withinDays: 30,
    })
    if (alreadySent) continue

    const customerName = customer.first_name
      ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
      : customer.name ?? 'there'

    try {
      await sendCampaignEmail({
        campaignId,
        restaurantId: ctx.restaurantId,
        customerId: customer.id as string,
        customerEmail: customer.email as string,
        restaurantName: restaurant.name as string,
        restaurantSlug: restaurant.slug as string,
        customerName,
        promptKey: 'newItemLaunch',
        promptContext: {
          restaurant: restaurant.name,
          customer: customerName,
          new_item: item.name,
          item_description: item.description ?? '',
        },
        ctaLabel: `Try ${item.name as string}`,
        highlight: {
          emoji: '✨',
          label: 'Just added to our menu',
          value: item.name as string,
          note: item.description ? String(item.description).slice(0, 60) : undefined,
          accentColor: '#0284c7',
          bgColor: '#f0f9ff',
        },
      })
      sent++
    } catch (err) {
      errors.push(String(err))
    }
  }

  await finalizeCampaign(campaignId, sent)

  return NextResponse.json({ sent, campaign_id: campaignId, errors: errors.slice(0, 5) })
}
