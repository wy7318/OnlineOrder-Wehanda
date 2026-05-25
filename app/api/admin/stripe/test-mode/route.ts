import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'

// Admin-only: toggle stripe_mode (test/live) for a specific restaurant.
export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { restaurant_id, mode } = await request.json()
  if (!restaurant_id || !['live', 'test'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('restaurant_payment_settings')
    .upsert(
      { restaurant_id, stripe_mode: mode, updated_at: new Date().toISOString() },
      { onConflict: 'restaurant_id' }
    )
    .select('restaurant_id, stripe_mode, stripe_enabled')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
