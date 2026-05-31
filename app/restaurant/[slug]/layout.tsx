import { createAdminClient } from '@/lib/supabase/admin'
import SiteNav from '@/components/restaurant-site/SiteNav'

export default async function RestaurantSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  let accentColor = '#037FFC'
  if (restaurant?.id) {
    const { data: ws } = await admin
      .from('restaurant_website_settings')
      .select('accent_color')
      .eq('restaurant_id', restaurant.id as string)
      .maybeSingle()
    if (ws?.accent_color) accentColor = ws.accent_color as string
  }

  return (
    <>
      {restaurant && (
        <SiteNav
          slug={slug}
          restaurantName={restaurant.name as string}
          logoUrl={restaurant.logo_url as string | null}
          accentColor={accentColor}
        />
      )}
      {children}
    </>
  )
}
