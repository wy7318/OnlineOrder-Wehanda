'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Settings,
  ShoppingBag, LogOut, Shield, CalendarDays, Users, Store,
  ChevronRight, BarChart2, MoreHorizontal, Zap, Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import NotificationBell from '@/components/dashboard/NotificationBell'

type LicenseFeatures = {
  feature_menu: boolean
  feature_orders: boolean
  feature_reservations: boolean
  feature_customers: boolean
  feature_analytics: boolean
  feature_revenue_boost: boolean
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  feature?: keyof LicenseFeatures
}

// Primary bottom tab bar items (shown on mobile, up to 4)
const MOBILE_PRIMARY: NavItem[] = [
  { href: '/dashboard',    label: 'Home',      icon: LayoutDashboard },
  { href: '/orders',       label: 'Orders',    icon: ClipboardList,  feature: 'feature_orders' },
  { href: '/reservations', label: 'Bookings',  icon: CalendarDays,   feature: 'feature_reservations' },
  { href: '/customers',    label: 'Customers', icon: Users,          feature: 'feature_customers' },
]

// Items shown in the "More" bottom sheet
const MOBILE_SECONDARY: NavItem[] = [
  { href: '/menu',            label: 'Menu Builder',      icon: UtensilsCrossed, feature: 'feature_menu' },
  { href: '/analytics',       label: 'Analytics',         icon: BarChart2,       feature: 'feature_analytics' },
  { href: '/revenue-boost',   label: 'Revenue Boost',     icon: Zap,             feature: 'feature_revenue_boost' },
  { href: '/website',         label: 'Website',           icon: Globe },
  { href: '/setup',           label: 'Restaurant Setup',  icon: Settings },
]

// Full nav for the desktop sidebar
const DESKTOP_NAV: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/menu',            label: 'Menu',             icon: UtensilsCrossed,  feature: 'feature_menu' },
  { href: '/orders',          label: 'Orders',           icon: ClipboardList,    feature: 'feature_orders' },
  { href: '/reservations',    label: 'Reservations',     icon: CalendarDays,     feature: 'feature_reservations' },
  { href: '/customers',       label: 'Customers',        icon: Users,            feature: 'feature_customers' },
  { href: '/analytics',       label: 'Analytics',        icon: BarChart2,        feature: 'feature_analytics' },
  { href: '/revenue-boost',   label: 'Revenue Boost',    icon: Zap,              feature: 'feature_revenue_boost' },
  { href: '/website',         label: 'Website',          icon: Globe },
  { href: '/setup',           label: 'Restaurant Setup', icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [license, setLicense] = useState<LicenseFeatures | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

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

  // Close More sheet on navigation
  useEffect(() => { setMoreOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function filterByLicense(items: NavItem[]) {
    return items.filter(item => !item.feature || !license || license[item.feature])
  }

  const visiblePrimary   = filterByLicense(MOBILE_PRIMARY)
  const visibleSecondary = filterByLicense(MOBILE_SECONDARY)
  const visibleDesktop   = filterByLicense(DESKTOP_NAV)

  // "More" tab highlights when on a secondary route or admin
  const moreActive = MOBILE_SECONDARY.some(item => isActive(pathname, item.href))
    || pathname.startsWith('/admin')

  return (
    <>
      {/* ── Mobile: compact app bar ───────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center px-4 gap-3">
        <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
          <ShoppingBag size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">Managing</p>
          <p className="text-[14px] font-bold text-gray-900 leading-tight truncate">
            {restaurantName ?? 'Wehanda'}
          </p>
        </div>
        {/* Bell is rendered once below as a fixed element shared by mobile + desktop */}
      </div>

      {/* ── Mobile: bottom tab bar ────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-16">
          {visiblePrimary.map(item => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors',
                  active ? 'text-brand-500' : 'text-gray-400',
                )}
              >
                <item.icon size={22} />
                <span className="text-[10px] font-semibold leading-none tracking-tight">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-brand-500"
                    style={{ position: 'unset', display: 'block', marginTop: '-2px' }}
                  />
                )}
              </Link>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors',
              moreActive || moreOpen ? 'text-brand-500' : 'text-gray-400',
            )}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-semibold leading-none tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile: More bottom sheet ─────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Restaurant pill */}
            <Link
              href="/select-restaurant"
              onClick={() => setMoreOpen(false)}
              className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                <Store size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">Managing</p>
                <p className="text-[14px] font-bold text-gray-900 truncate leading-tight">{restaurantName ?? '—'}</p>
              </div>
              <ChevronRight size={15} className="text-gray-400 shrink-0" />
            </Link>

            {/* Secondary nav items */}
            <div className="px-3 pb-2">
              {visibleSecondary.map(item => {
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-3 py-3.5 rounded-2xl transition-colors',
                      active ? 'bg-brand-50' : 'hover:bg-gray-50 active:bg-gray-100',
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                      active ? 'bg-brand-500' : 'bg-gray-100',
                    )}>
                      <item.icon size={18} className={active ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <span className={cn(
                      'text-[15px] font-semibold flex-1',
                      active ? 'text-brand-600' : 'text-gray-800',
                    )}>
                      {item.label}
                    </span>
                    {active && <ChevronRight size={14} className="text-brand-400" />}
                  </Link>
                )
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-4 px-3 py-3.5 rounded-2xl transition-colors',
                    pathname.startsWith('/admin') ? 'bg-brand-50' : 'hover:bg-gray-50 active:bg-gray-100',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                    pathname.startsWith('/admin') ? 'bg-brand-500' : 'bg-gray-100',
                  )}>
                    <Shield size={18} className={pathname.startsWith('/admin') ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <span className={cn(
                    'text-[15px] font-semibold flex-1',
                    pathname.startsWith('/admin') ? 'text-brand-600' : 'text-gray-800',
                  )}>
                    Platform Admin
                  </span>
                </Link>
              )}
            </div>

            {/* Divider + Sign-out */}
            <div className="mx-4 border-t border-gray-100" />
            <div className="px-3 pt-2 pb-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                  <LogOut size={18} className="text-red-500" />
                </div>
                <span className="text-[15px] font-semibold text-red-500 flex-1 text-left">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Desktop: permanent sidebar (unchanged visually) ───────── */}
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
          className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:border-brand-500/40 transition-all group shrink-0"
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Managing</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] font-semibold text-white truncate">{restaurantName ?? '—'}</p>
            <ChevronRight size={13} className="text-gray-500 group-hover:text-brand-400 shrink-0 transition-colors" />
          </div>
        </Link>

        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
          {visibleDesktop.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition',
                isActive(pathname, item.href)
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

      {/* ── Single NotificationBell — one instance for both mobile and desktop ── */}
      {/* Mobile: top-right of the h-14 app bar. Desktop: top-right of the content area */}
      <div className="fixed top-3 right-3 lg:top-4 lg:right-5 z-50">
        <NotificationBell />
      </div>
    </>
  )
}
