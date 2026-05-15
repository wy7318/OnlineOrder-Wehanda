import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { flag_type, source = 'self_reported' } = await request.json()
  if (!flag_type) return NextResponse.json({ error: 'flag_type is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('customer_dietary_flags')
    .upsert(
      { customer_id: id, restaurant_id: ctx.restaurantId, flag_type, source },
      { onConflict: 'customer_id,flag_type', ignoreDuplicates: true }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
