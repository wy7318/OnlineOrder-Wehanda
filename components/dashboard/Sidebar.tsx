'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Settings,
  ShoppingBag, LogOut, Shield, CalendarDays, Users, Store, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> }

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/reservations', label: 'Reservations', icon: CalendarDays },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/setup', label: 'Restaurant Setup', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/restaurant/current')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.name) setRestaurantName(data.name) })
      .catch(() => {})
    fetch('/api/admin/check')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.isAdmin) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 shrink-0 bg-gray-900 h-screen sticky top-0 flex flex-col text-gray-100 overflow-y-auto">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <ShoppingBag size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">OrderFlow</span>
        </Link>
      </div>

      {/* Current restaurant indicator */}
      <Link
        href="/select-restaurant"
        className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-orange-500/40 transition-all group shrink-0"
      >
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Managing</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white truncate">
            {restaurantName ?? '—'}
          </p>
          <ChevronRight size={13} className="text-gray-500 group-hover:text-orange-400 shrink-0 transition-colors" />
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                ? 'bg-orange-500 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
              pathname.startsWith('/admin')
                ? 'bg-orange-500 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            )}
          >
            <Shield size={18} />
            Platform Admin
          </Link>
        )}
      </nav>

      {/* Bottom actions — always visible at the bottom */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-0.5 shrink-0">
        <Link
          href="/select-restaurant"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <Store size={18} />
          Switch Restaurant
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

    </aside>
  )
}
