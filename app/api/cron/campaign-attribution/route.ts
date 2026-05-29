import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronSecret } from '@/lib/ai/campaigns'

// Orders placed within 7 days of an email click are attributed to that campaign
const ATTRIBUTION_WINDOW_DAYS = 7

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const windowAgo = new Date(Date.now() - ATTRIBUTION_WINDOW_DAYS * 86_400_000).toISOString()

  // Find contacts clicked recently that aren't yet converted
  const { data: clicked } = await admin
    .from('campaign_contacts')
    .select('id, campaign_id, customer_id, restaurant_id, clicked_at')
    .eq('status', 'clicked')
    .gte('clicked_at', windowAgo)
    .limit(500)

  if (!clicked?.length) return NextResponse.json({ attributed: 0 })

  let attributed = 0
  const campaignRevenue = new Map<string, { revenue: number; orders: number }>()

  for (const contact of clicked) {
    // Find an order placed after the click by this customer
    const { data: order } = await admin
      .from('orders')
      .select('id, total_amount')
      .eq('restaurant_id', contact.restaurant_id as string)
      .eq('customer_id', contact.customer_id as string)
      .eq('status', 'completed')
      .gte('created_at', contact.clicked_at as string)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!order) continue

    // Tag order + mark contact converted
    await admin
      .from('campaign_contacts')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        order_id: order.id,
        revenue_attributed: order.total_amount,
      })
      .eq('id', contact.id as string)

    await admin
      .from('orders')
      .update({ campaign_contact_id: contact.id })
      .eq('id', order.id as string)
      .is('campaign_contact_id', null) // don't overwrite existing attribution

    // Accumulate for campaign-level update
    const rev = campaignRevenue.get(contact.campaign_id as string) ?? { revenue: 0, orders: 0 }
    rev.revenue += (order.total_amount as number) ?? 0
    rev.orders += 1
    campaignRevenue.set(contact.campaign_id as string, rev)
    attributed++
  }

  // Update campaign aggregates — fetch current then add delta
  for (const [campaignId, { revenue, orders }] of campaignRevenue) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('order_count, revenue_attributed, click_count')
      .eq('id', campaignId)
      .maybeSingle()

    if (!campaign) continue

    // Recount clicks from campaign_contacts for accuracy
    const { count: clickCount } = await admin
      .from('campaign_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['clicked', 'converted'])

    await admin
      .from('campaigns')
      .update({
        order_count: ((campaign.order_count as number) ?? 0) + orders,
        revenue_attributed: ((campaign.revenue_attributed as number) ?? 0) + revenue,
        click_count: clickCount ?? (campaign.click_count as number),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
  }

  return NextResponse.json({ attributed })
}
