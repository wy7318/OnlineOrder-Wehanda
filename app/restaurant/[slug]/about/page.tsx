import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { TemplateId } from '@/components/restaurant-site/templates/types'
import ModernAbout from '@/components/restaurant-site/templates/ModernAbout'
import BoldAbout from '@/components/restaurant-site/templates/BoldAbout'
import MinimalAbout from '@/components/restaurant-site/templates/MinimalAbout'
import ClassicAbout from '@/components/restaurant-site/templates/ClassicAbout'
import NoirAbout from '@/components/restaurant-site/templates/NoirAbout'
import OrganicAbout from '@/components/restaurant-site/templates/OrganicAbout'
import ElectricAbout from '@/components/restaurant-site/templates/ElectricAbout'
import ZenAbout from '@/components/restaurant-site/templates/ZenAbout'

export default async function RestaurantAboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!restaurant) notFound()

  const [{ data: hours }, { data: ws }] = await Promise.all([
    admin.from('restaurant_hours').select('*').eq('restaurant_id', restaurant.id).order('day_of_week'),
    admin.from('restaurant_website_settings').select('*').eq('restaurant_id', restaurant.id).maybeSingle(),
  ])

  const accent = (ws?.accent_color as string | null) ?? '#037FFC'
  const template = ((ws?.template as string | null) ?? 'modern') as TemplateId

  const props = {
    restaurant: {
      name: restaurant.name as string,
      description: restaurant.description as string | null,
      address: restaurant.address as string | null,
      phone: restaurant.phone as string | null,
      email: restaurant.email as string | null,
      website: restaurant.website as string | null,
      cover_image_url: restaurant.cover_image_url as string | null,
      logo_url: restaurant.logo_url as string | null,
      cuisine_types: restaurant.cuisine_types as string[] | null,
      pickup_enabled: restaurant.pickup_enabled as boolean | null,
      delivery_enabled: restaurant.delivery_enabled as boolean | null,
      dine_in_enabled: restaurant.dine_in_enabled as boolean | null,
      reservations_enabled: restaurant.reservations_enabled as boolean | null,
    },
    accent,
    aboutTitle: (ws?.about_title as string | null) ?? `About ${restaurant.name}`,
    aboutBody: ws?.about_body as string | null,
    showGallery: (ws?.show_gallery as boolean | null) ?? true,
    showMapLink: (ws?.show_map_link as boolean | null) ?? true,
    galleryUrls: (ws?.gallery_urls as string[] | null) ?? [],
    hours: (hours ?? []).map(h => ({
      id: h.id as string,
      day_of_week: h.day_of_week as number,
      open_time: h.open_time as string | null,
      close_time: h.close_time as string | null,
      is_closed: h.is_closed as boolean | null,
    })),
    slug,
  }

  if (template === 'bold') return <BoldAbout {...props} />
  if (template === 'minimal') return <MinimalAbout {...props} />
  if (template === 'classic') return <ClassicAbout {...props} />
  if (template === 'noir') return <NoirAbout {...props} />
  if (template === 'organic') return <OrganicAbout {...props} />
  if (template === 'electric') return <ElectricAbout {...props} />
  if (template === 'zen') return <ZenAbout {...props} />
  return <ModernAbout {...props} />
}
