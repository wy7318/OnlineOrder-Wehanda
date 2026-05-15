import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; tag: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, tag } = await params
  const admin = createAdminClient()

  const { data: customer } = await admin
    .from('customers')
    .select('tags')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tags = (customer.tags ?? []).filter((t: string) => t !== decodeURIComponent(tag))

  const { data, error } = await admin
    .from('customers')
    .update({ tags })
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select('tags')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
