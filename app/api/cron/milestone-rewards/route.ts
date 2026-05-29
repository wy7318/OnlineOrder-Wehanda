import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCampaign, sendCampaignEmail, finalizeCampaign,
  alreadySentCampaign, getAutomationSettings, verifyCronSecret,
} from '@/lib/ai/campaigns'

const MILESTONES = [5, 10, 25, 50]

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()

  // Find orders completed in the last 24 hours with known customers
  const { data: recentOrders } = await admin
    .from('orders')
    .select('customer_id, restaurant_id')
    .eq('status', 'completed')
    .gte('created_at', since)
    .not('customer_id', 'is', null)

  if (!recentOrders?.length) return NextResponse.json({ sent: 0 })

  // Unique customer-restaurant pairs
  const pairs = Array.from(
    new Map(recentOrders.map(o => [`${o.restaurant_id}:${o.customer_id}`, o])).values(),
  )

  const byRestaurant = new Map<string, string[]>()
  for (const { restaurant_id, customer_id } of pairs) {
    if (!byRestaurant.has(restaurant_id as string)) byRestaurant.set(restaurant_id as string, [])
    byRestaurant.get(restaurant_id as string)!.push(customer_id as string)
  }

  let totalSent = 0

  for (const [restaurantId, customerIds] of byRestaurant) {
    const settings = await getAutomationSettings(restaurantId)
    if (!settings.milestone_enabled) continue

    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id, name, slug')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) continue

    // Check loyalty for milestone bonus
    const { data: loyalty } = await admin
      .from('loyalty_programs')
      .select('is_enabled, birthday_bonus_points')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()

    const campaignId = await createCampaign({
      restaurantId,
      campaignType: 'milestone',
      name: `Milestone Rewards — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    })

    let sent = 0
    for (const customerId of customerIds) {
      // Count total completed orders for this customer
      const { count } = await admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .eq('status', 'completed')

      if (!count || !MILESTONES.includes(count)) continue

      const alreadySent = await alreadySentCampaign({
        restaurantId,
        customerId,
        campaignType: 'milestone',
        withinDays: 30,
      })
      if (alreadySent) continue

      const { data: customer } = await admin
        .from('customers')
        .select('id, first_name, last_name, name, email, marketing_opt_in')
        .eq('id', customerId)
        .maybeSingle()

      if (!customer?.email || !customer.marketing_opt_in) continue

      const customerName = customer.first_name
        ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        : customer.name ?? 'there'

      const milestoneLabel = count === 5 ? '5th' : count === 10 ? '10th' : count === 25 ? '25th' : `${count}th`
      const bonusPoints = loyalty?.is_enabled ? (loyalty.birthday_bonus_points ?? 0) : 0

      try {
        await sendCampaignEmail({
          campaignId,
          restaurantId,
          customerId,
          customerEmail: customer.email as string,
          restaurantName: restaurant.name as string,
          restaurantSlug: restaurant.slug as string,
          customerName,
          promptKey: 'milestone',
          promptContext: {
            restaurant: restaurant.name,
            customer: customerName,
            order_count: count,
            milestone_label: milestoneLabel,
            bonus_points: bonusPoints,
            has_bonus: bonusPoints > 0,
          },
          ctaLabel: 'Order Again',
          highlight: {
            emoji: '🎉',
            label: `You just placed your`,
            value: `${milestoneLabel} order`,
            note: bonusPoints > 0
              ? `We're adding ${bonusPoints} bonus points as a thank-you!`
              : 'Thank you for being such a loyal regular',
            accentColor: '#7c3aed',
            bgColor: '#f5f3ff',
          },
        })
        sent++
        totalSent++
      } catch (err) {
        console.error('[milestone-rewards] send failed for', customerId, err)
      }
    }

    if (sent > 0) await finalizeCampaign(campaignId, sent)
  }

  return NextResponse.json({ sent: totalSent })
}
