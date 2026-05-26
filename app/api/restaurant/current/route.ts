import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null)

  const cookieStore = await cookies()
  const selectedId = cookieStore.get('selected_restaurant_id')?.value

  let restaurant = null

  if (selectedId) {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', selectedId)
      .eq('owner_user_id', user.id)
      .single()
    restaurant = data ?? null
  }

  if (!restaurant) {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    restaurant = data ?? null
  }

  if (!restaurant) return NextResponse.json(null)

  // Fetch license using admin client (restaurant owners have no direct RLS access)
  const adminSupabase = createAdminClient()
  const { data: license } = await adminSupabase
    .from('restaurant_licenses')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle()

  return NextResponse.json({ ...restaurant, restaurant_licenses: license ?? null })
}
