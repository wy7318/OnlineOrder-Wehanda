import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'

// Admin-only: list all restaurants with their Stripe status.
export async function GET() {
  const admin = await requirePlatformAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const restaurantIds = (data ?? []).map(r => r.id)
  const { data: settings } = await supabase
    .from('restaurant_payment_settings')
    .select('restaurant_id, stripe_enabled, stripe_mode, stripe_account_id, connected_at')
    .in('restaurant_id', restaurantIds)

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.restaurant_id, s]))

  const result = (data ?? []).map(r => ({
    ...r,
    payment_settings: settingsMap[r.id] ?? null,
  }))

  return NextResponse.json(result)
}
