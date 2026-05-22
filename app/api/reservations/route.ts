import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const date = searchParams.get('date')

  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const supabase = createAdminClient()
  let query = supabase
    .from('reservations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  if (date) query = query.eq('reservation_date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      restaurant_id, customer_name, customer_phone, customer_email,
      party_size, reservation_date, reservation_time, notes, customer_user_id,
    } = body

    if (!restaurant_id || !customer_name || !customer_phone || !party_size || !reservation_date || !reservation_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, is_active, reservations_enabled, reservation_capacity, reservation_max_party_size')
      .eq('id', restaurant_id)
      .single()

    if (!restaurant || !restaurant.is_active || !restaurant.reservations_enabled) {
      return NextResponse.json({ error: 'Reservations are not available for this restaurant' }, { status: 403 })
    }

    if (party_size > (restaurant.reservation_max_party_size ?? 10)) {
      return NextResponse.json({ error: `Maximum party size is ${restaurant.reservation_max_party_size}` }, { status: 400 })
    }

    // Check slot capacity
    const { data: existing } = await supabase
      .from('reservations')
      .select('party_size')
      .eq('restaurant_id', restaurant_id)
      .eq('reservation_date', reservation_date)
      .eq('reservation_time', reservation_time)
      .in('status', ['pending', 'confirmed'])

    const occupied = (existing ?? []).reduce((sum, r) => sum + r.party_size, 0)
    if (occupied + party_size > (restaurant.reservation_capacity ?? 20)) {
      return NextResponse.json({ error: 'This time slot is fully booked' }, { status: 409 })
    }

    // Resolve CRM customer record — same auth_user_id-first strategy as orders
    let customerId: string | null = null
    if (customer_phone) {
      if (customer_user_id) {
        const { data: byAuth } = await supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', restaurant_id)
          .eq('auth_user_id', customer_user_id)
          .maybeSingle()

        if (byAuth) {
          await supabase.from('customers')
            .update({ name: customer_name, phone: customer_phone, email: customer_email || null })
            .eq('id', byAuth.id)
          customerId = byAuth.id
        } else {
          const { data: byPhone } = await supabase
            .from('customers')
            .select('id')
            .eq('restaurant_id', restaurant_id)
            .eq('phone', customer_phone)
            .maybeSingle()

          if (byPhone) {
            await supabase.from('customers')
              .update({ auth_user_id: customer_user_id, name: customer_name, email: customer_email || null })
              .eq('id', byPhone.id)
            customerId = byPhone.id
          } else {
            const { data: newC } = await supabase
              .from('customers')
              .insert({
                restaurant_id, name: customer_name, phone: customer_phone,
                email: customer_email || null, auth_user_id: customer_user_id,
              })
              .select('id')
              .single()
            customerId = newC?.id ?? null
          }
        }
      } else {
        // Guest reservation — upsert by phone
        const { data: guest } = await supabase
          .from('customers')
          .upsert({
            restaurant_id, name: customer_name, phone: customer_phone,
            email: customer_email || null,
          }, { onConflict: 'restaurant_id,phone' })
          .select('id')
          .single()
        customerId = guest?.id ?? null
      }
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        restaurant_id,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        party_size,
        reservation_date,
        reservation_time,
        notes: notes || null,
        status: 'pending',
        customer_user_id: customer_user_id ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Emit reservation_made event (fire-and-forget)
    if (customerId) {
      supabase.from('customer_events').insert({
        customer_id: customerId,
        restaurant_id,
        event_type: 'reservation_made',
        event_at: new Date().toISOString(),
        recorded_at: new Date().toISOString(),
        source_id: data.id,
        device_type: 'desktop_web',
        metadata: {
          reservation_id: data.id,
          party_size,
          reservation_date,
          reservation_time,
          channel: 'web',
        },
      }).then()
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Reservation API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
