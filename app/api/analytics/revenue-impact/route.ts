import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30')))
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const admin = createAdminClient()
  const { restaurantId } = ctx

  const [ordersResult, txnsResult] = await Promise.all([
    admin
      .from('orders')
      .select('id, total_amount, customer_user_id, loyalty_discount_amount')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed')
      .gte('created_at', since),
    admin
      .from('loyalty_transactions')
      .select('customer_id, points_delta, type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', since),
  ])

  const completedOrders = ordersResult.data ?? []
  const txns = txnsResult.data ?? []

  const orderIds = completedOrders.map(o => o.id)
  const orderItems = orderIds.length > 0
    ? (await admin
        .from('order_items')
        .select('order_id, line_total, added_from_upsell, item_name_snapshot')
        .in('order_id', orderIds)
      ).data ?? []
    : []

  // ── Upsell ──
  const upsellItems = orderItems.filter(i => i.added_from_upsell)
  const upsellRevenue = upsellItems.reduce((s, i) => s + Number(i.line_total), 0)
  const ordersWithUpsellSet = new Set(upsellItems.map(i => i.order_id))
  const upsellOrderCount = ordersWithUpsellSet.size
  const totalOrderCount = completedOrders.length
  const acceptanceRate = totalOrderCount > 0 ? upsellOrderCount / totalOrderCount : 0

  const withUpsell = completedOrders.filter(o => ordersWithUpsellSet.has(o.id))
  const withoutUpsell = completedOrders.filter(o => !ordersWithUpsellSet.has(o.id))
  const aovWithUpsell = withUpsell.length > 0
    ? withUpsell.reduce((s, o) => s + Number(o.total_amount), 0) / withUpsell.length
    : 0
  const aovWithoutUpsell = withoutUpsell.length > 0
    ? withoutUpsell.reduce((s, o) => s + Number(o.total_amount), 0) / withoutUpsell.length
    : 0

  const itemMap: Record<string, { revenue: number; count: number }> = {}
  upsellItems.forEach(i => {
    const k = i.item_name_snapshot
    if (!itemMap[k]) itemMap[k] = { revenue: 0, count: 0 }
    itemMap[k].revenue += Number(i.line_total)
    itemMap[k].count += 1
  })
  const topUpsellItems = Object.entries(itemMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(([name, s]) => ({ name, revenue: s.revenue, count: s.count }))

  // ── Loyalty ──
  const totalDiscountGiven = completedOrders.reduce((s, o) => s + Number(o.loyalty_discount_amount ?? 0), 0)
  const redemptionOrderCount = completedOrders.filter(o => Number(o.loyalty_discount_amount ?? 0) > 0).length

  // Only genuine earn events count as "issued" — refunds are restorations, not new issuance
  const EARN_TYPES = new Set(['order_earn', 'welcome_bonus', 'birthday_bonus', 'manual_adjust'])
  const pointsEarned = txns
    .filter(t => EARN_TYPES.has(t.type) && t.points_delta > 0)
    .reduce((s, t) => s + t.points_delta, 0)

  // Gross redemptions (points spent at checkout)
  const pointsGrossRedeemed = Math.abs(
    txns.filter(t => t.type === 'order_redeem').reduce((s, t) => s + t.points_delta, 0)
  )
  // Refunded points (returned when orders are cancelled) — reduce effective redemption
  const pointsRefunded = txns
    .filter(t => t.type === 'order_refund')
    .reduce((s, t) => s + t.points_delta, 0)
  // Net redeemed = what customers actually spent minus what was returned
  const pointsNetRedeemed = Math.max(0, pointsGrossRedeemed - pointsRefunded)

  const activeMembers = new Set(txns.map(t => t.customer_id)).size

  const memberOrders = completedOrders.filter(o => o.customer_user_id)
  const guestOrders = completedOrders.filter(o => !o.customer_user_id)
  const memberAov = memberOrders.length > 0
    ? memberOrders.reduce((s, o) => s + Number(o.total_amount), 0) / memberOrders.length
    : 0
  const guestAov = guestOrders.length > 0
    ? guestOrders.reduce((s, o) => s + Number(o.total_amount), 0) / guestOrders.length
    : 0

  return NextResponse.json({
    period_days: days,
    upsell: {
      revenue: upsellRevenue,
      order_count: upsellOrderCount,
      total_orders: totalOrderCount,
      acceptance_rate: acceptanceRate,
      aov_with_upsell: aovWithUpsell,
      aov_without_upsell: aovWithoutUpsell,
      aov_lift: aovWithUpsell - aovWithoutUpsell,
      top_items: topUpsellItems,
    },
    loyalty: {
      total_discount_given: totalDiscountGiven,
      redemption_order_count: redemptionOrderCount,
      points_earned: pointsEarned,
      points_redeemed: pointsNetRedeemed,
      points_gross_redeemed: pointsGrossRedeemed,
      points_refunded: pointsRefunded,
      active_members: activeMembers,
      member_aov: memberAov,
      guest_aov: guestAov,
      member_aov_lift: memberAov - guestAov,
      member_order_count: memberOrders.length,
      guest_order_count: guestOrders.length,
    },
  })
}
