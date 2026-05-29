import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called fire-and-forget from the public portal whenever a logged-in customer's
// cart changes (debounced to 2 seconds). Persists the cart so the abandonment
// cron can detect it later.
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { restaurant_id, items } = body ?? {}
  if (!restaurant_id) return NextResponse.json({ ok: false }, { status: 400 })

  const admin = createAdminClient()

  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ ok: false }, { status: 401 })

  const safeItems = Array.isArray(items) ? items : []

  if (safeItems.length === 0) {
    // Empty cart — remove the record entirely so the cron ignores it
    await admin
      .from('active_carts')
      .delete()
      .eq('restaurant_id', restaurant_id)
      .eq('auth_user_id', user.id)
  } else {
    // Upsert the cart; clear abandoned_at so a re-engaged cart won't fire again
    await admin.from('active_carts').upsert(
      {
        restaurant_id,
        auth_user_id: user.id,
        items: safeItems,
        updated_at: new Date().toISOString(),
        abandoned_at: null,
      },
      { onConflict: 'restaurant_id,auth_user_id' }
    )
  }

  return NextResponse.json({ ok: true })
}
