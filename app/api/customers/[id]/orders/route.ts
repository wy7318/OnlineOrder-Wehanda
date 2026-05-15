import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') ?? '10')))
  const status  = searchParams.getAll('status[]')
  const type    = searchParams.getAll('type[]')
  const dateFrom = searchParams.get('date_from')
  const dateTo   = searchParams.get('date_to')

  const admin = createAdminClient()

  let query = admin
    .from('orders')
    .select('*, order_items(*, order_item_options(*))', { count: 'exact' })
    .eq('customer_id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .order('created_at', { ascending: false })

  if (status.length) query = query.in('status', status)
  if (type.length)   query = query.in('order_type', type)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo)   query = query.lte('created_at', dateTo)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, per_page: perPage })
}
