import { createAdminClient } from '@/lib/supabase/admin'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function hourLabel(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function getLocalDow(isoStr: string, tz: string): number {
  try {
    const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date(isoStr))
    return DAY_NAMES.indexOf(day)
  } catch {
    return new Date(isoStr).getUTCDay()
  }
}

function getLocalHour(isoStr: string, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', hour12: false,
    }).formatToParts(new Date(isoStr))
    const h = parts.find(p => p.type === 'hour')?.value
    return h ? parseInt(h) % 24 : 0
  } catch {
    return new Date(isoStr).getUTCHours()
  }
}

function formatResTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export interface MonthlyReportData {
  restaurantName: string
  ownerEmail: string
  periodLabel: string // "May 2026"

  orders: {
    current: number
    prev: number
    changePct: number | null
    cancelledCount: number
    cancellationRatePct: number
    cancelledRevenueLost: number
  }

  revenue: {
    current: number
    prev: number
    changePct: number | null
    aovCurrent: number
    aovPrev: number
    aovChangePct: number | null
  }

  tips: {
    total: number
    avgPct: number
    prevAvgPct: number | null
    changePct: number | null
  }

  peakDays: Array<{ day: string; count: number; revenue: number }>
  peakHours: Array<{ hour: string; count: number }>

  topItems: Array<{ name: string; qty: number; revenue: number }>
  bottomItems: Array<{ name: string; qty: number; revenue: number }>
  topRevenueItems: Array<{ name: string; revenue: number }>

  upsell: {
    revenue: number
    orderCount: number
    totalOrders: number
    acceptanceRatePct: number
    aovWithUpsell: number
    aovWithoutUpsell: number
    aovLift: number
    topItems: Array<{ name: string; count: number; revenue: number }>
  } | null

  loyalty: {
    activeMembers: number
    totalDiscountGiven: number
    redemptionOrderCount: number
    pointsEarned: number
    pointsNetRedeemed: number
    memberAov: number
    guestAov: number
    memberAovLiftPct: number
  } | null

  reservations: {
    current: number
    prev: number
    changePct: number | null
    noShowCount: number
    noShowRatePct: number
    avgPartySize: number
    busiestSlots: Array<{ label: string; count: number }>
  } | null

  customers: {
    uniqueCount: number
    newCount: number
    returningCount: number
    repeatRatePct: number
    avgOrdersPerCustomer: number
  }

  insights: string[]
}

export async function buildMonthlyReport(
  restaurantId: string,
  periodStart: Date,  // e.g. May 1 00:00 UTC
  periodEnd: Date,    // e.g. Jun 1 00:00 UTC
  timezone = 'America/New_York',
): Promise<MonthlyReportData | null> {
  const supabase = createAdminClient()

  const prevStart = new Date(Date.UTC(
    periodStart.getUTCFullYear(),
    periodStart.getUTCMonth() - 1,
    1,
  ))
  const prevEnd = periodStart

  const ps = periodStart.toISOString()
  const pe = periodEnd.toISOString()
  const pps = prevStart.toISOString()
  const ppe = prevEnd.toISOString()
  const psDate = ps.split('T')[0]
  const peDate = pe.split('T')[0]
  const ppsDate = pps.split('T')[0]
  const ppeDate = ppe.split('T')[0]

  // Restaurant + owner email
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, owner_user_id')
    .eq('id', restaurantId)
    .single()
  if (!restaurant) return null

  const { data: ownerAuth } = await supabase.auth.admin.getUserById(restaurant.owner_user_id)
  const ownerEmail = ownerAuth?.user?.email
  if (!ownerEmail) return null

  // Parallel data fetch
  const [
    { data: currOrders },
    { data: prevOrders },
    { data: currReservations },
    { data: prevReservations },
    { data: allPrevCustomers },
    { data: loyaltyTxns },
  ] = await Promise.all([
    supabase.from('orders')
      .select('id, status, total_amount, subtotal, fee_amount, created_at, customer_id, customer_user_id, loyalty_discount_amount')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', ps).lt('created_at', pe)
      .limit(3000),
    supabase.from('orders')
      .select('id, status, total_amount, subtotal, fee_amount, customer_id')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', pps).lt('created_at', ppe)
      .limit(3000),
    supabase.from('reservations')
      .select('id, status, party_size, reservation_date, reservation_time')
      .eq('restaurant_id', restaurantId)
      .gte('reservation_date', psDate).lt('reservation_date', peDate)
      .limit(1000),
    supabase.from('reservations')
      .select('id, status')
      .eq('restaurant_id', restaurantId)
      .gte('reservation_date', ppsDate).lt('reservation_date', ppeDate)
      .limit(1000),
    // All customers who ordered BEFORE this period (for new vs returning split)
    supabase.from('orders')
      .select('customer_id')
      .eq('restaurant_id', restaurantId)
      .lt('created_at', ps)
      .not('customer_id', 'is', null)
      .limit(10000),
    supabase.from('loyalty_transactions')
      .select('customer_id, points_delta, type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', ps).lt('created_at', pe),
  ])

  const curr = currOrders ?? []
  const prev = prevOrders ?? []
  const nonCancelled = curr.filter(o => o.status !== 'cancelled')
  const prevNonCancelled = prev.filter(o => o.status !== 'cancelled')
  const cancelled = curr.filter(o => o.status === 'cancelled')

  // ── Revenue ──────────────────────────────────────────────────
  const currRevenue = nonCancelled.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const prevRevenue = prevNonCancelled.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const cancelledRevenue = cancelled.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const currAov = nonCancelled.length > 0 ? currRevenue / nonCancelled.length : 0
  const prevAov = prevNonCancelled.length > 0 ? prevRevenue / prevNonCancelled.length : 0

  // ── Tips ─────────────────────────────────────────────────────
  const currTipTotal = nonCancelled.reduce((s, o) => s + (o.fee_amount ?? 0), 0)
  const ordersWithTips = nonCancelled.filter(o => (o.fee_amount ?? 0) > 0 && (o.subtotal ?? 0) > 0)
  const prevOrdersWithTips = prevNonCancelled.filter(o => (o.fee_amount ?? 0) > 0 && (o.subtotal ?? 0) > 0)
  const currTipAvgPct = ordersWithTips.length > 0
    ? ordersWithTips.reduce((s, o) => s + (o.fee_amount / o.subtotal) * 100, 0) / ordersWithTips.length
    : 0
  const prevTipAvgPct = prevOrdersWithTips.length > 0
    ? prevOrdersWithTips.reduce((s, o) => s + (o.fee_amount / o.subtotal) * 100, 0) / prevOrdersWithTips.length
    : null

  // ── Peak days & hours ─────────────────────────────────────────
  const dayMap: Record<number, { count: number; revenue: number }> = {}
  const hourMap: Record<number, number> = {}
  for (const o of nonCancelled) {
    const dow = getLocalDow(o.created_at, timezone)
    const hr = getLocalHour(o.created_at, timezone)
    if (!dayMap[dow]) dayMap[dow] = { count: 0, revenue: 0 }
    dayMap[dow].count++
    dayMap[dow].revenue += o.total_amount ?? 0
    hourMap[hr] = (hourMap[hr] ?? 0) + 1
  }
  const peakDays = DAY_NAMES.map((day, i) => ({
    day,
    count: dayMap[i]?.count ?? 0,
    revenue: round2(dayMap[i]?.revenue ?? 0),
  })).sort((a, b) => b.count - a.count)

  const peakHours = Object.entries(hourMap)
    .map(([h, count]) => ({ hour: hourLabel(Number(h)), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Menu items + Upsell (single fetch shared by both) ─────────
  const nonCancelledIds = nonCancelled.map(o => o.id)
  let fetchedItems: Array<{
    item_name_snapshot: string
    quantity: number
    line_total: number
    added_from_upsell: boolean
    order_id: string
  }> = []
  if (nonCancelledIds.length > 0) {
    const { data } = await supabase
      .from('order_items')
      .select('item_name_snapshot, quantity, line_total, added_from_upsell, order_id')
      .in('order_id', nonCancelledIds)
      .limit(10000)
    fetchedItems = data ?? []
  }

  const itemMap: Record<string, { qty: number; revenue: number }> = {}
  for (const item of fetchedItems) {
    const k = item.item_name_snapshot
    if (!itemMap[k]) itemMap[k] = { qty: 0, revenue: 0 }
    itemMap[k].qty += item.quantity ?? 0
    itemMap[k].revenue += item.line_total ?? 0
  }
  const allItems = Object.entries(itemMap).map(([name, v]) => ({
    name, qty: v.qty, revenue: round2(v.revenue),
  }))
  const topItems = [...allItems].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const bottomItems = [...allItems].sort((a, b) => a.qty - b.qty).slice(0, 5)
  const topRevenueItems = [...allItems].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // ── Upsell ────────────────────────────────────────────────────
  const upsellItems = fetchedItems.filter(i => i.added_from_upsell)
  const upsellRevenue = round2(upsellItems.reduce((s, i) => s + Number(i.line_total), 0))
  const ordersWithUpsellSet = new Set(upsellItems.map(i => i.order_id))
  const upsellOrderCount = ordersWithUpsellSet.size
  const completedCount = nonCancelled.length

  const ordersWithUpsell = nonCancelled.filter(o => ordersWithUpsellSet.has(o.id))
  const ordersWithoutUpsell = nonCancelled.filter(o => !ordersWithUpsellSet.has(o.id))
  const upsellAov = ordersWithUpsell.length > 0
    ? ordersWithUpsell.reduce((s, o) => s + Number(o.total_amount), 0) / ordersWithUpsell.length
    : 0
  const nonUpsellAov = ordersWithoutUpsell.length > 0
    ? ordersWithoutUpsell.reduce((s, o) => s + Number(o.total_amount), 0) / ordersWithoutUpsell.length
    : 0

  const upsellItemMap: Record<string, { count: number; revenue: number }> = {}
  upsellItems.forEach(i => {
    const k = i.item_name_snapshot
    if (!upsellItemMap[k]) upsellItemMap[k] = { count: 0, revenue: 0 }
    upsellItemMap[k].count += 1
    upsellItemMap[k].revenue += Number(i.line_total)
  })
  const topUpsellItems = Object.entries(upsellItemMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 3)
    .map(([name, s]) => ({ name, count: s.count, revenue: round2(s.revenue) }))

  const upsellData: MonthlyReportData['upsell'] = completedCount > 0 ? {
    revenue: upsellRevenue,
    orderCount: upsellOrderCount,
    totalOrders: completedCount,
    acceptanceRatePct: Math.round((upsellOrderCount / completedCount) * 100),
    aovWithUpsell: round2(upsellAov),
    aovWithoutUpsell: round2(nonUpsellAov),
    aovLift: round2(upsellAov - nonUpsellAov),
    topItems: topUpsellItems,
  } : null

  // ── Loyalty ────────────────────────────────────────────────────
  const txns = loyaltyTxns ?? []
  const EARN_TYPES = new Set(['order_earn', 'welcome_bonus', 'birthday_bonus', 'manual_adjust'])
  const pointsEarned = txns
    .filter(t => EARN_TYPES.has(t.type) && t.points_delta > 0)
    .reduce((s, t) => s + t.points_delta, 0)
  const pointsGrossRedeemed = Math.abs(
    txns.filter(t => t.type === 'order_redeem').reduce((s, t) => s + t.points_delta, 0)
  )
  const pointsRefunded = txns
    .filter(t => t.type === 'order_refund')
    .reduce((s, t) => s + t.points_delta, 0)
  const pointsNetRedeemed = Math.max(0, pointsGrossRedeemed - pointsRefunded)
  const loyaltyActiveMembers = new Set(txns.map(t => t.customer_id)).size

  const totalDiscountGiven = round2(
    nonCancelled.reduce((s, o) => s + Number((o as { loyalty_discount_amount?: number }).loyalty_discount_amount ?? 0), 0)
  )
  const redemptionOrderCount = nonCancelled.filter(
    o => Number((o as { loyalty_discount_amount?: number }).loyalty_discount_amount ?? 0) > 0
  ).length

  const memberOrders = nonCancelled.filter(o => (o as { customer_user_id?: string }).customer_user_id)
  const guestOrders = nonCancelled.filter(o => !(o as { customer_user_id?: string }).customer_user_id)
  const memberAov = memberOrders.length > 0
    ? memberOrders.reduce((s, o) => s + Number(o.total_amount), 0) / memberOrders.length
    : 0
  const guestAov = guestOrders.length > 0
    ? guestOrders.reduce((s, o) => s + Number(o.total_amount), 0) / guestOrders.length
    : 0
  const memberAovLiftPct = guestAov > 0
    ? Math.round(((memberAov - guestAov) / guestAov) * 100)
    : 0

  const loyaltyData: MonthlyReportData['loyalty'] = loyaltyActiveMembers > 0 || totalDiscountGiven > 0 ? {
    activeMembers: loyaltyActiveMembers,
    totalDiscountGiven,
    redemptionOrderCount,
    pointsEarned,
    pointsNetRedeemed,
    memberAov: round2(memberAov),
    guestAov: round2(guestAov),
    memberAovLiftPct,
  } : null

  // ── Reservations ──────────────────────────────────────────────
  const currRes = currReservations ?? []
  const prevRes = prevReservations ?? []
  let reservations: MonthlyReportData['reservations'] = null
  if (currRes.length > 0 || prevRes.length > 0) {
    const active = currRes.filter(r => r.status !== 'cancelled' && r.status !== 'declined')
    const noShows = currRes.filter(r => r.status === 'no_show').length
    const noShowRate = active.length > 0 ? Math.round((noShows / active.length) * 100) : 0
    const avgPartySize = currRes.length > 0
      ? Math.round(currRes.reduce((s, r) => s + (r.party_size ?? 0), 0) / currRes.length * 10) / 10
      : 0
    const slotMap: Record<string, number> = {}
    for (const r of active) {
      const label = formatResTime(r.reservation_time)
      slotMap[label] = (slotMap[label] ?? 0) + 1
    }
    const busiestSlots = Object.entries(slotMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    reservations = {
      current: currRes.length,
      prev: prevRes.length,
      changePct: pctChange(currRes.length, prevRes.length),
      noShowCount: noShows,
      noShowRatePct: noShowRate,
      avgPartySize,
      busiestSlots,
    }
  }

  // ── Customers ─────────────────────────────────────────────────
  const prevCustIdSet = new Set(
    (allPrevCustomers ?? []).map(o => o.customer_id).filter(Boolean)
  )
  const currCustIds = nonCancelled.filter(o => o.customer_id).map(o => o.customer_id as string)
  const uniqueCustSet = new Set(currCustIds)
  const newCustomers = [...uniqueCustSet].filter(id => !prevCustIdSet.has(id))
  const returningCustomers = [...uniqueCustSet].filter(id => prevCustIdSet.has(id))
  const repeatRatePct = uniqueCustSet.size > 0
    ? Math.round((returningCustomers.length / uniqueCustSet.size) * 100)
    : 0
  const avgOrdersPerCustomer = uniqueCustSet.size > 0
    ? Math.round((currCustIds.length / uniqueCustSet.size) * 10) / 10
    : 0

  // ── Insights ──────────────────────────────────────────────────
  const insights: string[] = []

  if (peakDays.length >= 2 && peakDays[0].count > 0) {
    const busiest = peakDays[0]
    const weakest = peakDays[peakDays.length - 1]
    if (weakest.count < busiest.count * 0.5) {
      insights.push(`${weakest.day}s are your slowest day (${weakest.count} orders vs ${busiest.count} on ${busiest.day}s). A ${weakest.day} special could help fill that gap.`)
    }
  }

  if (reservations && reservations.noShowRatePct > 10) {
    insights.push(`No-show rate was ${reservations.noShowRatePct}% this month (${reservations.noShowCount} no-shows). Sending a reminder message 24 hours before each reservation can cut this significantly.`)
  }

  if (uniqueCustSet.size >= 5 && repeatRatePct < 25) {
    insights.push(`Only ${repeatRatePct}% of customers came back this month. A simple loyalty punch card or a follow-up message after their first order could meaningfully improve retention.`)
  }

  const fmtCurrency = (n: number) => `$${n.toFixed(2)}`

  if (upsellData && upsellData.aovLift > 1 && upsellData.acceptanceRatePct < 30) {
    insights.push(`Upsells boosted avg. order value by ${fmtCurrency(upsellData.aovLift)} per order, but only ${upsellData.acceptanceRatePct}% of orders included one. Review which items are being suggested and consider enabling upsells on your top sellers.`)
  }

  if (loyaltyData && loyaltyData.memberAovLiftPct > 10) {
    insights.push(`Loyalty members spent ${loyaltyData.memberAovLiftPct}% more per order than guests (${fmtCurrency(loyaltyData.memberAov)} vs ${fmtCurrency(loyaltyData.guestAov)}). Growing your member base could meaningfully lift overall revenue.`)
  }

  if (prevAov > 0) {
    const aovDiff = pctChange(currAov, prevAov)
    if (aovDiff !== null && aovDiff <= -10) {
      insights.push(`Average order value dropped ${Math.abs(aovDiff)}% vs. last month ($${currAov.toFixed(2)} vs $${prevAov.toFixed(2)}). Consider combo deals or upsell prompts at checkout.`)
    }
  }

  const periodLabel = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1))
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return {
    restaurantName: restaurant.name,
    ownerEmail: ownerEmail,
    periodLabel,
    orders: {
      current: curr.length,
      prev: prev.length,
      changePct: pctChange(curr.length, prev.length),
      cancelledCount: cancelled.length,
      cancellationRatePct: curr.length > 0 ? Math.round((cancelled.length / curr.length) * 100) : 0,
      cancelledRevenueLost: round2(cancelledRevenue),
    },
    revenue: {
      current: round2(currRevenue),
      prev: round2(prevRevenue),
      changePct: pctChange(currRevenue, prevRevenue),
      aovCurrent: round2(currAov),
      aovPrev: round2(prevAov),
      aovChangePct: pctChange(currAov, prevAov),
    },
    tips: {
      total: round2(currTipTotal),
      avgPct: Math.round(currTipAvgPct * 10) / 10,
      prevAvgPct: prevTipAvgPct !== null ? Math.round(prevTipAvgPct * 10) / 10 : null,
      changePct: prevTipAvgPct !== null ? pctChange(currTipAvgPct, prevTipAvgPct) : null,
    },
    peakDays,
    peakHours,
    topItems,
    bottomItems,
    topRevenueItems,
    upsell: upsellData,
    loyalty: loyaltyData,
    reservations,
    customers: {
      uniqueCount: uniqueCustSet.size,
      newCount: newCustomers.length,
      returningCount: returningCustomers.length,
      repeatRatePct,
      avgOrdersPerCustomer,
    },
    insights: insights.slice(0, 2),
  }
}
