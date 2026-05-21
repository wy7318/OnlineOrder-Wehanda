import { NextResponse } from 'next/server'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { startOfToday } from '@/lib/utils/timezone'

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, timezone')
    .eq('id', ctx.restaurantId)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const tz = restaurant.timezone ?? 'America/New_York'
  const todayStart = startOfToday(tz)

  const { data, error } = await admin
    .from('orders')
    .select('id, order_number, order_type, status, total_amount, created_at, order_items(id)')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['new', 'accepted', 'preparing', 'ready'])
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const queue = (data ?? []).map(o => ({
    id: o.id,
    order_number: o.order_number,
    order_type: o.order_type,
    status: o.status,
    total_amount: o.total_amount,
    created_at: o.created_at,
    item_count: Array.isArray(o.order_items) ? o.order_items.length : 0,
  }))

  return NextResponse.json(queue)
}
