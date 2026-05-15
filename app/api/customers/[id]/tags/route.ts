import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { tag } = await request.json()
  if (!tag?.trim()) return NextResponse.json({ error: 'tag is required' }, { status: 400 })

  const admin = createAdminClient()

  // Append tag if not already present
  const { data: customer } = await admin
    .from('customers')
    .select('tags')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const current: string[] = customer.tags ?? []
  if (current.includes(tag.trim())) return NextResponse.json({ tags: current })

  const tags = [...current, tag.trim()]
  const { data, error } = await admin
    .from('customers')
    .update({ tags })
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select('tags')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
