'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Settings,
  ShoppingBag, LogOut, Shield, ChevronDown, ChevronUp, CalendarDays, Users,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'

type NavItem =
  | { href: string; label: string; icon: React.ComponentType<{ size?: number }> }
  | { label: string; icon: React.ComponentType<{ size?: number }>; children: { href: string; label: string }[] }

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Menu', icon: UtensilsCrossed,
    children: [
      { href: '/menu', label: 'Overview' },
      { href: '/menu/categories', label: 'Categories' },
      { href: '/menu/items', label: 'Menu Items' },
      { href: '/menu/options', label: 'Options & Groups' },
    ],
  },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/reservations', label: 'Reservations', icon: CalendarDays },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/setup', label: 'Restaurant Setup', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(pathname.startsWith('/menu'))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 shrink-0 bg-gray-900 min-h-screen flex flex-col text-gray-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <ShoppingBag size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">OrderFlow</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(item => {
          if ('children' in item) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition text-sm font-medium"
                >
                  <item.icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {menuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {menuOpen && (
                  <div className="ml-9 mt-1 flex flex-col gap-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm transition',
                          pathname === child.href
                            ? 'bg-orange-500/20 text-orange-400 font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                pathname === item.href
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
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
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
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
