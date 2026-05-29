import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

const WINDOW_OPTIONS: Record<string, number> = { '7': 7, '30': 30, '90': 90 }

const TYPE_LABELS: Record<string, string> = {
  birthday: 'Birthday Emails',
  after_order: 'After-Order Follow-ups',
  new_item_launch: 'New Item Launches',
  quiet_day: 'Slow Day Boosts',
  milestone: 'Milestone Rewards',
  win_back: 'Win-Back Emails',
  cart_recovery: 'Cart Recovery',
  loyalty_nudge: 'Loyalty Nudges',
}

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const days = WINDOW_OPTIONS[url.searchParams.get('days') ?? '30'] ?? 30
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const admin = createAdminClient()

  // Fetch campaigns in window
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, campaign_type, order_count, revenue_attributed, created_at')
    .eq('restaurant_id', ctx.restaurantId)
    .gte('created_at', since)

  if (!campaigns?.length) return NextResponse.json({ campaigns: [], window_days: days })

  const campaignIds = campaigns.map(c => c.id as string)

  // Compute all stats directly from campaign_contacts (source of truth)
  const { data: contacts } = await admin
    .from('campaign_contacts')
    .select('campaign_id, status, revenue_attributed')
    .in('campaign_id', campaignIds)

  // Build per-campaign counts from contact records
  const countMap = new Map<string, { sent: number; clicks: number; orders: number; revenue: number }>()
  for (const cc of contacts ?? []) {
    const cid = cc.campaign_id as string
    const existing = countMap.get(cid) ?? { sent: 0, clicks: 0, orders: 0, revenue: 0 }
    if (['sent', 'clicked', 'converted'].includes(cc.status as string)) existing.sent++
    if (['clicked', 'converted'].includes(cc.status as string)) existing.clicks++
    if (cc.status === 'converted') {
      existing.orders++
      existing.revenue += Number(cc.revenue_attributed ?? 0)
    }
    countMap.set(cid, existing)
  }

  // Aggregate by campaign_type
  const grouped = new Map<string, {
    label: string
    campaign_type: string
    sent: number
    clicks: number
    orders: number
    revenue: number
    last_run: string
  }>()

  for (const c of campaigns) {
    const type = c.campaign_type as string
    const counts = countMap.get(c.id as string) ?? { sent: 0, clicks: 0, orders: 0, revenue: 0 }
    const existing = grouped.get(type) ?? {
      label: TYPE_LABELS[type] ?? type,
      campaign_type: type,
      sent: 0,
      clicks: 0,
      orders: 0,
      revenue: 0,
      last_run: c.created_at as string,
    }
    existing.sent += counts.sent
    existing.clicks += counts.clicks
    existing.orders += counts.orders
    existing.revenue += counts.revenue
    grouped.set(type, existing)
  }

  const result = Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue)
  const totals = result.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      orders: acc.orders + r.orders,
      revenue: acc.revenue + r.revenue,
    }),
    { sent: 0, orders: 0, revenue: 0 },
  )

  return NextResponse.json({ campaigns: result, totals, window_days: days })
}
