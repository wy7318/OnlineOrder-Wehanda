import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: customer, error } = await admin
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  if (error || !customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Fetch related data in parallel
  const [
    { data: segments },
    { data: dietaryFlags },
    { data: addresses },
    { data: orderStats },
  ] = await Promise.all([
    admin
      .from('customer_segment_members')
      .select('segment_id, added_at, added_by, customer_segments(id, name, color, description)')
      .eq('customer_id', id)
      .eq('restaurant_id', ctx.restaurantId),
    admin
      .from('customer_dietary_flags')
      .select('*')
      .eq('customer_id', id),
    admin
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', id)
      .order('is_default', { ascending: false }),
    admin
      .from('orders')
      .select('total_amount, status, created_at')
      .eq('customer_id', id),
  ])

  const completed = (orderStats ?? []).filter(o => o.status !== 'cancelled')
  const total_orders   = completed.length
  const lifetime_value = completed.reduce((sum, o) => sum + o.total_amount, 0)
  const avg_order_value = total_orders > 0 ? lifetime_value / total_orders : 0
  const dates = (orderStats ?? []).map(o => o.created_at).sort()
  const last_order_at  = dates.at(-1) ?? null
  const first_order_at = dates.at(0)  ?? null
  const days_since_last = last_order_at
    ? Math.floor((Date.now() - new Date(last_order_at).getTime()) / 86_400_000)
    : null

  return NextResponse.json({
    customer,
    segments: (segments ?? []).map(m => {
      const seg = Array.isArray(m.customer_segments) ? m.customer_segments[0] : m.customer_segments
      return { ...(seg as Record<string, unknown> | null ?? {}), added_at: m.added_at, added_by: m.added_by }
    }),
    dietary_flags: dietaryFlags ?? [],
    addresses: addresses ?? [],
    stats: { total_orders, lifetime_value, avg_order_value, last_order_at, first_order_at, days_since_last },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Whitelist: only these fields may be patched
  const allowed = ['first_name', 'last_name', 'phone', 'notes', 'preferred_contact_method', 'marketing_opt_in', 'birthday', 'anniversary', 'loyalty_points_balance']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      update[key] = body[key]
      if (key === 'marketing_opt_in' && body[key] === true) {
        update['marketing_opt_in_at'] = new Date().toISOString()
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customers')
    .update(update)
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
