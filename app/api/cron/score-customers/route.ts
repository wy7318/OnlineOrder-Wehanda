import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

// ── Scoring helpers ───────────────────────────────────────────────────────────

interface OrderStats {
  count: number
  total_spend: number
  first_order_at: string
  last_order_at: string
}

function churnRiskScore(stats: OrderStats | null, now: number): number {
  if (!stats || stats.count === 0) return 0.5

  const daysSinceLast = (now - new Date(stats.last_order_at).getTime()) / 86_400_000

  // Average gap between orders, clamped to a sensible range
  let avgGap = 30
  if (stats.count >= 2) {
    const spanDays = (new Date(stats.last_order_at).getTime() - new Date(stats.first_order_at).getTime()) / 86_400_000
    avgGap = Math.min(180, Math.max(7, spanDays / (stats.count - 1)))
  }

  // How many "expected gaps" overdue is the customer?
  const ratio = Math.min(3, daysSinceLast / avgGap)

  if (ratio <= 0.5)  return Math.round(ratio * 0.2 * 100) / 100            // 0.00 – 0.10
  if (ratio <= 1.0)  return Math.round((0.10 + (ratio - 0.5) * 0.5) * 100) / 100   // 0.10 – 0.35
  if (ratio <= 2.0)  return Math.round((0.35 + (ratio - 1.0) * 0.35) * 100) / 100  // 0.35 – 0.70
  return Math.round((0.70 + (ratio - 2.0) * 0.30) * 100) / 100                      // 0.70 – 1.00
}

function ltvPredicted90d(stats: OrderStats | null, now: number): number {
  if (!stats || stats.count === 0) return 0

  const avgOrderValue = stats.total_spend / stats.count

  if (stats.count === 1) return Math.round(avgOrderValue * 0.5 * 100) / 100

  const ageInDays = Math.max(1, (now - new Date(stats.first_order_at).getTime()) / 86_400_000)
  const ordersPerDay = stats.count / ageInDays
  const predicted = ordersPerDay * 90

  // Cap at 5 orders/month × 3 months to avoid absurd extrapolation for dense clusters
  const cap = avgOrderValue * 15
  return Math.round(Math.min(predicted * avgOrderValue, cap) * 100) / 100
}

function segmentLabel(stats: OrderStats | null, now: number): string {
  if (!stats || stats.count === 0) return 'new_customer'

  const R = (now - new Date(stats.last_order_at).getTime()) / 86_400_000
  const F = stats.count

  if (F >= 4 && R <= 14)  return 'champion'
  if (F >= 6 && R <= 60)  return 'loyal'
  if (F >= 3 && R <= 30)  return 'promising'
  if (F === 1 && R <= 30) return 'new_customer'
  if (F >= 3 && R <= 60)  return 'needs_attention'
  if (F >= 2 && R <= 120) return 'at_risk'
  if (F >= 2 && R <= 180) return 'hibernating'
  if (R > 180)            return 'lost'
  return 'one_time'
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const singleRestaurantId = searchParams.get('restaurant_id')

  const supabase = createAdminClient()
  const now = Date.now()

  let restaurantQuery = supabase.from('restaurants').select('id').eq('is_active', true)
  if (singleRestaurantId) restaurantQuery = restaurantQuery.eq('id', singleRestaurantId)
  const { data: restaurants } = await restaurantQuery

  const results: Array<{ restaurantId: string; scored: number; status: string }> = []

  for (const restaurant of restaurants ?? []) {
    try {
      // Fetch all completed orders for this restaurant in one query
      // Limit to 2 years of history — older data skews frequency calculations
      const since = new Date(now - 730 * 86_400_000).toISOString()
      const { data: orders, error: ordErr } = await supabase
        .from('orders')
        .select('customer_id, total_amount, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'completed')
        .not('customer_id', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: true })

      if (ordErr) throw ordErr

      // Aggregate order stats per customer in memory
      const statsMap = new Map<string, OrderStats>()
      for (const o of orders ?? []) {
        if (!o.customer_id) continue
        const s = statsMap.get(o.customer_id)
        if (!s) {
          statsMap.set(o.customer_id, {
            count: 1,
            total_spend: Number(o.total_amount),
            first_order_at: o.created_at,
            last_order_at: o.created_at,
          })
        } else {
          s.count++
          s.total_spend += Number(o.total_amount)
          if (o.created_at > s.last_order_at) s.last_order_at = o.created_at
          // first_order_at already set to earliest since query is ASC
        }
      }

      // Fetch all customers for this restaurant
      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('is_blocked', false)

      if (custErr) throw custErr

      // Build updates in batches of 200
      const BATCH = 200
      const allCustomers = customers ?? []
      let scored = 0

      for (let i = 0; i < allCustomers.length; i += BATCH) {
        const batch = allCustomers.slice(i, i + BATCH)
        const updates = batch.map(c => {
          const stats = statsMap.get(c.id) ?? null
          return {
            id: c.id,
            churn_risk_score: churnRiskScore(stats, now),
            ltv_predicted_90d: ltvPredicted90d(stats, now),
            segment_ai_label: segmentLabel(stats, now),
            last_ai_scored_at: new Date(now).toISOString(),
          }
        })

        const { error: upErr } = await supabase
          .from('customers')
          .upsert(updates, { onConflict: 'id' })

        if (upErr) throw upErr
        scored += batch.length
      }

      results.push({ restaurantId: restaurant.id, scored, status: 'ok' })
    } catch (err) {
      results.push({ restaurantId: restaurant.id, scored: 0, status: String(err) })
    }
  }

  return NextResponse.json({ results })
}
