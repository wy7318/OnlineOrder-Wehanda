import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import {
  createCampaign, sendCampaignEmail, finalizeCampaign,
  alreadySentToCampaign,
} from '@/lib/ai/campaigns'
import { haikuJSON, PROMPTS } from '@/lib/ai/haiku'

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

  // Step 1: get all menu item IDs in the same category
  const { data: siblingItems } = await admin
    .from('menu_items')
    .select('id')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('category_id', item.category_id)

  const siblingIds = (siblingItems ?? []).map(i => i.id as string)

  const since = new Date(Date.now() - CUSTOMER_LOOKBACK_DAYS * 86_400_000).toISOString()

  // Step 2: find orders that contain items from that category
  let customerIds: string[] = []

  if (siblingIds.length > 0) {
    const { data: matchingOrderItems } = await admin
      .from('order_items')
      .select('order_id')
      .in('menu_item_id', siblingIds)
      .limit(MAX_SENDS * 5)

    if (matchingOrderItems?.length) {
      const orderIds = [...new Set(matchingOrderItems.map(oi => oi.order_id as string))]

      // Step 3: filter to completed orders in the lookback window for this restaurant
      const { data: matchingOrders } = await admin
        .from('orders')
        .select('customer_id')
        .eq('restaurant_id', ctx.restaurantId)
        .eq('status', 'completed')
        .gte('created_at', since)
        .in('id', orderIds)
        .not('customer_id', 'is', null)

      customerIds = [
        ...new Set((matchingOrders ?? []).map(o => o.customer_id as string)),
      ].slice(0, MAX_SENDS * 2)
    }
  }

  // Fallback: if no category match found, target all recent customers (broad launch)
  if (!customerIds.length) {
    const { data: recentOrders } = await admin
      .from('orders')
      .select('customer_id')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('status', 'completed')
      .gte('created_at', since)
      .not('customer_id', 'is', null)
      .limit(MAX_SENDS * 2)

    customerIds = [...new Set((recentOrders ?? []).map(o => o.customer_id as string))]
  }

  if (!customerIds.length) {
    return NextResponse.json({ sent: 0, reason: 'no_eligible_customers' })
  }

  // Step 4: fetch opted-in customers with emails
  const { data: customers } = await admin
    .from('customers')
    .select('id, first_name, last_name, name, email, marketing_opt_in')
    .in('id', customerIds)
    .eq('restaurant_id', ctx.restaurantId)
    .eq('marketing_opt_in', true)
    .not('email', 'is', null)

  if (!customers?.length) {
    return NextResponse.json({ sent: 0, reason: 'no_opted_in_customers' })
  }

  const campaignId = await createCampaign({
    restaurantId: ctx.restaurantId,
    campaignType: 'new_item_launch',
    name: `New Item: ${item.name as string}`,
    metadata: { menu_item_id, item_name: item.name },
  })

  // Generate one AI template for this item — reused for all recipients
  const emailTemplate = await haikuJSON<{ subject: string; body: string }>(
    PROMPTS.newItemLaunch,
    JSON.stringify({
      restaurant: restaurant.name,
      new_item: item.name,
      item_description: item.description ?? '',
    }),
  )

  const highlight = {
    emoji: '✨',
    label: 'Just added to our menu',
    value: item.name as string,
    note: item.description ? String(item.description).slice(0, 60) : undefined,
    accentColor: '#0284c7',
    bgColor: '#f0f9ff',
  }

  let sent = 0
  const errors: string[] = []

  for (const customer of customers.slice(0, MAX_SENDS)) {
    // Dedup per-item: prevent resending the same item announcement to the same customer
    const alreadySent = await alreadySentToCampaign(campaignId, customer.id as string)
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
        promptContext: {},
        ctaLabel: `Try ${item.name as string}`,
        highlight,
        preGeneratedContent: emailTemplate,
      })
      sent++
    } catch (err) {
      errors.push(String(err))
    }
  }

  await finalizeCampaign(campaignId, sent)

  return NextResponse.json({ sent, campaign_id: campaignId, errors: errors.slice(0, 5) })
}
