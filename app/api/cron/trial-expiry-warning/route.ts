import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { trialExpiryWarningEmail } from '@/lib/email/trialExpiryWarning'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Find trials expiring exactly 7 calendar days from today (UTC window)
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 0, 0, 0, 0))
  const windowEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 23, 59, 59, 999))

  const { data: licenses, error: licErr } = await supabase
    .from('restaurant_licenses')
    .select('restaurant_id, trial_ends_at')
    .eq('status', 'trial')
    .gte('trial_ends_at', windowStart.toISOString())
    .lte('trial_ends_at', windowEnd.toISOString())

  if (licErr) {
    console.error('[trial-expiry-warning] license query failed:', licErr)
    return NextResponse.json({ error: licErr.message }, { status: 500 })
  }

  if (!licenses || licenses.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No trials expiring in 7 days' })
  }

  // Fetch restaurant details for each expiring license
  const restaurantIds = licenses.map(l => l.restaurant_id)
  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id, name, email, owner_user_id')
    .in('id', restaurantIds)

  if (rErr) {
    console.error('[trial-expiry-warning] restaurant query failed:', rErr)
    return NextResponse.json({ error: rErr.message }, { status: 500 })
  }

  const restaurantMap = new Map((restaurants ?? []).map(r => [r.id, r]))

  // Fetch owner auth emails for restaurants whose contact email is missing
  const missingEmailOwnerIds = (restaurants ?? [])
    .filter(r => !r.email)
    .map(r => r.owner_user_id)

  const ownerEmailMap = new Map<string, string>()
  for (const ownerId of missingEmailOwnerIds) {
    const { data: ownerData } = await supabase.auth.admin.getUserById(ownerId)
    if (ownerData.user?.email) ownerEmailMap.set(ownerId, ownerData.user.email)
  }

  const results: Array<{ restaurantId: string; status: string; email?: string }> = []

  for (const license of licenses) {
    const restaurant = restaurantMap.get(license.restaurant_id)
    if (!restaurant) {
      results.push({ restaurantId: license.restaurant_id, status: 'skipped_not_found' })
      continue
    }

    const toEmail = restaurant.email || ownerEmailMap.get(restaurant.owner_user_id)
    if (!toEmail) {
      results.push({ restaurantId: license.restaurant_id, status: 'skipped_no_email' })
      continue
    }

    const trialEndsAt = new Date(license.trial_ends_at)
    const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const trialEndsOn = trialEndsAt.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })

    try {
      const { subject, html } = trialExpiryWarningEmail({
        restaurantName: restaurant.name,
        daysLeft,
        trialEndsOn,
      })
      await sendEmail({ to: toEmail, subject, html })
      results.push({ restaurantId: license.restaurant_id, status: 'sent', email: toEmail })
    } catch (err) {
      console.error(`[trial-expiry-warning] failed for ${license.restaurant_id}:`, err)
      results.push({ restaurantId: license.restaurant_id, status: 'error' })
    }
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results })
}
