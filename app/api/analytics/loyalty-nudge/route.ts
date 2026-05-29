import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch the loyalty program config
  const { data: program } = await admin
    .from('loyalty_programs')
    .select('is_enabled, program_name, points_to_redeem, minimum_points_to_redeem')
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  if (!program?.is_enabled) {
    return NextResponse.json({ enabled: false, eligible_customers: [] })
  }

  const threshold = program.minimum_points_to_redeem ?? 0

  // Find customers who have points but haven't reached the redemption minimum —
  // specifically those within 80% of the threshold (i.e. close but not there yet)
  // plus those who ARE over the threshold but haven't ordered in 14+ days.
  const { data: customers, error } = await admin
    .from('customers')
    .select('id, first_name, last_name, name, email, phone, loyalty_points_balance, last_seen_at')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('is_blocked', false)
    .gt('loyalty_points_balance', 0)
    .order('loyalty_points_balance', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const staleCutoff = new Date(Date.now() - 14 * 86_400_000).toISOString()

  const eligible = (customers ?? [])
    .map(c => {
      const bal = c.loyalty_points_balance ?? 0
      const pctOfThreshold = threshold > 0 ? bal / threshold : 1
      const isAboveThreshold = bal >= threshold
      const isStale = !c.last_seen_at || c.last_seen_at < staleCutoff
      const pointsNeeded = Math.max(0, threshold - bal)

      // Include if: close to threshold (≥80%) OR already redeemable but hasn't been in recently
      if (pctOfThreshold < 0.8 && !(isAboveThreshold && isStale)) return null

      const displayName = c.first_name
        ? [c.first_name, c.last_name].filter(Boolean).join(' ')
        : c.name

      return {
        id: c.id,
        name: displayName,
        phone: c.phone,
        email: c.email,
        loyalty_points_balance: bal,
        points_needed: pointsNeeded,
        pct_of_threshold: Math.round(pctOfThreshold * 100),
        is_redeemable: isAboveThreshold,
        last_seen_at: c.last_seen_at,
        nudge_reason: isAboveThreshold && isStale
          ? 'has_redeemable_points'
          : 'close_to_threshold',
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Redeemable customers first, then by proximity to threshold desc
      if (a!.is_redeemable !== b!.is_redeemable) return a!.is_redeemable ? -1 : 1
      return b!.pct_of_threshold - a!.pct_of_threshold
    })
    .slice(0, 100)

  return NextResponse.json({
    enabled: true,
    program: {
      program_name: program.program_name,
      minimum_points_to_redeem: threshold,
      points_to_redeem: program.points_to_redeem,
    },
    eligible_count: eligible.length,
    eligible_customers: eligible,
  })
}
