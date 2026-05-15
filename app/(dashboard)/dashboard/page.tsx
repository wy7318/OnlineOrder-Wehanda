import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import StatsCard from '@/components/dashboard/StatsCard'
import Badge from '@/components/ui/Badge'
import { ShoppingBag, Clock, CheckCircle, XCircle, UtensilsCrossed, DollarSign, Settings, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import type { OrderStatus } from '@/lib/types'

const statusBadge: Record<OrderStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' }> = {
  new: { label: 'New', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'orange' },
  preparing: { label: 'Preparing', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_user_id', user.id)
    .single()

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
          <UtensilsCrossed size={36} className="text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to OrderFlow!</h1>
        <p className="text-gray-500 mb-8 text-center max-w-sm">
          You haven't set up your restaurant yet. Get started by creating your restaurant profile.
        </p>
        <Link
          href="/setup"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          <Plus size={18} /> Set Up Restaurant
        </Link>
      </div>
    )
  }

  // Today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  const todayOrders = orders?.filter(o => o.created_at >= todayStr) ?? []
  const pendingOrders = orders?.filter(o => ['new', 'accepted', 'preparing'].includes(o.status)) ?? []
  const todayRevenue = todayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total_amount ?? 0), 0)

  return (
    <>
      <Header
        title={`Welcome, ${restaurant.name}`}
        subtitle="Here's what's happening today"
        userEmail={user.email}
        actions={
          <Link
            href={`/restaurant/${restaurant.slug}`}
            target="_blank"
            className="text-sm text-orange-500 hover:text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
          >
            View Public Page ↗
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Today's Orders" value={todayOrders.length} icon={ShoppingBag} color="orange" />
        <StatsCard title="Pending" value={pendingOrders.length} icon={Clock} color="yellow" />
        <StatsCard title="Today's Revenue" value={formatCurrency(todayRevenue)} icon={DollarSign} color="green" />
        <StatsCard title="Total Orders" value={orders?.length ?? 0} icon={CheckCircle} color="blue" />
      </div>

      {/* Recent Orders */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/orders" className="text-sm text-orange-500 hover:text-orange-600">View all →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {(orders?.length ?? 0) === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders yet. Share your ordering page!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders?.slice(0, 8).map(order => {
                    const s = statusBadge[order.status as OrderStatus]
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.order_number}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{order.customer_name}</td>
                        <td className="px-4 py-3 text-gray-700">{formatCurrency(order.total_amount)}</td>
                        <td className="px-4 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            {[
              { href: '/menu/items', label: 'Add Menu Item', icon: Plus, color: 'orange' },
              { href: '/menu/categories', label: 'Manage Categories', icon: UtensilsCrossed, color: 'blue' },
              { href: '/orders', label: 'View All Orders', icon: ClipboardList, color: 'green' },
              { href: '/setup', label: 'Restaurant Settings', icon: Settings, color: 'gray' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition group"
              >
                <div className="w-9 h-9 bg-orange-50 group-hover:bg-orange-100 rounded-lg flex items-center justify-center transition">
                  <a.icon size={18} className="text-orange-500" />
                </div>
                <span className="font-medium text-gray-800 text-sm">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ClipboardList(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="12" y1="11" x2="16" y2="11" /><line x1="12" y1="16" x2="16" y2="16" /><line x1="8" y1="11" x2="8.01" y2="11" /><line x1="8" y1="16" x2="8.01" y2="16" />
    </svg>
  )
}
