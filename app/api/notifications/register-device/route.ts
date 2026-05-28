import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { expo_push_token, platform } = body as { expo_push_token?: string; platform?: string }

  if (!expo_push_token || typeof expo_push_token !== 'string') {
    return NextResponse.json({ error: 'Missing expo_push_token' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the restaurant owned by this user
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'No restaurant found for this user' }, { status: 404 })
  }

  // Upsert on the token itself — each physical device gets one row, and
  // re-registration (e.g. after app reinstall) just refreshes the timestamp.
  await admin.from('device_push_tokens').upsert(
    {
      expo_push_token,
      user_id: user.id,
      restaurant_id: restaurant.id,
      platform: platform ?? 'unknown',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' }
  )

  return NextResponse.json({ ok: true })
}
