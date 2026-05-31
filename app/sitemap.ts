import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://online-order-wehanda.vercel.app'
  const admin = createAdminClient()

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('slug, updated_at')
    .eq('is_active', true)

  const restaurantUrls: MetadataRoute.Sitemap = (restaurants ?? []).flatMap(r => [
    {
      url: `${siteUrl}/restaurant/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/restaurant/${r.slug}/menu`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/restaurant/${r.slug}/about`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ])

  return restaurantUrls
}
