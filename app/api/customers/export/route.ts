import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

// In-memory rate limit: 1 export per minute per restaurant
const exportTimestamps = new Map<string, number>()

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = Date.now()
  const lastExport = exportTimestamps.get(ctx.restaurantId) ?? 0
  if (now - lastExport < 60_000) {
    return NextResponse.json({ error: 'Rate limit: 1 export per minute' }, { status: 429 })
  }
  exportTimestamps.set(ctx.restaurantId, now)

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const acqSrcs = searchParams.getAll('acquisition_source[]')
  const mktOpt  = searchParams.get('marketing_opt_in')

  const admin = createAdminClient()
  let query = admin
    .from('customers')
    .select('*')
    .eq('restaurant_id', ctx.restaurantId)
    .order('created_at', { ascending: false })

  if (q.trim()) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }
  if (acqSrcs.length) query = query.in('acquisition_source', acqSrcs)
  if (mktOpt === 'true')  query = query.eq('marketing_opt_in', true)
  if (mktOpt === 'false') query = query.eq('marketing_opt_in', false)

  const { data: customers, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch order stats
  const ids = (customers ?? []).map(c => c.id)
  const statsMap: Record<string, { total_orders: number; lifetime_value: number; last_order_at: string | null }> = {}

  if (ids.length > 0) {
    const { data: orders } = await admin
      .from('orders')
      .select('customer_id, total_amount, status, created_at')
      .in('customer_id', ids)

    for (const o of orders ?? []) {
      if (!statsMap[o.customer_id]) statsMap[o.customer_id] = { total_orders: 0, lifetime_value: 0, last_order_at: null }
      if (o.status === 'completed') {
        statsMap[o.customer_id].total_orders++
        statsMap[o.customer_id].lifetime_value += o.total_amount
      }
      if (!statsMap[o.customer_id].last_order_at || o.created_at > statsMap[o.customer_id].last_order_at!) {
        statsMap[o.customer_id].last_order_at = o.created_at
      }
    }
  }

  const headers = [
    'id', 'name', 'first_name', 'last_name', 'email', 'phone',
    'acquisition_source', 'marketing_opt_in', 'loyalty_points_balance',
    'tags', 'is_blocked', 'created_at',
    'total_orders', 'lifetime_value', 'last_order_at',
  ]

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = Array.isArray(v) ? v.join(';') : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const rows = (customers ?? []).map(c => {
    const s = statsMap[c.id] ?? { total_orders: 0, lifetime_value: 0, last_order_at: null }
    return headers.map(h => {
      if (h === 'total_orders')   return escape(s.total_orders)
      if (h === 'lifetime_value') return escape(s.lifetime_value.toFixed(2))
      if (h === 'last_order_at')  return escape(s.last_order_at)
      return escape((c as Record<string, unknown>)[h])
    }).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
