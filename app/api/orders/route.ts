import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOrderNumber } from '@/lib/utils/helpers'
import { sendEmail } from '@/lib/email'
import { orderConfirmationEmail } from '@/lib/email/orderConfirmation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      restaurant_id, order_type, customer_name, customer_phone, customer_email,
      order_notes, delivery_address, delivery_instructions,
      subtotal, fee_amount, items, customer_user_id,
      marketing_opt_in,
      loyalty_points_redeemed = 0,
      loyalty_discount_amount = 0,
      payment_method = 'cash',
      stripe_payment_intent_id = null,
    } = body

    if (!restaurant_id || !customer_name || !customer_phone || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify restaurant exists and is active
    const { data: restaurant, error: rErr } = await supabase
      .from('restaurants')
      .select('id, name, address, phone, is_active, online_ordering_enabled, tax_rate')
      .eq('id', restaurant_id)
      .single()

    if (rErr || !restaurant || !restaurant.is_active || !restaurant.online_ordering_enabled) {
      return NextResponse.json({ error: 'Restaurant is not accepting orders' }, { status: 403 })
    }

    // Verify Stripe payment intent when paying by card — use platform's env keys
    if (payment_method === 'stripe') {
      if (!stripe_payment_intent_id) {
        return NextResponse.json({ error: 'Missing payment intent' }, { status: 400 })
      }
      const { data: paySettings } = await supabase
        .from('restaurant_payment_settings')
        .select('stripe_enabled, stripe_mode')
        .eq('restaurant_id', restaurant_id)
        .single()

      if (paySettings?.stripe_enabled) {
        const isTestMode = paySettings.stripe_mode === 'test'
        const secretKey = isTestMode
          ? process.env.STRIPE_TEST_SECRET_KEY
          : process.env.STRIPE_SECRET_KEY

        if (secretKey) {
          const stripeClient = new Stripe(secretKey)
          const pi = await stripeClient.paymentIntents.retrieve(stripe_payment_intent_id)
          if (pi.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 })
          }
        }
      }
    }

    // Recalculate tax and total server-side — never trust client values
    const taxRate = restaurant.tax_rate ?? 0
    const tax_amount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const tip = Math.max(0, fee_amount ?? 0)

    // Validate loyalty redemption if present
    let loyaltyPointsRedeemed = 0
    let loyaltyDiscountAmount = 0
    if (loyalty_points_redeemed > 0 && customer_user_id) {
      const { data: program } = await supabase
        .from('loyalty_programs')
        .select('is_enabled, points_to_redeem, minimum_points_to_redeem')
        .eq('restaurant_id', restaurant_id)
        .eq('is_enabled', true)
        .maybeSingle()

      if (program) {
        let cust = await supabase
          .from('customers')
          .select('id, loyalty_points_balance')
          .eq('restaurant_id', restaurant_id)
          .eq('auth_user_id', customer_user_id)
          .maybeSingle()
          .then(r => r.data)

        if (!cust) {
          const { data: latestOrder } = await supabase
            .from('orders')
            .select('customer_id')
            .eq('restaurant_id', restaurant_id)
            .eq('customer_user_id', customer_user_id)
            .not('customer_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestOrder?.customer_id) {
            const { data: c } = await supabase
              .from('customers')
              .update({ auth_user_id: customer_user_id })
              .eq('id', latestOrder.customer_id)
              .select('id, loyalty_points_balance')
              .single()
            cust = c ?? null
          }
        }

        const actualPoints = Math.min(loyalty_points_redeemed, cust?.loyalty_points_balance ?? 0)
        if (cust && actualPoints >= program.minimum_points_to_redeem) {
          loyaltyPointsRedeemed = actualPoints
          loyaltyDiscountAmount = Math.floor(actualPoints / program.points_to_redeem)
          // Redeem immediately — deduct balance and create transaction
          await supabase.from('customers')
            .update({ loyalty_points_balance: cust.loyalty_points_balance - loyaltyPointsRedeemed })
            .eq('id', cust.id)
          // Transaction inserted after order is created (need order.id)
        }
      }
    }

    const total_amount = Math.max(0, Math.round((subtotal + tax_amount + tip - loyaltyDiscountAmount) * 100) / 100)

    // Resolve CRM customer record
    // Lookup priority: auth_user_id (logged-in) → normalized phone → raw phone (old records) → email → insert
    let customerId: string | null = null
    if (customer_phone) {
      const mktOptIn = marketing_opt_in !== false
      const mktFields: Record<string, unknown> = {
        marketing_opt_in: mktOptIn,
        ...(mktOptIn ? { marketing_opt_in_at: new Date().toISOString() } : {}),
      }

      // Normalize phone: strip non-digits, drop leading country code 1 for 11-digit US numbers
      const normalizedPhone = customer_phone.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1')
      const normalizedEmail = customer_email?.trim().toLowerCase() || null

      // Helpers — return first match or null
      const findByPhone = async (phone: string): Promise<{ id: string } | null> => {
        const { data } = await supabase.from('customers').select('id')
          .eq('restaurant_id', restaurant_id).eq('phone', phone).maybeSingle()
        return data
      }
      const findByEmail = async (email: string): Promise<{ id: string } | null> => {
        const { data } = await supabase.from('customers').select('id')
          .eq('restaurant_id', restaurant_id).ilike('email', email).limit(1)
        return data?.[0] ?? null
      }

      if (customer_user_id) {
        // ── Logged-in user ─────────────────────────────────────────
        const { data: byAuth } = await supabase.from('customers').select('id')
          .eq('restaurant_id', restaurant_id).eq('auth_user_id', customer_user_id).maybeSingle()

        if (byAuth) {
          await supabase.from('customers')
            .update({ name: customer_name, phone: normalizedPhone, email: normalizedEmail, ...mktFields })
            .eq('id', byAuth.id)
          customerId = byAuth.id
        } else {
          // Claim an existing guest record: normalized phone → raw phone → email → create
          let claimed: { id: string } | null = await findByPhone(normalizedPhone)
          if (!claimed && normalizedPhone !== customer_phone) claimed = await findByPhone(customer_phone)
          if (!claimed && normalizedEmail) claimed = await findByEmail(normalizedEmail)

          if (claimed) {
            await supabase.from('customers')
              .update({ auth_user_id: customer_user_id, name: customer_name, phone: normalizedPhone, email: normalizedEmail, ...mktFields })
              .eq('id', claimed.id)
            customerId = claimed.id
          } else {
            const { data: newC } = await supabase.from('customers')
              .insert({ restaurant_id, name: customer_name, phone: normalizedPhone, email: normalizedEmail, auth_user_id: customer_user_id, ...mktFields })
              .select('id').single()
            customerId = newC?.id ?? null
          }
        }
      } else {
        // ── Guest order ─────────────────────────────────────────────
        // Lookup: normalized phone → raw phone (backward compat) → email → insert
        let existing: { id: string } | null = await findByPhone(normalizedPhone)
        if (!existing && normalizedPhone !== customer_phone) existing = await findByPhone(customer_phone)
        if (!existing && normalizedEmail) existing = await findByEmail(normalizedEmail)

        if (existing) {
          await supabase.from('customers')
            .update({ name: customer_name, phone: normalizedPhone, email: normalizedEmail, ...mktFields })
            .eq('id', existing.id)
          customerId = existing.id
        } else {
          const { data: newC } = await supabase.from('customers')
            .insert({ restaurant_id, name: customer_name, phone: normalizedPhone, email: normalizedEmail, ...mktFields })
            .select('id').single()
          customerId = newC?.id ?? null
        }
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
        loyalty_points_redeemed: loyaltyPointsRedeemed,
        loyalty_discount_amount: loyaltyDiscountAmount,
        payment_method,
        stripe_payment_intent_id: payment_method === 'stripe' ? stripe_payment_intent_id : null,
        payment_status: payment_method === 'stripe' ? 'paid' : 'unpaid',
      })
      .select()
      .single()

    if (orderErr || !order) {
      console.error('Order creation error:', orderErr)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Record loyalty redemption transaction
    if (loyaltyPointsRedeemed > 0 && customerId) {
      supabase.from('loyalty_transactions').insert({
        restaurant_id,
        customer_id: customerId,
        order_id: order.id,
        points_delta: -loyaltyPointsRedeemed,
        type: 'order_redeem',
        note: `Redeemed ${loyaltyPointsRedeemed} pts for $${loyaltyDiscountAmount} off`,
      }).then()
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
          added_from_upsell: item.added_from_upsell ?? false,
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

    // Send order confirmation email (fire-and-forget)
    if (order.customer_email) {
      const { subject, html } = orderConfirmationEmail({
        restaurantName: restaurant.name,
        restaurantPhone: restaurant.phone ?? null,
        restaurantAddress: restaurant.address ?? null,
        customerName: order.customer_name,
        orderNumber: order.order_number,
        orderType: order.order_type,
        subtotal: order.subtotal,
        taxAmount: order.tax_amount,
        tipAmount: order.fee_amount,
        totalAmount: order.total_amount,
        orderNotes: order.order_notes ?? null,
        deliveryAddress: order.delivery_address ?? null,
        items: items.map((item: {
          item_name_snapshot: string
          quantity: number
          line_total: number
          options?: Array<{ option_group_name_snapshot: string; option_name_snapshot: string }>
          notes?: string | null
        }) => ({
          name: item.item_name_snapshot,
          quantity: item.quantity,
          lineTotal: item.line_total,
          options: (item.options ?? []).map(o => ({
            groupName: o.option_group_name_snapshot,
            optionName: o.option_name_snapshot,
          })),
          notes: item.notes ?? null,
        })),
      })
      sendEmail({ to: order.customer_email, subject, html }).catch(() => {})
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
