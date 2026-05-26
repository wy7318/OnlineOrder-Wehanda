'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Settings,
  ShoppingBag, LogOut, Shield, CalendarDays, Users, Store, ChevronRight, BarChart2,
  Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'

type LicenseFeatures = {
  feature_menu: boolean
  feature_orders: boolean
  feature_reservations: boolean
  feature_customers: boolean
  feature_analytics: boolean
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  feature?: keyof LicenseFeatures
}

const nav: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/menu',          label: 'Menu',             icon: UtensilsCrossed,  feature: 'feature_menu' },
  { href: '/orders',        label: 'Orders',           icon: ClipboardList,    feature: 'feature_orders' },
  { href: '/reservations',  label: 'Reservations',     icon: CalendarDays,     feature: 'feature_reservations' },
  { href: '/customers',     label: 'Customers',        icon: Users,            feature: 'feature_customers' },
  { href: '/analytics',     label: 'Analytics',        icon: BarChart2,        feature: 'feature_analytics' },
  { href: '/setup',         label: 'Restaurant Setup', icon: Settings },
]

function NavLinks({
  pathname, isAdmin, license, onNavigate,
}: {
  pathname: string
  isAdmin: boolean
  license: LicenseFeatures | null
  onNavigate?: () => void
}) {
  const visibleNav = nav.filter(item =>
    !item.feature || !license || license[item.feature]
  )

  return (
    <>
      {visibleNav.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition',
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              ? 'bg-brand-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-800',
          )}
        >
          <item.icon size={20} />
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition',
            pathname.startsWith('/admin')
              ? 'bg-brand-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-800',
          )}
        >
          <Shield size={20} />
          Platform Admin
        </Link>
      )}
    </>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [license, setLicense] = useState<LicenseFeatures | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/restaurant/current')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.name) setRestaurantName(data.name)
        if (data?.restaurant_licenses) setLicense(data.restaurant_licenses)
      })
      .catch(() => {})
    fetch('/api/admin/check')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.isAdmin) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  // Close drawer whenever the route changes
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Mobile: fixed top bar ─────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <ShoppingBag size={14} className="text-white" />
          </div>
          <span className="font-bold text-white">Wehanda</span>
        </Link>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile: backdrop ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in drawer ───────────────────────────── */}
      <aside className={cn(
        'lg:hidden fixed top-14 left-0 bottom-0 z-40 w-72 bg-gray-900 flex flex-col text-gray-100 overflow-y-auto transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Restaurant indicator */}
        <Link
          href="/select-restaurant"
          onClick={() => setMobileOpen(false)}
          className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:border-brand-500/40 transition-all group shrink-0"
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Managing</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] font-semibold text-white truncate">{restaurantName ?? '—'}</p>
            <ChevronRight size={13} className="text-gray-500 group-hover:text-brand-400 shrink-0 transition-colors" />
          </div>
        </Link>

        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
          <NavLinks pathname={pathname} isAdmin={isAdmin} license={license} onNavigate={() => setMobileOpen(false)} />
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 space-y-0.5 shrink-0">
          <Link
            href="/select-restaurant"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Store size={20} />
            Switch Restaurant
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Desktop: permanent sidebar (unchanged) ────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-gray-900 h-screen sticky top-0 flex-col text-gray-100 overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-800 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">Wehanda</span>
          </Link>
        </div>

        <Link
          href="/select-restaurant"
          className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-brand-500/40 transition-all group shrink-0"
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Managing</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] font-semibold text-white truncate">{restaurantName ?? '—'}</p>
            <ChevronRight size={13} className="text-gray-500 group-hover:text-brand-400 shrink-0 transition-colors" />
          </div>
        </Link>

        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
          <NavLinks pathname={pathname} isAdmin={isAdmin} license={license} />
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 space-y-0.5 shrink-0">
          <Link
            href="/select-restaurant"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Store size={20} />
            Switch Restaurant
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
