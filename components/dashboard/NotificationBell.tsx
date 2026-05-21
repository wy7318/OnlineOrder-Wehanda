'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, ShoppingBag, CalendarDays } from 'lucide-react'
import { useNotificationStore } from '@/store/notifications'
import { useNotificationSettings } from '@/store/notificationSettings'
import { playBell } from '@/lib/utils/bellSound'
import { formatCurrency } from '@/lib/utils/helpers'
import { formatTime12h } from '@/lib/utils/slots'
import type { Order, Reservation } from '@/lib/types'
import Link from 'next/link'

function triggerSound(
  soundMode: 'none' | 'repeat' | 'until_click',
  repeatCount: number,
  cleanupRef: React.MutableRefObject<() => void>
) {
  if (soundMode === 'none') return

  if (soundMode === 'repeat') {
    let count = 0
    function ring() {
      if (count >= repeatCount) return
      playBell()
      count++
      if (count < repeatCount) setTimeout(ring, 2200)
    }
    ring()
    return
  }

  // until_click — cancel any prior running session for this channel
  cleanupRef.current()

  let active = true
  let timeoutId: ReturnType<typeof setTimeout>

  function ring() {
    if (!active) return
    playBell()
    timeoutId = setTimeout(ring, 3000)
  }

  function stopOnClick() {
    active = false
    clearTimeout(timeoutId)
  }

  cleanupRef.current = () => {
    active = false
    clearTimeout(timeoutId)
    document.removeEventListener('click', stopOnClick, true)
  }

  document.addEventListener('click', stopOnClick, { once: true, capture: true })
  ring()
}

export default function NotificationBell() {
  const supabase = createClient()
  const { notifications, add, markAllRead, clear } = useNotificationStore()
  const {
    orderSoundMode, orderRepeatCount,
    reservationSoundMode, reservationRepeatCount,
  } = useNotificationSettings()

  const [open, setOpen] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [ringing, setRinging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const orderCleanupRef = useRef<() => void>(() => {})
  const reservationCleanupRef = useRef<() => void>(() => {})

  const unread = notifications.filter((n) => !n.read).length

  // Resolve restaurant id once (respects selected_restaurant_id cookie)
  useEffect(() => {
    fetch('/api/restaurant/current')
      .then(res => res.ok ? res.json() : null)
      .then(r => { if (r?.id) setRestaurantId(r.id) })
  }, [])

  // ── Orders subscription ──────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase
      .channel(`bell-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const order = payload.new as Order
          add({
            id: order.id,
            type: 'order',
            orderNumber: order.order_number,
            customerName: order.customer_name,
            total: order.total_amount,
            createdAt: order.created_at,
          })
          triggerSound(orderSoundMode, orderRepeatCount, orderCleanupRef)
          setRinging(true)
          setTimeout(() => setRinging(false), 1000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      orderCleanupRef.current()
    }
  }, [restaurantId, orderSoundMode, orderRepeatCount])

  // ── Reservations subscription ────────────────────────────
  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase
      .channel(`bell-reservations-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const rsv = payload.new as Reservation
          add({
            id: rsv.id,
            type: 'reservation',
            customerName: rsv.customer_name,
            partySize: rsv.party_size,
            reservationDate: rsv.reservation_date,
            reservationTime: String(rsv.reservation_time).substring(0, 5),
            createdAt: rsv.created_at,
          })
          triggerSound(reservationSoundMode, reservationRepeatCount, reservationCleanupRef)
          setRinging(true)
          setTimeout(() => setRinging(false), 1000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      reservationCleanupRef.current()
    }
  }, [restaurantId, reservationSoundMode, reservationRepeatCount])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) markAllRead()
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={toggle}
        className="relative p-2.5 rounded-xl bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition shadow-sm"
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={`transition-colors ${unread > 0 ? 'text-brand-500' : 'text-gray-500'} ${ringing ? 'animate-bell-ring' : ''}`}
        />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-13 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-600 transition">
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Bell size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((n) =>
                n.type === 'order' ? (
                  <Link
                    key={n.id}
                    href="/orders"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-brand-50 transition"
                  >
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag size={14} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">New Order {n.orderNumber}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {n.customerName} · {formatCurrency(n.total)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <Link
                    key={n.id}
                    href="/reservations"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarDays size={14} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">New Reservation</p>
                      <p className="text-xs text-gray-500 truncate">
                        {n.customerName} · {n.partySize} {n.partySize === 1 ? 'guest' : 'guests'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.reservationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' at '}
                        {formatTime12h(n.reservationTime)}
                      </p>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <Link
              href="/orders"
              onClick={() => setOpen(false)}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium transition"
            >
              Orders →
            </Link>
            <Link
              href="/reservations"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium transition"
            >
              Reservations →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
