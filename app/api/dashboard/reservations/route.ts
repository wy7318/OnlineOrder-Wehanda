import { NextResponse } from 'next/server'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInTz, shiftDays } from '@/lib/utils/timezone'

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, timezone')
    .eq('id', ctx.restaurantId)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const tz = restaurant.timezone ?? 'America/New_York'
  const now = new Date()
  const todayStr = todayInTz(tz, now)
  const weekEndStr = shiftDays(todayStr, 6)

  const { data: reservations, error } = await admin
    .from('reservations')
    .select('id, customer_name, customer_phone, party_size, reservation_date, reservation_time, status, notes')
    .eq('restaurant_id', ctx.restaurantId)
    .gte('reservation_date', todayStr)
    .lte('reservation_date', weekEndStr)
    .not('status', 'in', '(cancelled,declined)')
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = reservations ?? []
  const today = all.filter(r => r.reservation_date === todayStr)

  // Day-by-day summary for next 7 days
  const dayMap: Record<string, { count: number; covers: number }> = {}
  for (let i = 0; i <= 6; i++) {
    dayMap[shiftDays(todayStr, i)] = { count: 0, covers: 0 }
  }
  for (const r of all) {
    if (dayMap[r.reservation_date]) {
      dayMap[r.reservation_date].count++
      dayMap[r.reservation_date].covers += r.party_size
    }
  }
  const next_7_days = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }))

  return NextResponse.json({
    today,
    stats: {
      today_total: today.length,
      today_confirmed: today.filter(r => r.status === 'confirmed').length,
      today_pending: today.filter(r => r.status === 'pending').length,
      today_no_show: today.filter(r => r.status === 'no_show').length,
      today_covers: today.reduce((s, r) => s + r.party_size, 0),
      this_week_total: all.length,
      this_week_covers: all.reduce((s, r) => s + r.party_size, 0),
      next_7_days,
    },
  })
}
