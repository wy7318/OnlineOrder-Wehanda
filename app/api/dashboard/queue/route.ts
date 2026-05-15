import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

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
