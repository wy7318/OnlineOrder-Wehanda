import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!restaurant) return NextResponse.json({ accent_color: '#037FFC', template: 'modern' })

  const { data: ws } = await admin
    .from('restaurant_website_settings')
    .select('accent_color, template')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle()

  return NextResponse.json({
    accent_color: (ws?.accent_color as string | null) ?? '#037FFC',
    template: (ws?.template as string | null) ?? 'modern',
  })
}
