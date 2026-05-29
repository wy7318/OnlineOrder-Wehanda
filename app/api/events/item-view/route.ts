import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Lightweight endpoint called fire-and-forget from the public portal whenever
// a logged-in customer opens an item detail modal.
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { restaurant_id, menu_item_id } = body ?? {}
  if (!restaurant_id || !menu_item_id) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the token belongs to a real customer
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ ok: false }, { status: 401 })

  // Resolve the CRM customer_id for this user + restaurant
  const { data: customer } = await admin
    .from('customers')
    .select('id')
    .eq('restaurant_id', restaurant_id)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!customer) return NextResponse.json({ ok: true }) // guest — no CRM record to attach to

  // Insert event — ignore duplicate errors (e.g. viewing same item twice in a session)
  await admin.from('customer_events').insert({
    customer_id: customer.id,
    restaurant_id,
    event_type: 'item_viewed',
    event_at: new Date().toISOString(),
    recorded_at: new Date().toISOString(),
    source_id: menu_item_id,
    device_type: 'mobile_web',
    metadata: { menu_item_id },
  })

  return NextResponse.json({ ok: true })
}
