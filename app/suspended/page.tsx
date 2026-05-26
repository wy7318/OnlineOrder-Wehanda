import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ShoppingBag, AlertTriangle, ArrowRight, MapPin } from 'lucide-react'
import SignOutButton from './SignOutButton'

export default async function SuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const suspendedId = cookieStore.get('selected_restaurant_id')?.value

  // All restaurants owned by this user
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, address, logo_url, is_active')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true })

  const allRestaurants = restaurants ?? []

  // Fetch license statuses for all owned restaurants
  const adminSupabase = createAdminClient()
  const ids = allRestaurants.map(r => r.id)
  const licenseMap = new Map<string, string>()

  if (ids.length > 0) {
    const { data: licenses } = await adminSupabase
      .from('restaurant_licenses')
      .select('restaurant_id, status')
      .in('restaurant_id', ids)
    for (const l of licenses ?? []) licenseMap.set(l.restaurant_id, l.status)
  }

  const suspendedRestaurant = allRestaurants.find(r => r.id === suspendedId)

  // Restaurants the user can switch to right now
  const switchable = allRestaurants.filter(r => {
    if (r.id === suspendedId) return false
    const status = licenseMap.get(r.id) ?? 'active'
    return status !== 'suspended' && status !== 'cancelled'
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-500 mb-2">
          <span className="font-semibold text-gray-700">{suspendedRestaurant?.name ?? 'This restaurant'}</span>
          {' '}has been suspended or cancelled.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Please contact support to restore access.
        </p>

        {/* Other restaurants the owner can switch to */}
        {switchable.length > 0 && (
          <div className="mb-8 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
              Switch to another restaurant
            </p>
            <div className="space-y-2">
              {switchable.map(r => (
                <a
                  key={r.id}
                  href={`/api/restaurant/select?id=${r.id}`}
                  className="flex items-center justify-between gap-3 bg-white border border-gray-200 hover:border-brand-400 rounded-xl px-4 py-3.5 transition group"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    {r.address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} className="shrink-0" />
                        {r.address}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-brand-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="mailto:support@simplidone.com"
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl transition"
          >
            Contact Support
          </Link>
          <SignOutButton />
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-gray-300">
          <ShoppingBag size={14} />
          <span className="text-sm font-semibold">Wehanda</span>
        </div>
      </div>
    </div>
  )
}
