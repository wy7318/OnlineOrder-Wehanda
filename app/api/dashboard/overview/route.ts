import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Period = 'today' | 'yesterday' | 'this_week'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getPeriodBounds(period: Period): {
  periodStart: Date; periodEnd: Date; priorStart: Date; priorEnd: Date; priorLabel: string
} {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'today') {
    // Compare to same day last week at same elapsed time
    const elapsed = now.getTime() - todayStart.getTime()
    const priorStart = new Date(todayStart)
    priorStart.setDate(priorStart.getDate() - 7)
    const priorEnd = new Date(priorStart.getTime() + elapsed)
    return {
      periodStart: todayStart, periodEnd: now,
      priorStart, priorEnd,
      priorLabel: `Last ${DAY_NAMES[priorStart.getDay()]}`,
    }
  }

  if (period === 'yesterday') {
    const yStart = new Date(todayStart)
    yStart.setDate(yStart.getDate() - 1)
    // Compare to same day last week
    const priorStart = new Date(yStart)
    priorStart.setDate(priorStart.getDate() - 7)
    const priorEnd = new Date(priorStart)
    priorEnd.setDate(priorEnd.getDate() + 1)
    return {
      periodStart: yStart, periodEnd: todayStart,
      priorStart, priorEnd,
      priorLabel: `Last ${DAY_NAMES[priorStart.getDay()]}`,
    }
  }

  // this_week: Monday 00:00 to now, vs prior week Mon–same day
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - dow)
  const priorWeekStart = new Date(weekStart)
  priorWeekStart.setDate(priorWeekStart.getDate() - 7)
  return {
    periodStart: weekStart, periodEnd: now,
    priorStart: priorWeekStart, priorEnd: weekStart,
    priorLabel: 'Last Week',
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? 'today') as Period

  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, daily_revenue_target')
    .eq('owner_user_id', user.id)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const { periodStart, periodEnd, priorStart, priorEnd, priorLabel } = getPeriodBounds(period)

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

  const admin = createAdminClient()
  const { error } = await admin
    .from('restaurants')
    .update({ daily_revenue_target })
    .eq('owner_user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
