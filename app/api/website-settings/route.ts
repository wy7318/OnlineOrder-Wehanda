import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantContext } from '@/lib/utils/restaurant-auth'

export async function GET() {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('restaurant_website_settings')
    .select('*')
    .eq('restaurant_id', ctx.restaurantId)
    .maybeSingle()

  return NextResponse.json(data ?? {})
}

export async function PATCH(request: Request) {
  const ctx = await getRestaurantContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const allowed = [
    'hero_headline', 'hero_subheadline', 'about_title', 'about_body',
    'accent_color', 'gallery_urls', 'seo_meta_description', 'seo_keywords',
    'show_gallery', 'show_hours_on_home', 'show_map_link', 'google_analytics_id',
    'template',
  ]
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurant_website_settings')
    .upsert({ restaurant_id: ctx.restaurantId, ...patch }, { onConflict: 'restaurant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
