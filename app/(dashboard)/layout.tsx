import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import NotificationBell from '@/components/dashboard/NotificationBell'

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <div className="fixed top-5 right-5 z-50">
        <NotificationBell />
      </div>
    </div>
  )
}
