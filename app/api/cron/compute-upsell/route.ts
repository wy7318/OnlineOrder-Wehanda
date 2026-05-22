import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

const MIN_CO_OCCURRENCE = 2  // pairs below this threshold are too noisy

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const singleRestaurantId = searchParams.get('restaurant_id')

  const supabase = createAdminClient()

  let restaurantQuery = supabase.from('restaurants').select('id').eq('is_active', true)
  if (singleRestaurantId) restaurantQuery = restaurantQuery.eq('id', singleRestaurantId)
  const { data: restaurants } = await restaurantQuery

  // Look back 90 days for co-occurrence signal
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  const results: Array<{ restaurantId: string; pairs: number; status: string }> = []

  for (const restaurant of restaurants ?? []) {
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('order_id, menu_item_id')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', cutoff)
        .not('menu_item_id', 'is', null)
        .limit(10000)

      if (!orderItems || orderItems.length === 0) {
        results.push({ restaurantId: restaurant.id, pairs: 0, status: 'no_data' })
        continue
      }

      // Group unique item IDs per order
      const orderMap = new Map<string, Set<string>>()
      for (const row of orderItems) {
        if (!orderMap.has(row.order_id)) orderMap.set(row.order_id, new Set())
        orderMap.get(row.order_id)!.add(row.menu_item_id)
      }

      // Count co-occurrences and per-item order totals
      const coOccurrence = new Map<string, Map<string, number>>()
      const itemOrderCount = new Map<string, number>()

      for (const itemIds of orderMap.values()) {
        const ids = [...itemIds]
        for (const id of ids) {
          itemOrderCount.set(id, (itemOrderCount.get(id) ?? 0) + 1)
        }
        for (let i = 0; i < ids.length; i++) {
          for (let j = 0; j < ids.length; j++) {
            if (i === j) continue
            const a = ids[i], b = ids[j]
            if (!coOccurrence.has(a)) coOccurrence.set(a, new Map())
            const inner = coOccurrence.get(a)!
            inner.set(b, (inner.get(b) ?? 0) + 1)
          }
        }
      }

      // Build rows above threshold
      const now = new Date().toISOString()
      const rows: Array<{
        restaurant_id: string
        item_id: string
        suggested_item_id: string
        co_occurrence_count: number
        confidence: number
        last_computed_at: string
      }> = []

      for (const [itemId, suggestions] of coOccurrence.entries()) {
        const totalOrders = itemOrderCount.get(itemId) ?? 1
        for (const [suggestedId, count] of suggestions.entries()) {
          if (count >= MIN_CO_OCCURRENCE) {
            rows.push({
              restaurant_id: restaurant.id,
              item_id: itemId,
              suggested_item_id: suggestedId,
              co_occurrence_count: count,
              confidence: Math.round((count / totalOrders) * 10000) / 10000,
              last_computed_at: now,
            })
          }
        }
      }

      // Replace stale data for this restaurant
      await supabase.from('upsell_pairs').delete().eq('restaurant_id', restaurant.id)

      if (rows.length > 0) {
        // Batch insert to stay within payload limits
        for (let i = 0; i < rows.length; i += 500) {
          await supabase.from('upsell_pairs').insert(rows.slice(i, i + 500))
        }
      }

      results.push({ restaurantId: restaurant.id, pairs: rows.length, status: 'ok' })
    } catch (err) {
      console.error(`[compute-upsell] error for ${restaurant.id}:`, err)
      results.push({ restaurantId: restaurant.id, pairs: 0, status: 'error' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
