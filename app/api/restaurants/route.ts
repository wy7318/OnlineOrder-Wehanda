import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, logo_url, address, created_at')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const restaurants = data ?? []
  if (restaurants.length === 0) return NextResponse.json([])

  // Fetch license statuses — admin client required (no user-level RLS on this table)
  const adminSupabase = createAdminClient()
  const { data: licenses } = await adminSupabase
    .from('restaurant_licenses')
    .select('restaurant_id, status, trial_ends_at')
    .in('restaurant_id', restaurants.map(r => r.id))

  const licenseMap = new Map((licenses ?? []).map(l => [l.restaurant_id, l]))

  const result = restaurants.map(r => {
    const lic = licenseMap.get(r.id)
    return {
      ...r,
      license_status: lic?.status ?? 'active',
      trial_ends_at: lic?.trial_ends_at ?? null,
    }
  })

  return NextResponse.json(result)
}
