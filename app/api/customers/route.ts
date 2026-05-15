import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage  = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '25')))
  const q        = searchParams.get('q') ?? ''
  const sort     = searchParams.get('sort') ?? 'created_at'
  const sortDir  = searchParams.get('order') === 'asc'
  const acqSrcs  = searchParams.getAll('acquisition_source[]')
  const mktOpt   = searchParams.get('marketing_opt_in')
  const minOrds  = searchParams.get('min_orders')
  const maxOrds  = searchParams.get('max_orders')
  const lastFrom = searchParams.get('last_order_from')
  const lastTo   = searchParams.get('last_order_to')

  const admin = createAdminClient()

  // Base customer query
  let query = admin
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', ctx.restaurantId)

  if (q.trim()) {
    query = query.or(
      `name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
    )
  }

  if (acqSrcs.length) query = query.in('acquisition_source', acqSrcs)
  if (mktOpt === 'true')  query = query.eq('marketing_opt_in', true)
  if (mktOpt === 'false') query = query.eq('marketing_opt_in', false)

  // Sort by native columns server-side; computed sorts handled below
  const nativeSortFields = ['created_at', 'last_seen_at', 'name', 'email', 'loyalty_points_balance']
  if (nativeSortFields.includes(sort)) {
    query = query.order(sort, { ascending: sortDir })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data: customers, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute order stats for this page of customers
  const ids = (customers ?? []).map(c => c.id)
  let enriched: unknown[] = customers ?? []

  if (ids.length > 0) {
    const { data: orderRows } = await admin
      .from('orders')
      .select('customer_id, total_amount, status, created_at')
      .in('customer_id', ids)

    type Stats = { total_orders: number; lifetime_value: number; last_order_at: string | null; first_order_at: string | null }
    const statsMap: Record<string, Stats> = {}

    for (const o of orderRows ?? []) {
      if (!statsMap[o.customer_id]) {
        statsMap[o.customer_id] = { total_orders: 0, lifetime_value: 0, last_order_at: null, first_order_at: null }
      }
      const s = statsMap[o.customer_id]
      if (o.status !== 'cancelled') {
        s.total_orders++
        s.lifetime_value += o.total_amount
      }
      if (!s.last_order_at || o.created_at > s.last_order_at) s.last_order_at = o.created_at
      if (!s.first_order_at || o.created_at < s.first_order_at) s.first_order_at = o.created_at
    }

    enriched = (customers ?? []).map(c => ({
      ...c,
      total_orders:    statsMap[c.id]?.total_orders    ?? 0,
      lifetime_value:  statsMap[c.id]?.lifetime_value  ?? 0,
      avg_order_value: statsMap[c.id]?.total_orders
        ? (statsMap[c.id].lifetime_value / statsMap[c.id].total_orders) : 0,
      last_order_at:   statsMap[c.id]?.last_order_at   ?? null,
      first_order_at:  statsMap[c.id]?.first_order_at  ?? null,
    }))

    // Apply computed-field filters in memory
    if (minOrds)  enriched = enriched.filter((c: unknown) => (c as { total_orders: number }).total_orders >= parseInt(minOrds))
    if (maxOrds)  enriched = enriched.filter((c: unknown) => (c as { total_orders: number }).total_orders <= parseInt(maxOrds))
    if (lastFrom) enriched = enriched.filter((c: unknown) => {
      const lo = (c as { last_order_at: string | null }).last_order_at
      return lo && lo >= lastFrom
    })
    if (lastTo) enriched = enriched.filter((c: unknown) => {
      const lo = (c as { last_order_at: string | null }).last_order_at
      return lo && lo <= lastTo
    })

    // Sort by computed fields in memory
    if (!nativeSortFields.includes(sort)) {
      const key = sort as 'total_orders' | 'lifetime_value' | 'avg_order_value' | 'last_order_at'
      enriched = [...enriched].sort((a, b) => {
        const av = (a as Record<string, unknown>)[key] ?? 0
        const bv = (b as Record<string, unknown>)[key] ?? 0
        return sortDir
          ? (av as number) < (bv as number) ? -1 : 1
          : (av as number) > (bv as number) ? -1 : 1
      })
    }
  }

  return NextResponse.json({ data: enriched, total: count ?? 0, page, per_page: perPage })
}
