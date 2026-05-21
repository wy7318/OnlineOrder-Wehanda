import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'
import { midnightUTC, todayInTz, startOfToday, shiftDays, weekdayName, dayOfWeekInTz } from '@/lib/utils/timezone'

type Period = 'today' | 'yesterday' | 'this_week'

function getPeriodBounds(period: Period, tz: string) {
  const now = new Date()
  const todayStr = todayInTz(tz, now)
  const todayStart = startOfToday(tz, now)

  if (period === 'today') {
    const elapsed = now.getTime() - todayStart.getTime()
    const priorStr = shiftDays(todayStr, -7)
    const priorStart = midnightUTC(priorStr, tz)
    const priorEnd = new Date(priorStart.getTime() + elapsed)
    return {
      periodStart: todayStart, periodEnd: now,
      priorStart, priorEnd,
      priorLabel: `Last ${weekdayName(priorStr, tz)}`,
    }
  }

  if (period === 'yesterday') {
    const yStr = shiftDays(todayStr, -1)
    const yStart = midnightUTC(yStr, tz)
    const priorStr = shiftDays(yStr, -7)
    const priorStart = midnightUTC(priorStr, tz)
    const priorEnd = midnightUTC(shiftDays(priorStr, 1), tz)
    return {
      periodStart: yStart, periodEnd: todayStart,
      priorStart, priorEnd,
      priorLabel: `Last ${weekdayName(priorStr, tz)}`,
    }
  }

  // this_week: Monday 00:00 to now vs prior week Mon–same weekday
  const dow = dayOfWeekInTz(todayStr, tz) // 0=Sun … 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  const weekStartStr = shiftDays(todayStr, -daysFromMonday)
  const weekStart = midnightUTC(weekStartStr, tz)
  const priorWeekStart = midnightUTC(shiftDays(weekStartStr, -7), tz)
  return {
    periodStart: weekStart, periodEnd: now,
    priorStart: priorWeekStart, priorEnd: weekStart,
    priorLabel: 'Last Week',
  }
}

export async function GET(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? 'today') as Period

  const admin = createAdminClient()
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, slug, timezone, daily_revenue_target')
    .eq('id', ctx.restaurantId)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const tz = restaurant.timezone ?? 'America/New_York'
  const { periodStart, periodEnd, priorStart, priorEnd, priorLabel } = getPeriodBounds(period, tz)

  const { data: overview, error } = await admin.rpc('get_dashboard_overview', {
    p_restaurant_id: restaurant.id,
    p_period_start: periodStart.toISOString(),
    p_period_end: periodEnd.toISOString(),
    p_prior_start: priorStart.toISOString(),
    p_prior_end: priorEnd.toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      daily_revenue_target: restaurant.daily_revenue_target ?? null,
    },
    period,
    prior_label: priorLabel,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    overview,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { daily_revenue_target } = body

  if (typeof daily_revenue_target !== 'number' && daily_revenue_target !== null) {
    return NextResponse.json({ error: 'daily_revenue_target must be a number or null' }, { status: 400 })
  }

  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('restaurants')
    .update({ daily_revenue_target })
    .eq('id', ctx.restaurantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
