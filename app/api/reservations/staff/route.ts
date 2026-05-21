import { NextResponse } from 'next/server'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurantId } = ctx

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    customer_name, customer_phone, customer_email,
    party_size, reservation_date, reservation_time,
    notes, status = 'confirmed',
  } = body as {
    customer_name?: string; customer_phone?: string; customer_email?: string
    party_size?: number; reservation_date?: string; reservation_time?: string
    notes?: string; status?: string
  }

  if (!customer_name?.trim() || !customer_phone?.trim() || !party_size || !reservation_date || !reservation_time) {
    return NextResponse.json({ error: 'Name, phone, party size, date and time are required' }, { status: 400 })
  }

  const finalStatus = ['pending', 'confirmed'].includes(status as string) ? status : 'confirmed'

  const supabase = createAdminClient()

  // Check capacity and fetch restaurant config in parallel
  const [{ data: restaurant }, { data: existing }] = await Promise.all([
    supabase.from('restaurants').select('reservation_capacity, reservation_max_party_size').eq('id', restaurantId).single(),
    supabase.from('reservations').select('party_size')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', reservation_date)
      .eq('reservation_time', reservation_time)
      .in('status', ['pending', 'confirmed']),
  ])

  const capacity = restaurant?.reservation_capacity ?? 20
  const occupied = (existing ?? []).reduce((sum: number, r: { party_size: number }) => sum + r.party_size, 0)
  if (occupied + Number(party_size) > capacity) {
    return NextResponse.json(
      { error: `Time slot is at capacity (${occupied}/${capacity} seats taken)` },
      { status: 409 }
    )
  }

  // Upsert CRM customer record (match by phone within restaurant)
  const { data: customer } = await supabase
    .from('customers')
    .upsert(
      { restaurant_id: restaurantId, name: customer_name.trim(), phone: customer_phone.trim(), email: customer_email?.trim() || null },
      { onConflict: 'restaurant_id,phone' }
    )
    .select('id')
    .single()

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      restaurant_id: restaurantId,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: customer_email?.trim() || null,
      party_size: Number(party_size),
      reservation_date,
      reservation_time,
      notes: notes?.trim() || null,
      status: finalStatus,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Emit customer event — fire-and-forget
  if (customer?.id) {
    supabase.from('customer_events').insert({
      customer_id: customer.id,
      restaurant_id: restaurantId,
      event_type: 'reservation_made',
      event_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      source_id: data.id,
      device_type: 'desktop_web',
      metadata: { reservation_id: data.id, party_size, reservation_date, reservation_time, channel: 'staff' },
    }).then()
  }

  return NextResponse.json(data, { status: 201 })
}
