import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

const SOURCE_LABELS: Record<string, string> = {
  organic:      'Organic',
  google_ad:    'Google Ads',
  instagram_ad: 'Instagram',
  facebook_ad:  'Facebook',
  referral:     'Referral',
  qr_code:      'QR Code',
  walk_in:      'Walk-in',
  loyalty_signup:'Loyalty Signup',
  other:        'Other',
}

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(365, Math.max(30, parseInt(searchParams.get('days') ?? '180')))
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const admin = createAdminClient()

  // Fetch customers with their acquisition source
  const { data: customers, error: custErr } = await admin
    .from('customers')
    .select('id, acquisition_source, loyalty_points_balance, created_at')
    .eq('restaurant_id', ctx.restaurantId)
    .not('acquisition_source', 'is', null)

  if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 })

  if (!customers?.length) {
    return NextResponse.json({ period_days: days, channels: [] })
  }

  const customerIds = customers.map(c => c.id)

  // Fetch completed orders for these customers within the period
  const { data: orders, error: ordErr } = await admin
    .from('orders')
    .select('customer_id, total_amount, created_at')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('status', 'completed')
    .in('customer_id', customerIds)
    .gte('created_at', since)

  if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 })

  // Aggregate orders per customer
  const orderMap = new Map<string, { count: number; total: number }>()
  for (const o of orders ?? []) {
    if (!o.customer_id) continue
    const s = orderMap.get(o.customer_id) ?? { count: 0, total: 0 }
    s.count++
    s.total += Number(o.total_amount)
    orderMap.set(o.customer_id, s)
  }

  // Aggregate by acquisition source
  const channelMap = new Map<string, {
    customer_count: number
    ordering_customers: number
    total_orders: number
    total_revenue: number
    total_loyalty_balance: number
  }>()

  for (const c of customers) {
    const src = c.acquisition_source ?? 'other'
    const ch = channelMap.get(src) ?? {
      customer_count: 0, ordering_customers: 0,
      total_orders: 0, total_revenue: 0, total_loyalty_balance: 0,
    }
    ch.customer_count++
    ch.total_loyalty_balance += c.loyalty_points_balance ?? 0

    const ord = orderMap.get(c.id)
    if (ord) {
      ch.ordering_customers++
      ch.total_orders += ord.count
      ch.total_revenue += ord.total
    }
    channelMap.set(src, ch)
  }

  const channels = Array.from(channelMap.entries())
    .map(([source, d]) => ({
      source,
      label: SOURCE_LABELS[source] ?? source,
      customer_count: d.customer_count,
      ordering_customers: d.ordering_customers,
      order_conversion_rate: d.customer_count > 0
        ? Math.round((d.ordering_customers / d.customer_count) * 1000) / 10
        : 0,
      total_orders: d.total_orders,
      total_revenue: Math.round(d.total_revenue * 100) / 100,
      avg_orders_per_customer: d.customer_count > 0
        ? Math.round((d.total_orders / d.customer_count) * 10) / 10
        : 0,
      avg_ltv: d.customer_count > 0
        ? Math.round((d.total_revenue / d.customer_count) * 100) / 100
        : 0,
      avg_order_value: d.total_orders > 0
        ? Math.round((d.total_revenue / d.total_orders) * 100) / 100
        : 0,
    }))
    .sort((a, b) => b.avg_ltv - a.avg_ltv)

  return NextResponse.json({ period_days: days, channels })
}
