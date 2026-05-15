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
  const base = admin
    .from('orders')
    .select('*, order_items(*, order_item_options(*))')
    .eq('customer_user_id', user.id)
    .order('created_at', { ascending: false })

  const { data, error } = await (restaurantId ? base.eq('restaurant_id', restaurantId) : base)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
