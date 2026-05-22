'use client'

import { useEffect, useState } from 'react'
import { X, CalendarDays } from 'lucide-react'
import { formatTime12h } from '@/lib/utils/slots'
import type { Reservation } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
  no_show:   'bg-orange-100 text-orange-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', declined: 'Declined',
  cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show',
}

interface Props {
  restaurantId: string
  onClose: () => void
}

export default function ReservationHistory({ restaurantId, onClose }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customer/reservations?restaurant_id=${restaurantId}`)
      .then(r => r.json())
      .then(data => { setReservations(Array.isArray(data) ? data : []) })
      .finally(() => setLoading(false))
  }, [restaurantId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-500" /> My Reservations
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarDays size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No reservations yet</p>
              <p className="text-sm mt-1">Your reservations at this restaurant will appear here</p>
            </div>
          ) : (
            reservations.map(rsv => (
              <div key={rsv.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-bold text-gray-900">
                      {new Date(rsv.reservation_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime12h(String(rsv.reservation_time).substring(0, 5))}
                      {' · '}
                      {rsv.party_size} {rsv.party_size === 1 ? 'guest' : 'guests'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[rsv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[rsv.status] ?? rsv.status}
                  </span>
                </div>
                {rsv.notes && (
                  <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50 italic">&ldquo;{rsv.notes}&rdquo;</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
