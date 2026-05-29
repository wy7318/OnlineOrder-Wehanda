import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('campaign_automation_settings')
    .select('*')
    .eq('restaurant_id', ctx.restaurantId)
    .maybeSingle()

  return NextResponse.json({
    birthday_enabled: data?.birthday_enabled ?? true,
    after_order_enabled: data?.after_order_enabled ?? true,
    quiet_day_enabled: data?.quiet_day_enabled ?? true,
    milestone_enabled: data?.milestone_enabled ?? true,
    new_item_enabled: data?.new_item_enabled ?? true,
  })
}

export async function POST(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const allowed = [
    'birthday_enabled', 'after_order_enabled', 'quiet_day_enabled',
    'milestone_enabled', 'new_item_enabled',
  ]
  const patch: Record<string, boolean> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'boolean') patch[key] = body[key]
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('campaign_automation_settings')
    .upsert({ restaurant_id: ctx.restaurantId, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
