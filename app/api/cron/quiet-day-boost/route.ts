import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCampaign, sendCampaignEmail, finalizeCampaign,
  alreadySentCampaign, getAutomationSettings, verifyCronSecret,
} from '@/lib/ai/campaigns'

const MAX_SENDS_PER_RESTAURANT = 30
const CUSTOMER_COOLDOWN_DAYS = 7
const ACTIVE_CUSTOMER_DAYS = 60

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Only run for restaurants that have a daily_revenue_target set
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, slug, daily_revenue_target')
    .not('daily_revenue_target', 'is', null)
    .gt('daily_revenue_target', 0)

  if (!restaurants?.length) return NextResponse.json({ sent: 0 })

  let totalSent = 0

  for (const restaurant of restaurants) {
    const settings = await getAutomationSettings(restaurant.id as string)
    if (!settings.quiet_day_enabled) continue

    // Check today's revenue
    const { data: revenueData } = await admin
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'completed')
      .gte('created_at', todayStart.toISOString())

    const todayRevenue = (revenueData ?? []).reduce(
      (sum, o) => sum + ((o.total_amount as number) ?? 0), 0,
    )
    const target = restaurant.daily_revenue_target as number

    // Only send if below 60% of daily target by 2pm
    if (todayRevenue >= target * 0.6) continue

    // Find recently active customers with email and marketing opt-in
    const since = new Date(Date.now() - ACTIVE_CUSTOMER_DAYS * 86_400_000).toISOString()
    const { data: customers } = await admin
      .from('customers')
      .select('id, first_name, last_name, name, email')
      .eq('restaurant_id', restaurant.id)
      .eq('marketing_opt_in', true)
      .not('email', 'is', null)
      .gte('last_seen_at', since)
      .limit(MAX_SENDS_PER_RESTAURANT * 2)

    if (!customers?.length) continue

    const campaignId = await createCampaign({
      restaurantId: restaurant.id as string,
      campaignType: 'quiet_day',
      name: `Quiet Day Boost — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      metadata: { today_revenue: todayRevenue, target },
    })

    let sent = 0
    for (const customer of customers) {
      if (sent >= MAX_SENDS_PER_RESTAURANT) break

      const alreadySent = await alreadySentCampaign({
        restaurantId: restaurant.id as string,
        customerId: customer.id as string,
        campaignType: 'quiet_day',
        withinDays: CUSTOMER_COOLDOWN_DAYS,
      })
      if (alreadySent) continue

      const customerName = customer.first_name
        ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        : customer.name ?? 'there'

      try {
        await sendCampaignEmail({
          campaignId,
          restaurantId: restaurant.id as string,
          customerId: customer.id as string,
          customerEmail: customer.email as string,
          restaurantName: restaurant.name as string,
          restaurantSlug: restaurant.slug as string,
          customerName,
          promptKey: 'quietDay',
          promptContext: {
            restaurant: restaurant.name,
            customer: customerName,
          },
          ctaLabel: 'Order Now',
          highlight: {
            emoji: '🍽️',
            label: 'Perfect time to visit',
            value: 'Today',
            note: 'It is a great time to come in and enjoy a meal',
            accentColor: '#7c3aed',
            bgColor: '#f5f3ff',
          },
        })
        sent++
        totalSent++
      } catch (err) {
        console.error('[quiet-day-boost] send failed for', customer.id, err)
      }
    }

    if (sent > 0) await finalizeCampaign(campaignId, sent)
  }

  return NextResponse.json({ sent: totalSent })
}
