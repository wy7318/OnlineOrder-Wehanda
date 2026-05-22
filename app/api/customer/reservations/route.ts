import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')

  const admin = createAdminClient()

  // Get phone for fallback matching of pre-auth / guest reservations
  const { data: profile } = await admin
    .from('customer_profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle()

  let query = admin
    .from('reservations')
    .select('*')
    .order('reservation_date', { ascending: false })
    .order('reservation_time', { ascending: false })

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  // Match by user_id (online bookings) OR phone (pre-auth/guest bookings with same number)
  if (profile?.phone) {
    query = query.or(`customer_user_id.eq.${user.id},customer_phone.eq.${profile.phone}`)
  } else {
    query = query.eq('customer_user_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
