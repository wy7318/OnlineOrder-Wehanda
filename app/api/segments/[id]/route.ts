import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (body.name)        update.name        = body.name.trim()
  if (body.description !== undefined) update.description = body.description
  if (body.color)       update.color       = body.color

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customer_segments')
    .update(update)
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('customer_segments')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .eq('is_system', false) // protect system segments

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
