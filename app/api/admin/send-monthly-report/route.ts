import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildMonthlyReport } from '@/lib/reports/monthlyData'
import { monthlyReportEmail } from '@/lib/email/monthlyReport'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminRow } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { restaurant_id, year, month } = body  // month is 1-indexed (1=Jan … 12=Dec)
  if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('timezone')
    .eq('id', restaurant_id)
    .single()

  const now = new Date()
  const y = typeof year === 'number' ? year : now.getUTCFullYear()
  const m = typeof month === 'number' ? month - 1 : now.getUTCMonth()  // convert to 0-indexed
  const periodStart = new Date(Date.UTC(y, m, 1))
  const periodEnd   = new Date(Date.UTC(y, m + 1, 1))

  const data = await buildMonthlyReport(
    restaurant_id,
    periodStart,
    periodEnd,
    restaurant?.timezone ?? 'America/New_York',
  )

  if (!data) {
    return NextResponse.json({ error: 'No data available for this restaurant' }, { status: 404 })
  }

  const { subject, html } = monthlyReportEmail(data)
  await sendEmail({ to: data.ownerEmail, subject, html })

  return NextResponse.json({
    sent: true,
    email: data.ownerEmail,
    period: periodStart.toISOString().slice(0, 7),
  })
}
