import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildMonthlyReport } from '@/lib/reports/monthlyData'
import { monthlyReportEmail } from '@/lib/email/monthlyReport'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  // Verify Vercel cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const singleRestaurantId = searchParams.get('restaurant_id') ?? null

  // Period: last calendar month
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const supabase = createAdminClient()

  // Fetch restaurants to report on
  let restaurantQuery = supabase
    .from('restaurants')
    .select('id, timezone')
    .eq('is_active', true)

  if (singleRestaurantId) {
    restaurantQuery = restaurantQuery.eq('id', singleRestaurantId)
  }

  const { data: restaurants, error: listError } = await restaurantQuery
  if (listError) {
    console.error('[monthly-report] failed to list restaurants:', listError)
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const results: Array<{ restaurantId: string; status: string; email?: string }> = []

  for (const restaurant of restaurants ?? []) {
    try {
      const data = await buildMonthlyReport(
        restaurant.id,
        periodStart,
        periodEnd,
        restaurant.timezone ?? 'America/New_York',
      )

      if (!data) {
        results.push({ restaurantId: restaurant.id, status: 'skipped_no_data' })
        continue
      }

      const { subject, html } = monthlyReportEmail(data)
      await sendEmail({ to: data.ownerEmail, subject, html })

      results.push({ restaurantId: restaurant.id, status: 'sent', email: data.ownerEmail })
    } catch (err) {
      console.error(`[monthly-report] error for restaurant ${restaurant.id}:`, err)
      results.push({ restaurantId: restaurant.id, status: 'error' })
    }
  }

  return NextResponse.json({
    period: `${periodStart.toISOString().slice(0, 7)}`,
    processed: results.length,
    results,
  })
}
