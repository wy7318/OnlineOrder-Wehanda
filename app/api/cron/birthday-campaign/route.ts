import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCampaign, sendCampaignEmail, finalizeCampaign,
  alreadySentCampaign, getAutomationSettings, verifyCronSecret,
} from '@/lib/ai/campaigns'

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find all restaurants with birthday automation enabled
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, slug')

  if (!restaurants?.length) return NextResponse.json({ processed: 0 })

  let totalSent = 0

  for (const restaurant of restaurants) {
    const settings = await getAutomationSettings(restaurant.id as string)
    if (!settings.birthday_enabled) continue

    // Find customers with birthday tomorrow (±1 day window for timezone flexibility)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const month = tomorrow.getMonth() + 1
    const day = tomorrow.getDate()

    const { data: customers } = await admin
      .from('customers')
      .select('id, first_name, last_name, name, email, loyalty_points_balance, birthday')
      .eq('restaurant_id', restaurant.id)
      .eq('marketing_opt_in', true)
      .not('email', 'is', null)
      .not('birthday', 'is', null)

    // Filter customers whose birthday month+day matches tomorrow
    const eligible = (customers ?? []).filter(c => {
      if (!c.email) return false
      const bday = new Date(c.birthday as string)
      return bday.getMonth() + 1 === month && bday.getDate() === day
    })

    if (!eligible.length) continue

    // Check loyalty program for birthday bonus
    const { data: loyalty } = await admin
      .from('loyalty_programs')
      .select('birthday_bonus_points, is_enabled')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle()

    const campaignId = await createCampaign({
      restaurantId: restaurant.id as string,
      campaignType: 'birthday',
      name: `Birthday Campaign — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    })

    let sent = 0
    for (const customer of eligible) {
      const alreadySent = await alreadySentCampaign({
        restaurantId: restaurant.id as string,
        customerId: customer.id as string,
        campaignType: 'birthday',
        withinDays: 300,
      })
      if (alreadySent) continue

      // Fetch last ordered items for personalization
      const { data: lastOrder } = await admin
        .from('orders')
        .select('order_items(item_name_snapshot)')
        .eq('restaurant_id', restaurant.id)
        .eq('customer_id', customer.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastItems = ((lastOrder as { order_items?: { item_name_snapshot: string }[] } | null)
        ?.order_items ?? []).slice(0, 2).map(i => i.item_name_snapshot)

      const customerName = customer.first_name
        ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        : customer.name ?? 'there'

      const birthdayBonus = loyalty?.is_enabled ? (loyalty.birthday_bonus_points ?? 0) : 0

      try {
        await sendCampaignEmail({
          campaignId,
          restaurantId: restaurant.id as string,
          customerId: customer.id as string,
          customerEmail: customer.email as string,
          restaurantName: restaurant.name as string,
          restaurantSlug: restaurant.slug as string,
          customerName,
          promptKey: 'birthday',
          promptContext: {
            restaurant: restaurant.name,
            customer: customerName,
            usual_order: lastItems,
            birthday_bonus_points: birthdayBonus,
            has_bonus: birthdayBonus > 0,
          },
          ctaLabel: 'Claim Your Birthday Treat',
          highlight: {
            emoji: '🎂',
            label: 'Happy Birthday!',
            value: birthdayBonus > 0 ? `${birthdayBonus} bonus pts` : 'Special day',
            note: birthdayBonus > 0
              ? 'A birthday gift from us — use it on your next order'
              : 'Wishing you a wonderful day',
            accentColor: '#db2777',
            bgColor: '#fdf2f8',
          },
        })
        sent++
        totalSent++
      } catch (err) {
        console.error('[birthday-campaign] send failed for', customer.id, err)
      }
    }

    if (sent > 0) await finalizeCampaign(campaignId, sent)
  }

  return NextResponse.json({ sent: totalSent })
}
