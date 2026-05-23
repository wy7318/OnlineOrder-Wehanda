import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ balance: 0, transactions: [] })

  const supabase = createAdminClient()

  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('is_enabled, points_expiry_days, points_to_redeem, minimum_points_to_redeem, program_name')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  if (!program?.is_enabled) return NextResponse.json({ balance: 0, transactions: [], program: null })

  let customer = await supabase
    .from('customers')
    .select('id, loyalty_points_balance')
    .eq('restaurant_id', restaurantId)
    .eq('auth_user_id', user.id)
    .maybeSingle()
    .then(r => r.data)

  // Fallback: find customer via orders placed by this auth user
  if (!customer) {
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('restaurant_id', restaurantId)
      .eq('customer_user_id', user.id)
      .not('customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrder?.customer_id) {
      const { data: c } = await supabase
        .from('customers')
        .update({ auth_user_id: user.id })
        .eq('id', latestOrder.customer_id)
        .select('id, loyalty_points_balance')
        .single()
      customer = c ?? null
    }
  }

  if (!customer) return NextResponse.json({ balance: 0, transactions: [], program })

  let balance = customer.loyalty_points_balance

  // Lazy expiry: if program has expiry and customer has points, check last activity
  if (program.points_expiry_days && balance > 0) {
    const { data: lastEarn } = await supabase
      .from('loyalty_transactions')
      .select('created_at')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customer.id)
      .gt('points_delta', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastEarn) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastEarn.created_at).getTime()) / 86_400_000
      )
      if (daysSince > program.points_expiry_days) {
        await supabase.from('loyalty_transactions').insert({
          restaurant_id: restaurantId,
          customer_id: customer.id,
          points_delta: -balance,
          type: 'expiry',
          note: `Points expired after ${program.points_expiry_days} days of inactivity`,
        })
        await supabase.from('customers')
          .update({ loyalty_points_balance: 0 })
          .eq('id', customer.id)
        balance = 0
      }
    }
  }

  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ balance, transactions: transactions ?? [], program })
}
