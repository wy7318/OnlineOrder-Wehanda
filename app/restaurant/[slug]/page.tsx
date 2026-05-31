import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { isRestaurantOpen } from '@/lib/utils/hours'
import type { Metadata } from 'next'
import type { TemplateId } from '@/components/restaurant-site/templates/types'
import ModernTemplate from '@/components/restaurant-site/templates/ModernTemplate'
import BoldTemplate from '@/components/restaurant-site/templates/BoldTemplate'
import MinimalTemplate from '@/components/restaurant-site/templates/MinimalTemplate'
import ClassicTemplate from '@/components/restaurant-site/templates/ClassicTemplate'
import NoirTemplate from '@/components/restaurant-site/templates/NoirTemplate'
import OrganicTemplate from '@/components/restaurant-site/templates/OrganicTemplate'
import ElectricTemplate from '@/components/restaurant-site/templates/ElectricTemplate'
import ZenTemplate from '@/components/restaurant-site/templates/ZenTemplate'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: r } = await admin
    .from('restaurants').select('id, name, description, cuisine_types').eq('slug', slug).maybeSingle()
  if (!r) return {}
  const { data: ws } = await admin
    .from('restaurant_website_settings').select('seo_meta_description, seo_keywords')
    .eq('restaurant_id', r.id as string).maybeSingle()
  const description = (ws?.seo_meta_description as string | null) ?? (r.description as string | null) ?? `Order online from ${r.name}`
  return {
    title: r.name as string,
    description,
    keywords: (ws?.seo_keywords as string | null) ?? (r.cuisine_types as string[] | null)?.join(', '),
    openGraph: { title: r.name as string, description, type: 'website' },
  }
}

export default async function RestaurantHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: restaurant } = await admin
    .from('restaurants').select('*').eq('slug', slug).eq('is_active', true).maybeSingle()

  if (!restaurant) notFound()

  const [
    { data: hours },
    { data: ws },
    { data: items },
    { data: loyalty },
  ] = await Promise.all([
    admin.from('restaurant_hours').select('*').eq('restaurant_id', restaurant.id).order('day_of_week'),
    admin.from('restaurant_website_settings').select('*').eq('restaurant_id', restaurant.id).maybeSingle(),
    admin.from('menu_items').select('id, name, description, price, image_url').eq('restaurant_id', restaurant.id).eq('is_available', true).order('display_order').limit(8),
    admin.from('loyalty_programs').select('is_enabled, program_name, points_per_dollar').eq('restaurant_id', restaurant.id).maybeSingle(),
  ])

  const accent = (ws?.accent_color as string | null) ?? '#037FFC'
  const template = ((ws?.template as string | null) ?? 'modern') as TemplateId

  // Pre-compute all derived values so templates stay purely presentational
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
    heroHeadline: (ws?.hero_headline as string | null) ?? (restaurant.name as string),
    heroSubheadline: (ws?.hero_subheadline as string | null) ?? (restaurant.description as string | null) ?? '',
    aboutTitle: (ws?.about_title as string | null) ?? `About ${restaurant.name}`,
    aboutBody: ws?.about_body as string | null,
    showHours: (ws?.show_hours_on_home as boolean | null) ?? true,
    showGallery: (ws?.show_gallery as boolean | null) ?? true,
    galleryUrls: (ws?.gallery_urls as string[] | null) ?? [],
    orderTypes: [
      restaurant.pickup_enabled && 'Pickup',
      restaurant.dine_in_enabled && 'Dine In',
      restaurant.delivery_enabled && 'Delivery',
    ].filter(Boolean) as string[],
    isOpen: isRestaurantOpen(hours ?? [], restaurant.timezone as string),
    slug,
    hours: (hours ?? []).map(h => ({
      id: h.id as string,
      day_of_week: h.day_of_week as number,
      open_time: h.open_time as string | null,
      close_time: h.close_time as string | null,
      is_closed: h.is_closed as boolean | null,
    })),
    featured: (items ?? [])
      .sort((a, b) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0))
      .slice(0, 4)
      .map(item => ({
        id: item.id as string,
        name: item.name as string,
        description: item.description as string | null,
        price: item.price as number,
        image_url: item.image_url as string | null,
      })),
    loyalty: loyalty ? {
      is_enabled: loyalty.is_enabled as boolean | null,
      program_name: loyalty.program_name as string | null,
      points_per_dollar: loyalty.points_per_dollar as number | null,
    } : null,
  }

  if (template === 'bold') return <BoldTemplate {...props} />
  if (template === 'minimal') return <MinimalTemplate {...props} />
  if (template === 'classic') return <ClassicTemplate {...props} />
  if (template === 'noir') return <NoirTemplate {...props} />
  if (template === 'organic') return <OrganicTemplate {...props} />
  if (template === 'electric') return <ElectricTemplate {...props} />
  if (template === 'zen') return <ZenTemplate {...props} />
  return <ModernTemplate {...props} />
}
