import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { haikuJSON, PROMPTS, buildEmailHtml } from '@/lib/ai/haiku'
import { sendEmail } from '@/lib/email'
import { getEmailBaseUrl } from '@/lib/utils/app-url'

const COOLDOWN_DAYS = 7

export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { customer_id } = body ?? {}
  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString()

  const [customerRes, restaurantRes, loyaltyRes, recentRes] = await Promise.all([
    admin
      .from('customers')
      .select('id, first_name, last_name, name, email, loyalty_points_balance')
      .eq('id', customer_id)
      .eq('restaurant_id', ctx.restaurantId)
      .single(),

    admin
      .from('restaurants')
      .select('name, slug')
      .eq('id', ctx.restaurantId)
      .single(),

    admin
      .from('loyalty_programs')
      .select('program_name, minimum_points_to_redeem, points_to_redeem')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('is_enabled', true)
      .single(),

    admin
      .from('ai_messages_log')
      .select('id')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('customer_id', customer_id)
      .eq('message_type', 'loyalty_nudge')
      .gte('sent_at', cooldownCutoff)
      .limit(1)
      .maybeSingle(),
  ])

  if (!customerRes.data?.email) {
    return NextResponse.json({ error: 'Customer has no email' }, { status: 422 })
  }
  if (!loyaltyRes.data) {
    return NextResponse.json({ error: 'Loyalty program not active' }, { status: 422 })
  }
  if (recentRes.data) {
    return NextResponse.json({ already_sent: true })
  }

  const customer = customerRes.data
  const restaurant = restaurantRes.data!
  const loyalty = loyaltyRes.data
  const customerName = customer.first_name
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    : customer.name

  const balance = customer.loyalty_points_balance ?? 0
  const threshold = loyalty.minimum_points_to_redeem ?? 0
  const pointsNeeded = Math.max(0, threshold - balance)
  const isRedeemable = balance >= threshold

  const { subject, body: msgBody } = await haikuJSON<{ subject: string; body: string }>(
    PROMPTS.loyaltyNudge,
    JSON.stringify({
      restaurant: restaurant.name,
      program_name: loyalty.program_name,
      customer: customerName,
      points_balance: balance,
      points_to_redeem: loyalty.points_to_redeem,
      minimum_points_to_redeem: threshold,
      points_needed: pointsNeeded,
      is_redeemable: isRedeemable,
    }),
  )

  const html = buildEmailHtml({
    restaurantName: restaurant.name,
    customerName,
    body: msgBody,
    ctaLabel: isRedeemable ? 'Redeem My Reward' : 'Order & Earn Points',
    ctaUrl: `${getEmailBaseUrl()}/restaurant/${restaurant.slug}`,
  })

  await sendEmail({ to: customer.email, subject, html })

  void admin.from('ai_messages_log').insert({
    restaurant_id: ctx.restaurantId,
    customer_id: customer.id,
    message_type: 'loyalty_nudge',
    channel: 'email',
    subject,
  })

  return NextResponse.json({ sent: true, subject })
}
