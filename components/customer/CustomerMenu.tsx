'use client'

import { useRef, useState, useEffect } from 'react'
import { User, Package, CalendarDays, Settings, LogOut, ChevronDown } from 'lucide-react'
import type { CustomerProfile } from '@/lib/types'

interface Props {
  profile: CustomerProfile | null
  onMyOrders: () => void
  onMyReservations: () => void
  onSettings: () => void
  onSignOut: () => void
}

export default function CustomerMenu({ profile, onMyOrders, onMyReservations, onSettings, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const firstName = profile?.display_name?.split(' ')[0] ?? 'Account'

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 bg-black/35 backdrop-blur-sm text-white rounded-xl text-sm font-semibold hover:bg-black/55 transition"
      >
        <User size={14} />
        {firstName}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{profile?.display_name ?? 'Customer'}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); onMyOrders() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <Package size={15} className="text-gray-400" /> My Orders
            </button>
            <button
              onClick={() => { setOpen(false); onMyReservations() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <CalendarDays size={15} className="text-gray-400" /> My Reservations
            </button>
            <button
              onClick={() => { setOpen(false); onSettings() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <Settings size={15} className="text-gray-400" /> Settings
            </button>
          </div>
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => { setOpen(false); onSignOut() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition text-left"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
