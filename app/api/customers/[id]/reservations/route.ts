import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Fetch customer's phone to match reservations
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('phone')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  if (custErr || !customer?.phone) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { data, error, count } = await admin
    .from('reservations')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', ctx.restaurantId)
    .eq('customer_phone', customer.phone)
    .order('reservation_date', { ascending: false })
    .order('reservation_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}
