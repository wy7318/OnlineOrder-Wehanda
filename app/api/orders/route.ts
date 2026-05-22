import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOrderNumber } from '@/lib/utils/helpers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      restaurant_id, order_type, customer_name, customer_phone, customer_email,
      order_notes, delivery_address, delivery_instructions,
      subtotal, fee_amount, items, customer_user_id,
      marketing_opt_in,
    } = body

    if (!restaurant_id || !customer_name || !customer_phone || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify restaurant exists and is active
    const { data: restaurant, error: rErr } = await supabase
      .from('restaurants')
      .select('id, is_active, online_ordering_enabled, tax_rate')
      .eq('id', restaurant_id)
      .single()

    if (rErr || !restaurant || !restaurant.is_active || !restaurant.online_ordering_enabled) {
      return NextResponse.json({ error: 'Restaurant is not accepting orders' }, { status: 403 })
    }

    // Recalculate tax and total server-side — never trust client values
    const taxRate = restaurant.tax_rate ?? 0
    const tax_amount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const tip = Math.max(0, fee_amount ?? 0)
    const total_amount = Math.round((subtotal + tax_amount + tip) * 100) / 100

    // Resolve CRM customer record
    // Logged-in: auth_user_id is the stable identity — survives phone changes.
    // Guest: fall back to phone upsert (unchanged behavior).
    let customerId: string | null = null
    if (customer_phone) {
      const mktOptIn = marketing_opt_in !== false
      const mktFields: Record<string, unknown> = {
        marketing_opt_in: mktOptIn,
        ...(mktOptIn ? { marketing_opt_in_at: new Date().toISOString() } : {}),
      }

      if (customer_user_id) {
        // 1. Find existing record linked to this auth user at this restaurant
        const { data: byAuth } = await supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', restaurant_id)
          .eq('auth_user_id', customer_user_id)
          .maybeSingle()

        if (byAuth) {
          // Update contact info in case name/phone changed in profile settings
          await supabase.from('customers')
            .update({ name: customer_name, phone: customer_phone, email: customer_email || null, ...mktFields })
            .eq('id', byAuth.id)
          customerId = byAuth.id
        } else {
          // 2. Claim an existing phone-matched guest record and link it to this auth user
          const { data: byPhone } = await supabase
            .from('customers')
            .select('id')
            .eq('restaurant_id', restaurant_id)
            .eq('phone', customer_phone)
            .maybeSingle()

          if (byPhone) {
            await supabase.from('customers')
              .update({ auth_user_id: customer_user_id, name: customer_name, email: customer_email || null, ...mktFields })
              .eq('id', byPhone.id)
            customerId = byPhone.id
          } else {
            // 3. Truly new customer — insert with auth linkage
            const { data: newC } = await supabase
              .from('customers')
              .insert({
                restaurant_id, name: customer_name, phone: customer_phone,
                email: customer_email || null, auth_user_id: customer_user_id,
                ...mktFields,
              })
              .select('id')
              .single()
            customerId = newC?.id ?? null
          }
        }
      } else {
        // Guest order — upsert by phone (no auth user)
        const customerData: Record<string, unknown> = {
          restaurant_id, name: customer_name, phone: customer_phone,
          email: customer_email || null, ...mktFields,
        }
        const { data: guest } = await supabase
          .from('customers')
          .upsert(customerData, { onConflict: 'restaurant_id,phone' })
          .select('id')
          .single()
        customerId = guest?.id ?? null
      }
    }

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id,
        customer_id: customerId,
        customer_user_id: customer_user_id ?? null,
        order_number: generateOrderNumber(),
        status: 'new',
        order_type,
        customer_name, customer_phone, customer_email: customer_email || '',
        order_notes, delivery_address, delivery_instructions,
        subtotal, tax_amount, fee_amount: tip, total_amount,
      })
      .select()
      .single()

    if (orderErr || !order) {
      console.error('Order creation error:', orderErr)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items and options
    for (const item of items) {
      const { data: orderItem, error: itemErr } = await supabase
        .from('order_items')
        .insert({
          restaurant_id,
          order_id: order.id,
          menu_item_id: item.menu_item_id || null,
          item_name_snapshot: item.item_name_snapshot,
          base_price_snapshot: item.base_price_snapshot,
          quantity: item.quantity,
          notes: item.notes,
          line_total: item.line_total,
        })
        .select()
        .single()

      if (itemErr || !orderItem) continue

      if (item.options?.length) {
        await supabase.from('order_item_options').insert(
          item.options.map((opt: { option_group_name_snapshot: string; option_name_snapshot: string; additional_price_snapshot: number }) => ({
            restaurant_id,
            order_item_id: orderItem.id,
            option_group_name_snapshot: opt.option_group_name_snapshot,
            option_name_snapshot: opt.option_name_snapshot,
            additional_price_snapshot: opt.additional_price_snapshot,
          }))
        )
      }
    }

    // Emit order_placed event for AI event log (fire-and-forget)
    if (customerId) {
      supabase.from('customer_events').insert({
        customer_id: customerId,
        restaurant_id,
        event_type: 'order_placed',
        event_at: order.created_at,
        recorded_at: new Date().toISOString(),
        source_id: order.id,
        device_type: 'desktop_web',
        metadata: {
          order_id:      order.id,
          order_total:   total_amount,
          item_count:    items.length,
          order_type,
          channel:       'web',
          promo_applied: false,
          tip_amount:    tip,
          tip_pct:       subtotal > 0 ? Math.round((tip / subtotal) * 1000) / 10 : 0,
        },
      }).then()
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error('Order API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')

  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_options(*))')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
