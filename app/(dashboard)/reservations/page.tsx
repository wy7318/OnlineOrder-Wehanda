'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Calendar, Users, Clock,
  Check, X, MessageSquare, RefreshCw, CalendarDays, Plus, Minus,
} from 'lucide-react'
import Header from '@/components/dashboard/Header'
import Button from '@/components/ui/Button'
import { formatTime12h, toDateStr, generateTimeSlots } from '@/lib/utils/slots'
import type { Reservation, ReservationStatus, RestaurantHours } from '@/lib/types'

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white transition'

type NewRsvForm = {
  date: string; time: string; partySize: number
  name: string; phone: string; email: string
  notes: string; status: 'confirmed' | 'pending'
}
const EMPTY_FORM: NewRsvForm = {
  date: '', time: '', partySize: 2, name: '', phone: '', email: '', notes: '', status: 'confirmed',
}

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
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHours[]>([])

  // New reservation modal
  const [newRsvOpen, setNewRsvOpen] = useState(false)
  const [newRsv, setNewRsv] = useState<NewRsvForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const todayStr = toDateStr(new Date())

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/restaurant/current')
      if (!res.ok) return
      const r = await res.json()
      if (r?.id) {
        setRestaurantId(r.id)
        setSelectedDate(todayStr)
        // Fetch hours in parallel — used for time slot generation in new reservation modal
        supabase.from('restaurant_hours').select('*').eq('restaurant_id', r.id)
          .then(({ data }) => setRestaurantHours(data ?? []))
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Time slots for the selected date in the new-reservation modal
  const timeSlots = useMemo(() => {
    if (!newRsv.date) return []
    if (restaurantHours.length > 0) return generateTimeSlots(restaurantHours, newRsv.date)
    // Fallback when hours not yet loaded: 7 AM – 10 PM
    const slots: string[] = []
    for (let h = 7; h < 22; h++)
      for (const m of [0, 30])
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    return slots
  }, [newRsv.date, restaurantHours])

  function openNewRsv() {
    setNewRsv({ ...EMPTY_FORM, date: selectedDate || todayStr })
    setCreateError('')
    setNewRsvOpen(true)
  }

  async function handleCreateReservation(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    const res = await fetch('/api/reservations/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: newRsv.name.trim(),
        customer_phone: newRsv.phone.trim(),
        customer_email: newRsv.email.trim() || null,
        party_size: newRsv.partySize,
        reservation_date: newRsv.date,
        reservation_time: newRsv.time,
        notes: newRsv.notes.trim() || null,
        status: newRsv.status,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setCreateError(json.error ?? 'Failed to create reservation')
      setCreating(false)
      return
    }

    // Optimistic update — no full reload needed
    setReservations(prev => [...prev, json as Reservation])
    setNewRsvOpen(false)
    setCreating(false)
    // Jump calendar to the new reservation's date
    const [y, m] = newRsv.date.split('-').map(Number)
    setCalMonth({ year: y, month: m - 1 })
    setSelectedDate(newRsv.date)
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
  const pendingReservations = reservations
    .filter(r => r.status === 'pending')
    .sort((a, b) =>
      a.reservation_date !== b.reservation_date
        ? a.reservation_date.localeCompare(b.reservation_date)
        : a.reservation_time.localeCompare(b.reservation_time)
    )
  const pendingTotal = pendingReservations.length
  const confirmedTotal = reservations.filter(r => r.status === 'confirmed').length

  const days = calDays()

  return (
    <>
      <Header
        title="Reservations"
        subtitle="Manage table reservations"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={load} size="sm" variant="outline" className="gap-2">
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button onClick={openNewRsv} size="sm" className="gap-2">
              <Plus size={14} /> New Reservation
            </Button>
          </div>
        }
      />

      {/* ── Pending Reservations Banner ───────────────────────────────────── */}
      {!loading && pendingTotal > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="font-semibold text-amber-800 text-[15px]">
              {pendingTotal} reservation{pendingTotal !== 1 ? 's' : ''} awaiting confirmation
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pendingReservations.map(rsv => {
              const dateObj = new Date(rsv.reservation_date + 'T00:00:00')
              const isToday = rsv.reservation_date === todayStr
              const isTomorrow = rsv.reservation_date === toDateStr(new Date(Date.now() + 86_400_000))
              const dateLabel = isToday ? 'Today'
                : isTomorrow ? 'Tomorrow'
                : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

              return (
                <div
                  key={rsv.id}
                  className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{rsv.customer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className={`font-medium ${isToday ? 'text-brand-600' : 'text-gray-700'}`}>
                          {dateLabel}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {formatTime12h(String(rsv.reservation_time).substring(0, 5))}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {rsv.party_size}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{rsv.customer_phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDate(rsv.reservation_date)
                        setCalMonth({ year: dateObj.getFullYear(), month: dateObj.getMonth() })
                      }}
                      className="text-[10px] text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap shrink-0 mt-0.5"
                    >
                      View →
                    </button>
                  </div>

                  {rsv.notes && (
                    <p className="text-xs text-gray-400 italic border-t border-gray-50 pt-2">
                      &ldquo;{rsv.notes}&rdquo;
                    </p>
                  )}

                  <div className="flex gap-2 pt-1 border-t border-gray-50">
                    <button
                      onClick={() => updateStatus(rsv.id, 'confirmed')}
                      disabled={updatingId === rsv.id}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      <Check size={11} /> Confirm
                    </button>
                    <button
                      onClick={() => updateStatus(rsv.id, 'declined')}
                      disabled={updatingId === rsv.id}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      <X size={11} /> Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                      ? 'bg-brand-500 text-white shadow-md'
                      : isToday
                        ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-300'
                        : 'hover:bg-gray-50 text-gray-800'}
                  `}
                >
                  {day.getDate()}
                  {activeCount > 0 && (
                    <span className={`absolute bottom-1 text-[9px] font-bold ${
                      isSelected ? 'text-brand-200' : hasPending ? 'text-amber-500' : 'text-green-500'
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
                <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
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
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400"
                            />
                            <button
                              onClick={() => saveNotes(rsv.id)}
                              className="text-xs text-brand-500 font-semibold px-2 hover:text-brand-600"
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
      {/* ── New Reservation Modal ─────────────────────────────────────────── */}
      {newRsvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { if (!creating) setNewRsvOpen(false) }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900">New Reservation</h2>
              <button
                onClick={() => setNewRsvOpen(false)}
                disabled={creating}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateReservation} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date *</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={newRsv.date}
                    onChange={e => setNewRsv(f => ({ ...f, date: e.target.value, time: '' }))}
                    className={INPUT}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Time *</label>
                  <select
                    value={newRsv.time}
                    onChange={e => setNewRsv(f => ({ ...f, time: e.target.value }))}
                    className={INPUT}
                    required
                    disabled={!newRsv.date}
                  >
                    <option value="">— pick time —</option>
                    {timeSlots.length === 0 && newRsv.date
                      ? <option disabled>Closed this day</option>
                      : timeSlots.map(s => <option key={s} value={s}>{formatTime12h(s)}</option>)
                    }
                  </select>
                </div>
              </div>

              {/* Party size */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Party Size *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRsv(f => ({ ...f, partySize: Math.max(1, f.partySize - 1) }))}
                    className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center font-bold text-gray-900 text-lg">{newRsv.partySize}</span>
                  <button
                    type="button"
                    onClick={() => setNewRsv(f => ({ ...f, partySize: f.partySize + 1 }))}
                    className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition"
                  >
                    <Plus size={14} />
                  </button>
                  <span className="text-xs text-gray-400 ml-1">guests</span>
                </div>
              </div>

              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
                  <input
                    value={newRsv.name}
                    onChange={e => setNewRsv(f => ({ ...f, name: e.target.value }))}
                    className={INPUT}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={newRsv.phone}
                    onChange={e => setNewRsv(f => ({ ...f, phone: e.target.value }))}
                    className={INPUT}
                    placeholder="555-000-0000"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="email"
                  value={newRsv.email}
                  onChange={e => setNewRsv(f => ({ ...f, email: e.target.value }))}
                  className={INPUT}
                  placeholder="customer@email.com"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={newRsv.notes}
                  onChange={e => setNewRsv(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Allergy, occasion, seating preference…"
                  className={INPUT + ' resize-none'}
                />
              </div>

              {/* Status toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Initial Status</label>
                <div className="flex gap-2">
                  {(['confirmed', 'pending'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRsv(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition ${
                        newRsv.status === s
                          ? s === 'confirmed'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                      }`}
                    >
                      {s === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {newRsv.status === 'confirmed' ? 'Reservation will be immediately confirmed — good for phone/walk-in bookings.' : 'Reservation will sit in the pending queue for review.'}
                </p>
              </div>

              {/* Error */}
              {createError && (
                <p className="text-sm text-red-500 font-medium bg-red-50 rounded-xl px-3 py-2">{createError}</p>
              )}
            </form>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setNewRsvOpen(false)}
                disabled={creating}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-600 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReservation}
                disabled={creating || !newRsv.date || !newRsv.time || !newRsv.name.trim() || !newRsv.phone.trim()}
                className="flex-1 py-2.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
