import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const ctx = await requirePlatformAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { restaurantId } = await params
  const body = await request.json()

  const allowed = [
    'status', 'feature_menu', 'feature_orders', 'feature_reservations',
    'feature_customers', 'feature_analytics', 'feature_revenue_boost',
    'trial_ends_at', 'notes',
  ]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('restaurant_licenses')
    .upsert({ restaurant_id: restaurantId, ...update }, { onConflict: 'restaurant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
