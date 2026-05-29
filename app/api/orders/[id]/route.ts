import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { attributeOrderToCampaign } from '@/lib/ai/campaigns'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, customer_id, customer_user_id, status, subtotal, loyalty_points_redeemed')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_user_id')
    .eq('id', order.restaurant_id)
    .single()

  if (restaurant?.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Award loyalty points and attribute campaign revenue when order is completed (only once)
  if (status === 'completed' && order.status !== 'completed' && order.customer_id) {
    awardLoyaltyPoints(supabase, order).catch(() => {})
    attributeOrderToCampaign({
      restaurantId: order.restaurant_id as string,
      customerId: order.customer_id as string,
      orderId: order.id as string,
      orderTotal: (order.subtotal as number) ?? 0,
    }).catch(() => {})
  }

  // Refund redeemed points when order is cancelled (only once, only if points were used)
  if (status === 'cancelled' && order.status !== 'cancelled' && order.customer_id && order.loyalty_points_redeemed > 0) {
    refundLoyaltyPoints(supabase, order).catch(() => {})
  }

  return NextResponse.json(updated)
}

async function awardLoyaltyPoints(
  supabase: SupabaseClient,
  order: { id: string; restaurant_id: string; customer_id: string; customer_user_id: string | null; subtotal: number; loyalty_points_redeemed: number }
) {
  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('*')
    .eq('restaurant_id', order.restaurant_id)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!program) return

  const { data: customer } = await supabase
    .from('customers')
    .select('loyalty_points_balance, birthday, auth_user_id')
    .eq('id', order.customer_id)
    .single()

  if (!customer) return

  // Self-heal: link auth_user_id if the order has it but the customer record doesn't
  if (!customer.auth_user_id && order.customer_user_id) {
    await supabase
      .from('customers')
      .update({ auth_user_id: order.customer_user_id })
      .eq('id', order.customer_id)
  }

  const transactions: object[] = []
  let pointsToAdd = 0

  // Earn points on subtotal (before loyalty discount)
  const earned = Math.floor(order.subtotal * program.points_per_dollar)
  if (earned > 0) {
    transactions.push({
      restaurant_id: order.restaurant_id,
      customer_id: order.customer_id,
      order_id: order.id,
      points_delta: earned,
      type: 'order_earn',
    })
    pointsToAdd += earned
  }

  // Welcome bonus: first ever completed order at this restaurant
  if (program.welcome_bonus_points > 0) {
    const { count } = await supabase
      .from('loyalty_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', order.restaurant_id)
      .eq('customer_id', order.customer_id)
      .eq('type', 'welcome_bonus')

    if (count === 0) {
      transactions.push({
        restaurant_id: order.restaurant_id,
        customer_id: order.customer_id,
        order_id: order.id,
        points_delta: program.welcome_bonus_points,
        type: 'welcome_bonus',
        note: 'Welcome to the rewards program!',
      })
      pointsToAdd += program.welcome_bonus_points
    }
  }

  // Birthday bonus: once per calendar year in birth month
  if (program.birthday_bonus_points > 0 && customer.birthday) {
    const today = new Date()
    const bday = new Date(customer.birthday)
    if (today.getMonth() === bday.getMonth()) {
      const yearStart = new Date(today.getFullYear(), 0, 1).toISOString()
      const { count } = await supabase
        .from('loyalty_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', order.restaurant_id)
        .eq('customer_id', order.customer_id)
        .eq('type', 'birthday_bonus')
        .gte('created_at', yearStart)

      if (count === 0) {
        transactions.push({
          restaurant_id: order.restaurant_id,
          customer_id: order.customer_id,
          order_id: order.id,
          points_delta: program.birthday_bonus_points,
          type: 'birthday_bonus',
          note: 'Happy Birthday!',
        })
        pointsToAdd += program.birthday_bonus_points
      }
    }
  }

  if (transactions.length > 0) {
    await supabase.from('loyalty_transactions').insert(transactions)
  }

  if (pointsToAdd > 0) {
    await supabase
      .from('customers')
      .update({ loyalty_points_balance: customer.loyalty_points_balance + pointsToAdd })
      .eq('id', order.customer_id)
  }
}

async function refundLoyaltyPoints(
  supabase: SupabaseClient,
  order: { id: string; restaurant_id: string; customer_id: string; loyalty_points_redeemed: number }
) {
  const { data: customer } = await supabase
    .from('customers')
    .select('loyalty_points_balance')
    .eq('id', order.customer_id)
    .single()

  if (!customer) return

  await supabase.from('loyalty_transactions').insert({
    restaurant_id: order.restaurant_id,
    customer_id: order.customer_id,
    order_id: order.id,
    points_delta: order.loyalty_points_redeemed,
    type: 'order_refund',
    note: `Refunded ${order.loyalty_points_redeemed} pts — order cancelled`,
  })

  await supabase
    .from('customers')
    .update({ loyalty_points_balance: customer.loyalty_points_balance + order.loyalty_points_redeemed })
    .eq('id', order.customer_id)
}
