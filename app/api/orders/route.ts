import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOrderNumber } from '@/lib/utils/helpers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      restaurant_id, order_type, customer_name, customer_phone, customer_email,
      order_notes, delivery_address, delivery_instructions,
      subtotal, tax_amount, fee_amount, total_amount, items,
    } = body

    if (!restaurant_id || !customer_name || !customer_phone || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify restaurant exists and is active
    const { data: restaurant, error: rErr } = await supabase
      .from('restaurants')
      .select('id, is_active, online_ordering_enabled')
      .eq('id', restaurant_id)
      .single()

    if (rErr || !restaurant || !restaurant.is_active || !restaurant.online_ordering_enabled) {
      return NextResponse.json({ error: 'Restaurant is not accepting orders' }, { status: 403 })
    }

    // Upsert customer
    let customerId: string | null = null
    if (customer_email || customer_phone) {
      const { data: customer } = await supabase
        .from('customers')
        .upsert({
          restaurant_id, name: customer_name, phone: customer_phone, email: customer_email || null,
        }, { onConflict: 'restaurant_id,phone' })
        .select('id')
        .single()
      customerId = customer?.id ?? null
    }

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id,
        customer_id: customerId,
        order_number: generateOrderNumber(),
        status: 'new',
        order_type,
        customer_name, customer_phone, customer_email: customer_email || '',
        order_notes, delivery_address, delivery_instructions,
        subtotal, tax_amount, fee_amount, total_amount,
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
