import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('loyalty_programs')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

export async function POST(request: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { restaurant_id, ...fields } = body

  if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurant_id)
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!restaurant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('loyalty_programs')
    .upsert({
      restaurant_id,
      is_enabled: fields.is_enabled ?? false,
      program_name: fields.program_name ?? 'Rewards Club',
      points_per_dollar: fields.points_per_dollar ?? 1,
      points_to_redeem: fields.points_to_redeem ?? 100,
      minimum_points_to_redeem: fields.minimum_points_to_redeem ?? 100,
      welcome_bonus_points: fields.welcome_bonus_points ?? 0,
      birthday_bonus_points: fields.birthday_bonus_points ?? 0,
      points_expiry_days: fields.points_expiry_days ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'restaurant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
