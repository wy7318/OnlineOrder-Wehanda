import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') ?? '90')))
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const admin = createAdminClient()

  const { data: reservations, error } = await admin
    .from('reservations')
    .select('id, status, reservation_date, reservation_time, party_size, customer_name, customer_phone, customer_user_id')
    .eq('restaurant_id', ctx.restaurantId)
    .gte('reservation_date', since)
    .in('status', ['confirmed', 'completed', 'no_show', 'declined', 'cancelled'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = reservations ?? []
  // Only count confirmed/completed/no_show for rate calculations
  const countable = all.filter(r => ['confirmed', 'completed', 'no_show'].includes(r.status))
  const noShows = countable.filter(r => r.status === 'no_show')

  const total = countable.length
  const noShowCount = noShows.length
  const noShowRate = total > 0 ? noShowCount / total : 0

  // ── By day of week ────────────────────────────────────────────────────────
  const byDay: Record<number, { count: number; no_show: number }> = {}
  for (const r of countable) {
    const dow = new Date(r.reservation_date + 'T12:00:00').getDay()
    if (!byDay[dow]) byDay[dow] = { count: 0, no_show: 0 }
    byDay[dow].count++
    if (r.status === 'no_show') byDay[dow].no_show++
  }
  const byDayOfWeek = Object.entries(byDay).map(([dow, d]) => ({
    dow: Number(dow),
    label: DAY_LABELS[Number(dow)],
    count: d.count,
    no_show_count: d.no_show,
    rate: d.count > 0 ? Math.round((d.no_show / d.count) * 1000) / 10 : 0,
  })).sort((a, b) => a.dow - b.dow)

  // ── By party size ─────────────────────────────────────────────────────────
  const bySize: Record<number, { count: number; no_show: number }> = {}
  for (const r of countable) {
    const s = r.party_size
    if (!bySize[s]) bySize[s] = { count: 0, no_show: 0 }
    bySize[s].count++
    if (r.status === 'no_show') bySize[s].no_show++
  }
  const byPartySize = Object.entries(bySize).map(([size, d]) => ({
    party_size: Number(size),
    count: d.count,
    no_show_count: d.no_show,
    rate: d.count > 0 ? Math.round((d.no_show / d.count) * 1000) / 10 : 0,
  })).sort((a, b) => a.party_size - b.party_size)

  // ── By time slot (hour) ───────────────────────────────────────────────────
  const byHour: Record<number, { count: number; no_show: number }> = {}
  for (const r of countable) {
    const hour = parseInt(r.reservation_time.slice(0, 2))
    if (!byHour[hour]) byHour[hour] = { count: 0, no_show: 0 }
    byHour[hour].count++
    if (r.status === 'no_show') byHour[hour].no_show++
  }
  const byTimeSlot = Object.entries(byHour).map(([h, d]) => {
    const hour = Number(h)
    const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
    return {
      hour,
      label,
      count: d.count,
      no_show_count: d.no_show,
      rate: d.count > 0 ? Math.round((d.no_show / d.count) * 1000) / 10 : 0,
    }
  }).sort((a, b) => a.hour - b.hour)

  // ── Repeat offenders (2+ no-shows) ───────────────────────────────────────
  const offenderMap: Record<string, { name: string; phone: string; count: number }> = {}
  for (const r of noShows) {
    const key = r.customer_phone ?? r.customer_name
    if (!offenderMap[key]) offenderMap[key] = { name: r.customer_name, phone: r.customer_phone ?? '', count: 0 }
    offenderMap[key].count++
  }
  const repeatOffenders = Object.values(offenderMap)
    .filter(o => o.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Monthly trend ─────────────────────────────────────────────────────────
  const byMonth: Record<string, { count: number; no_show: number }> = {}
  for (const r of countable) {
    const month = r.reservation_date.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { count: 0, no_show: 0 }
    byMonth[month].count++
    if (r.status === 'no_show') byMonth[month].no_show++
  }
  const monthlyTrend = Object.entries(byMonth).map(([month, d]) => ({
    month,
    count: d.count,
    no_show_count: d.no_show,
    rate: d.count > 0 ? Math.round((d.no_show / d.count) * 1000) / 10 : 0,
  })).sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json({
    period_days: days,
    total_reservations: total,
    total_no_shows: noShowCount,
    no_show_rate: Math.round(noShowRate * 1000) / 10,
    by_day_of_week: byDayOfWeek,
    by_party_size: byPartySize,
    by_time_slot: byTimeSlot,
    repeat_offenders: repeatOffenders,
    monthly_trend: monthlyTrend,
  })
}
