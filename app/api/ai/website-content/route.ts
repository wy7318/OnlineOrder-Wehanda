import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { haikuJSON, PROMPTS } from '@/lib/ai/haiku'
import { getNearbyCompetitors } from '@/lib/utils/places'

interface WebsiteContentResult {
  hero_headline: string
  hero_subheadline: string
  about_title: string
  about_body: string
  seo_meta_description: string
  seo_keywords: string
}

const WINDOW_DAYS = 90

export async function POST() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Check Revenue Boost license
  const { data: license } = await admin
    .from('restaurant_licenses')
    .select('feature_revenue_boost')
    .eq('restaurant_id', ctx.restaurantId)
    .maybeSingle()

  if (!license?.feature_revenue_boost) {
    return NextResponse.json({ error: 'Revenue Boost required' }, { status: 403 })
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  // All DB queries in parallel — license already fetched above
  const [restaurantRes, menuRes, topItemsRes, ordersRes, totalCustomersRes, repeatCustomersRes] =
    await Promise.all([
      admin
        .from('restaurants')
        .select('name, description, address, cuisine_types')
        .eq('id', ctx.restaurantId)
        .single(),

      // Full menu (name + description for copy, price for context)
      admin
        .from('menu_items')
        .select('name, description, price')
        .eq('restaurant_id', ctx.restaurantId)
        .eq('is_available', true)
        .order('display_order')
        .limit(12),

      // Top ordered items last 90 days
      admin
        .from('order_items')
        .select('item_name_snapshot, quantity')
        .eq('restaurant_id', ctx.restaurantId)
        .gte('created_at', since),

      // Orders for avg order value
      admin
        .from('orders')
        .select('subtotal')
        .eq('restaurant_id', ctx.restaurantId)
        .gte('created_at', since)
        .neq('status', 'cancelled'),

      // Total customer count
      admin
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', ctx.restaurantId),

      // Repeat customers (2+ orders)
      admin
        .from('orders')
        .select('customer_id')
        .eq('restaurant_id', ctx.restaurantId)
        .not('customer_id', 'is', null)
        .neq('status', 'cancelled'),
    ])

  if (restaurantRes.error || !restaurantRes.data) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  const r = restaurantRes.data
  const cuisineTypes = (r.cuisine_types as string[] | null) ?? []

  // ── Customer insights ─────────────────────────────────────────────────────

  const totalCustomers = totalCustomersRes.count ?? 0

  // Compute repeat rate: customers who appear more than once in orders
  const customerOrderCounts = new Map<string, number>()
  for (const o of (repeatCustomersRes.data ?? [])) {
    if (o.customer_id) {
      customerOrderCounts.set(o.customer_id, (customerOrderCounts.get(o.customer_id) ?? 0) + 1)
    }
  }
  const repeatCustomers = [...customerOrderCounts.values()].filter(c => c >= 2).length
  const uniqueOrderCustomers = customerOrderCounts.size
  const repeatRate = uniqueOrderCustomers > 0
    ? Math.round((repeatCustomers / uniqueOrderCustomers) * 100)
    : 0

  // Avg order value
  const orders = ordersRes.data ?? []
  const avgOrderValue = orders.length > 0
    ? Math.round(orders.reduce((sum, o) => sum + Number(o.subtotal), 0) / orders.length * 100) / 100
    : 0

  // Top 5 most ordered items
  const itemTotals = new Map<string, number>()
  for (const oi of (topItemsRes.data ?? [])) {
    const name = oi.item_name_snapshot
    itemTotals.set(name, (itemTotals.get(name) ?? 0) + (oi.quantity ?? 1))
  }
  const topItems = [...itemTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  // ── Menu ─────────────────────────────────────────────────────────────────

  const menu = (menuRes.data ?? []).map(item => ({
    name: item.name,
    desc: (item.description ?? '').slice(0, 80),
    price: Number(item.price),
  }))

  // ── Nearby competitors (Google Places — skipped if no API key) ────────────

  const competitors = await getNearbyCompetitors(r.address ?? '', cuisineTypes)

  // ── Build AI payload ──────────────────────────────────────────────────────

  const userContent = JSON.stringify({
    restaurant_name: r.name,
    description: r.description ?? '',
    address: r.address ?? '',
    cuisine_types: cuisineTypes,
    menu_items: menu,
    top_ordered_items: topItems,
    customer_insights: {
      total_customers: totalCustomers,
      repeat_rate_pct: repeatRate,
      avg_order_value: avgOrderValue,
    },
    nearby_competitors: competitors.map(c => ({
      name: c.name,
      rating: c.rating,
      reviews: c.review_count,
    })),
  })

  const result = await haikuJSON<WebsiteContentResult>(
    PROMPTS.websiteContent,
    userContent,
    650,
  )

  return NextResponse.json(result)
}
