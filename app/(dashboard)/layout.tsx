import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Multi-restaurant guard: if user owns 2+ restaurants and hasn't selected one, redirect to picker
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_user_id', user.id)

  const ownedIds = (restaurants ?? []).map(r => r.id)

  if (ownedIds.length > 1) {
    const cookieStore = await cookies()
    const selectedId = cookieStore.get('selected_restaurant_id')?.value
    if (!selectedId || !ownedIds.includes(selectedId)) {
      redirect('/select-restaurant')
    }
  }

  // License check — block access if suspended or cancelled
  if (ownedIds.length > 0) {
    const cookieStore = await cookies()
    const selectedId = cookieStore.get('selected_restaurant_id')?.value
    const restaurantId = (ownedIds.length === 1 ? ownedIds[0] : selectedId) ?? null

    if (restaurantId) {
      const adminSupabase = createAdminClient()
      const { data: license } = await adminSupabase
        .from('restaurant_licenses')
        .select('status, trial_ends_at')
        .eq('restaurant_id', restaurantId)
        .maybeSingle()

      if (license?.status === 'suspended' || license?.status === 'cancelled') {
        redirect('/suspended')
      }
      if (license?.status === 'trial' && license.trial_ends_at) {
        if (new Date(license.trial_ends_at) < new Date()) {
          redirect('/suspended')
        }
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Mobile: pt-16 for top app bar, pb-28 clears bottom nav + safe area */}
        <div className="px-4 pt-16 pb-28 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      {/* NotificationBell is rendered once inside Sidebar to avoid duplicate realtime subscriptions */}
    </div>
  )
}
