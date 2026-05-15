import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { segment_id } = await request.json()
  if (!segment_id) return NextResponse.json({ error: 'segment_id is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify segment belongs to this restaurant
  const { data: seg } = await admin
    .from('customer_segments')
    .select('id')
    .eq('id', segment_id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  if (!seg) return NextResponse.json({ error: 'Segment not found' }, { status: 404 })

  const { data, error } = await admin
    .from('customer_segment_members')
    .upsert({
      segment_id,
      customer_id: id,
      restaurant_id: ctx.restaurantId,
      added_by: ctx.userId,
    }, { onConflict: 'segment_id,customer_id', ignoreDuplicates: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
