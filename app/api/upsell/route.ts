import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface UpsellItem {
  id: string
  name: string
  price: number
  image_url: string | null
  has_required_options: boolean
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const itemIdsParam = searchParams.get('item_ids') ?? ''

  if (!restaurantId) return NextResponse.json([])

  const cartItemIds = itemIdsParam.split(',').filter(Boolean)
  if (cartItemIds.length === 0) return NextResponse.json([])

  const supabase = createAdminClient()
  let suggestedIds: string[] = []

  // ── Step 1: look up co-occurrence pairs ───────────────────────
  const { data: pairs } = await supabase
    .from('upsell_pairs')
    .select('suggested_item_id, confidence')
    .eq('restaurant_id', restaurantId)
    .in('item_id', cartItemIds)

  if (pairs && pairs.length > 0) {
    // Sum confidence across all trigger items; exclude items already in cart
    const scoreMap: Record<string, number> = {}
    for (const p of pairs) {
      if (!cartItemIds.includes(p.suggested_item_id)) {
        scoreMap[p.suggested_item_id] = (scoreMap[p.suggested_item_id] ?? 0) + Number(p.confidence)
      }
    }
    suggestedIds = Object.entries(scoreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id)
  }

  // ── Step 2: fallback — top sellers last 30 days ───────────────
  if (suggestedIds.length === 0) {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data: recentItems } = await supabase
      .from('order_items')
      .select('menu_item_id')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', cutoff)
      .not('menu_item_id', 'is', null)
      .limit(500)

    const countMap: Record<string, number> = {}
    for (const row of recentItems ?? []) {
      if (!cartItemIds.includes(row.menu_item_id)) {
        countMap[row.menu_item_id] = (countMap[row.menu_item_id] ?? 0) + 1
      }
    }
    suggestedIds = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id)
  }

  if (suggestedIds.length === 0) return NextResponse.json([])

  // ── Step 3: fetch item details + detect required options ───────
  const [{ data: menuItems }, { data: requiredGroups }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, price, image_url')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .in('id', suggestedIds),
    supabase
      .from('option_groups')
      .select('menu_item_id')
      .eq('restaurant_id', restaurantId)
      .eq('is_required', true)
      .in('menu_item_id', suggestedIds),
  ])

  const requiredSet = new Set((requiredGroups ?? []).map(g => g.menu_item_id))

  const result: UpsellItem[] = (menuItems ?? [])
    .slice(0, 3)
    .map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      has_required_options: requiredSet.has(item.id),
    }))

  return NextResponse.json(result)
}
