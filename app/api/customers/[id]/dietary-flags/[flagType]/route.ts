import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; flagType: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, flagType } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('customer_dietary_flags')
    .delete()
    .eq('customer_id', id)
    .eq('flag_type', flagType)
    .eq('restaurant_id', ctx.restaurantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
