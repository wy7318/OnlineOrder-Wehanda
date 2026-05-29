import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { haikuJSON, PROMPTS } from '@/lib/ai/haiku'

const MIN_VIEWS = 5       // ignore items with fewer views
const WINDOW_DAYS = 90

interface HaikuTip { id: string; tip: string }

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  // Fetch views and orders in parallel
  const [viewsRes, ordersRes, itemsRes] = await Promise.all([
    admin
      .from('customer_events')
      .select('source_id')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('event_type', 'item_viewed')
      .gte('recorded_at', since),

    admin
      .from('order_items')
      .select('menu_item_id, quantity')
      .eq('restaurant_id', ctx.restaurantId)
      .gte('created_at', since)
      .not('menu_item_id', 'is', null),

    admin
      .from('menu_items')
      .select('id, name, price, description')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('is_available', true),
  ])

  const views = viewsRes.data ?? []
  const orders = ordersRes.data ?? []
  const menuItems = itemsRes.data ?? []

  // Aggregate
  const viewMap = new Map<string, number>()
  for (const e of views) {
    if (e.source_id) viewMap.set(e.source_id, (viewMap.get(e.source_id) ?? 0) + 1)
  }

  const orderMap = new Map<string, number>()
  for (const oi of orders) {
    if (oi.menu_item_id) {
      orderMap.set(oi.menu_item_id, (orderMap.get(oi.menu_item_id) ?? 0) + (oi.quantity ?? 1))
    }
  }

  // Build performance table — only items with enough views
  const itemById = new Map(menuItems.map(i => [i.id, i]))
  const performance = Array.from(viewMap.entries())
    .filter(([, v]) => v >= MIN_VIEWS)
    .map(([id, view_count]) => {
      const item = itemById.get(id)
      if (!item) return null
      const order_count = orderMap.get(id) ?? 0
      const conversion_rate = Math.round((order_count / view_count) * 1000) / 10
      return { id, name: item.name, price: Number(item.price), description: item.description ?? '', view_count, order_count, conversion_rate }
    })
    .filter(Boolean)
    .sort((a, b) => a!.conversion_rate - b!.conversion_rate) // worst performers first
    .slice(0, 6) as { id: string; name: string; price: number; description: string; view_count: number; order_count: number; conversion_rate: number }[]

  if (performance.length === 0) {
    return NextResponse.json({ items: [], has_data: false })
  }

  // Single Haiku call for all items at once
  let tips: HaikuTip[] = []
  try {
    const userContent = JSON.stringify(
      performance.map(({ id, name, price, description, view_count, order_count, conversion_rate }) => ({
        id, name, price, description: description.slice(0, 120), view_count, order_count, conversion_rate,
      })),
    )
    tips = await haikuJSON<HaikuTip[]>(PROMPTS.menuInsights, userContent, 800)
  } catch {
    // AI failed — return data without tips
    tips = []
  }

  const tipMap = new Map(tips.map(t => [t.id, t.tip]))

  const items = performance.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    view_count: item.view_count,
    order_count: item.order_count,
    conversion_rate: item.conversion_rate,
    ai_tip: tipMap.get(item.id) ?? null,
  }))

  return NextResponse.json({ items, has_data: true, window_days: WINDOW_DAYS })
}
