'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Calendar, Users, Clock,
  Check, X, MessageSquare, RefreshCw, CalendarDays,
} from 'lucide-react'
import Header from '@/components/dashboard/Header'
import Button from '@/components/ui/Button'
import { formatTime12h, toDateStr } from '@/lib/utils/slots'
import type { Reservation, ReservationStatus } from '@/lib/types'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_ABBREVS = ['Su','Mo','Tu','We','Th','Fr','Sa']

const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
  no_show:   'bg-purple-100 text-purple-700',
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  declined:  'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show:   'No Show',
}

export default function ReservationsPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const todayStr = toDateStr(new Date())

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: r } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_user_id', user.id)
        .single()
      if (r) {
        setRestaurantId(r.id)
        setSelectedDate(todayStr)
      }
    }
    init()
  }, [])

  const load = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
    setReservations(data ?? [])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: ReservationStatus) {
    setUpdatingId(id)
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setUpdatingId(null)
  }

  async function saveNotes(id: string) {
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internal_notes: editingNotes[id] ?? '' }),
    })
    await load()
    setEditingNotes(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  // Calendar helpers
  const { year, month } = calMonth
  function calDays(): (Date | null)[] {
    const firstDay = new Date(year, month, 1)
    const days: (Date | null)[] = Array(firstDay.getDay()).fill(null)
    const total = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d))
    return days
  }

  function shiftMonth(delta: number) {
    setCalMonth(m => {
      const d = new Date(m.year, m.month + delta)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // Index reservations by date
  const byDate: Record<string, Reservation[]> = {}
  for (const r of reservations) {
    if (!byDate[r.reservation_date]) byDate[r.reservation_date] = []
    byDate[r.reservation_date].push(r)
  }

  const dayReservations = selectedDate ? (byDate[selectedDate] ?? []) : []
  const pendingTotal = reservations.filter(r => r.status === 'pending').length
  const confirmedTotal = reservations.filter(r => r.status === 'confirmed').length

  const days = calDays()

  return (
    <>
      <Header
        title="Reservations"
        subtitle="Manage table reservations"
        actions={
          <Button onClick={load} size="sm" className="gap-2">
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* ── Calendar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {DAY_ABBREVS.map(d => (
              <div key={d} className="text-center text-[11px] text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />
              const dateStr = toDateStr(day)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === todayStr
              const dayRsvs = byDate[dateStr] ?? []
              const hasPending = dayRsvs.some(r => r.status === 'pending')
              const activeCount = dayRsvs.filter(r => !['cancelled', 'declined'].includes(r.status)).length

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative aspect-square rounded-xl text-sm font-medium transition flex flex-col items-center justify-center
                    ${isSelected
                      ? 'bg-orange-500 text-white shadow-md'
                      : isToday
                        ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-300'
                        : 'hover:bg-gray-50 text-gray-800'}
                  `}
                >
                  {day.getDate()}
                  {activeCount > 0 && (
                    <span className={`absolute bottom-1 text-[9px] font-bold ${
                      isSelected ? 'text-orange-200' : hasPending ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      ●
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Stats */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingTotal}</p>
              <p className="text-xs text-amber-500 font-medium mt-0.5">Pending</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{confirmedTotal}</p>
              <p className="text-xs text-green-500 font-medium mt-0.5">Confirmed</p>
            </div>
          </div>
        </div>

        {/* ── Day Detail ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 shrink-0">
            <h3 className="font-semibold text-gray-900">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })
                : 'Select a date'}
            </h3>
            {selectedDate && dayReservations.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {dayReservations.filter(r => r.status === 'pending').length} pending ·{' '}
                {dayReservations.filter(r => r.status === 'confirmed').length} confirmed
              </p>
            )}
          </div>

          <div className="p-6 flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedDate ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CalendarDays size={36} className="mb-3 opacity-30" />
                <p className="text-sm">Click a date to view reservations</p>
              </div>
            ) : dayReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Calendar size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">No reservations for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayReservations.map(rsv => {
                  const timeStr = String(rsv.reservation_time).substring(0, 5)
                  const isEditing = rsv.id in editingNotes
                  const noteValue = editingNotes[rsv.id] ?? rsv.internal_notes ?? ''

                  return (
                    <div
                      key={rsv.id}
                      className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-semibold text-gray-900">{rsv.customer_name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[rsv.status]}`}>
                              {STATUS_LABEL[rsv.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {formatTime12h(timeStr)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={11} />
                              {rsv.party_size} {rsv.party_size === 1 ? 'guest' : 'guests'}
                            </span>
                            <span>{rsv.customer_phone}</span>
                            {rsv.customer_email && <span>{rsv.customer_email}</span>}
                          </div>
                          {rsv.notes && (
                            <p className="text-xs text-gray-400 italic mt-1.5">
                              &ldquo;{rsv.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {rsv.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(rsv.id, 'confirmed')}
                                disabled={updatingId === rsv.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                <Check size={12} /> Confirm
                              </button>
                              <button
                                onClick={() => updateStatus(rsv.id, 'declined')}
                                disabled={updatingId === rsv.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                <X size={12} /> Decline
                              </button>
                            </>
                          )}
                          {rsv.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => updateStatus(rsv.id, 'completed')}
                                disabled={updatingId === rsv.id}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                Completed
                              </button>
                              <button
                                onClick={() => updateStatus(rsv.id, 'no_show')}
                                disabled={updatingId === rsv.id}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                No-show
                              </button>
                            </>
                          )}
                          {(rsv.status === 'declined' || rsv.status === 'cancelled') && (
                            <button
                              onClick={() => updateStatus(rsv.id, 'pending')}
                              disabled={updatingId === rsv.id}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Internal notes */}
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              value={noteValue}
                              onChange={e => setEditingNotes(prev => ({ ...prev, [rsv.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveNotes(rsv.id)
                                if (e.key === 'Escape') setEditingNotes(prev => {
                                  const n = { ...prev }; delete n[rsv.id]; return n
                                })
                              }}
                              placeholder="Internal note (only you see this)…"
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400"
                            />
                            <button
                              onClick={() => saveNotes(rsv.id)}
                              className="text-xs text-orange-500 font-semibold px-2 hover:text-orange-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNotes(prev => { const n = { ...prev }; delete n[rsv.id]; return n })}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingNotes(prev => ({
                              ...prev, [rsv.id]: rsv.internal_notes ?? '',
                            }))}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
                          >
                            <MessageSquare size={11} />
                            {rsv.internal_notes
                              ? <span className="text-gray-600">{rsv.internal_notes}</span>
                              : 'Add internal note'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
