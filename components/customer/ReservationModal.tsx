'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Users, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { formatTime12h, toDateStr } from '@/lib/utils/slots'
import type { PublicRestaurant } from '@/lib/types'

interface SlotInfo {
  time: string
  remaining: number
  available: boolean
  isPast: boolean
}

interface Props {
  restaurant: PublicRestaurant
  onClose: () => void
  prefill?: { name?: string; phone?: string; email?: string }
  customerUserId?: string | null
  accent?: string
}

type Step = 'pick' | 'time' | 'contact' | 'done'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_ABBREVS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function ReservationModal({ restaurant, onClose, prefill, customerUserId, accent = '#037FFC' }: Props) {
  const [step, setStep] = useState<Step>('pick')
  const [partySize, setPartySize] = useState(2)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [form, setForm] = useState({
    name: prefill?.name ?? '',
    phone: prefill?.phone ?? '',
    email: prefill?.email ?? '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [reservationId, setReservationId] = useState('')

  const maxParty = restaurant.reservation_max_party_size ?? 10
  const advanceDays = restaurant.reservation_advance_days ?? 30
  const capacity = restaurant.reservation_capacity ?? 20

  const openDays = new Set(
    (restaurant.restaurant_hours ?? []).filter(h => !h.is_closed).map(h => h.day_of_week)
  )

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + advanceDays)
  const todayStr = toDateStr(today)

  function isSelectable(d: Date): boolean {
    if (d.getTime() === 0) return false
    if (d < today || d > maxDate) return false
    return openDays.has(d.getDay())
  }

  function calDays(): (Date | null)[] {
    const { year, month } = calMonth
    const firstDay = new Date(year, month, 1)
    const days: (Date | null)[] = Array(firstDay.getDay()).fill(null)
    const total = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d))
    return days
  }

  const canGoBack =
    calMonth.year > today.getFullYear() ||
    (calMonth.year === today.getFullYear() && calMonth.month > today.getMonth())
  const canGoForward =
    calMonth.year < maxDate.getFullYear() ||
    (calMonth.year === maxDate.getFullYear() && calMonth.month < maxDate.getMonth())

  function shiftMonth(delta: number) {
    setCalMonth(m => {
      const d = new Date(m.year, m.month + delta)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // Sync prefill if customer logs in while modal is open
  useEffect(() => {
    if (prefill) {
      setForm(f => ({
        ...f,
        name: prefill.name ?? f.name,
        phone: prefill.phone ?? f.phone,
        email: prefill.email ?? f.email,
      }))
    }
  }, [prefill?.name, prefill?.phone, prefill?.email])

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSelectedTime('')
    fetch(
      `/api/reservations/availability?restaurant_id=${restaurant.id}&date=${selectedDate}&party_size=${partySize}`
    )
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, partySize, restaurant.id])

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || null,
          party_size: partySize,
          reservation_date: selectedDate,
          reservation_time: selectedTime,
          notes: form.notes || null,
          customer_user_id: customerUserId ?? null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setReservationId(data.id)
        setStep('done')
      } else {
        alert(data.error ?? 'Could not make reservation. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const days = calDays()
  const { year, month } = calMonth
  const availableSlots = slots.filter(s => s.available)
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null
  const stepIndex = ['pick', 'time', 'contact'].indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          {step !== 'pick' && step !== 'done' && (
            <button
              onClick={() => setStep(step === 'time' ? 'pick' : 'time')}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition shrink-0"
            >
              <ChevronLeft size={15} className="text-gray-500" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {step === 'pick' ? 'Reserve a Table' :
               step === 'time' ? 'Select a Time' :
               step === 'contact' ? 'Your Details' :
               'Request Sent!'}
            </h2>
            <p className="text-xs text-gray-400 truncate">{restaurant.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition shrink-0"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Step dots */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i >= stepIndex ? '' : ''} ${i > stepIndex ? 'w-4 bg-gray-200' : i === stepIndex ? 'w-8' : 'w-4'}`}
                style={i <= stepIndex ? { background: i === stepIndex ? accent : accent + '60' } : {}}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Party size + Date ── */}
          {step === 'pick' && (
            <div className="p-6 space-y-6">
              {/* Party size */}
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Users size={15} style={{ color: accent }} /> Party Size
                </p>
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                  <button
                    onClick={() => setPartySize(p => Math.max(1, p - 1))}
                    disabled={partySize <= 1}
                    className="w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-700 hover:opacity-70 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{partySize}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{partySize === 1 ? 'guest' : 'guests'}</p>
                  </div>
                  <button
                    onClick={() => setPartySize(p => Math.min(maxParty, p + 1))}
                    disabled={partySize >= maxParty}
                    className="w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-700 hover:opacity-70 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                {partySize >= maxParty && (
                  <p className="text-xs text-center mt-2" style={{ color: accent }}>
                    For parties over {maxParty}, please call us directly.
                  </p>
                )}
              </div>

              {/* Calendar */}
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Calendar size={15} style={{ color: accent }} /> Select Date
                </p>

                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => shiftMonth(-1)}
                    disabled={!canGoBack}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-gray-800">
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <button
                    onClick={() => shiftMonth(1)}
                    disabled={!canGoForward}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAY_ABBREVS.map(d => (
                    <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, i) => {
                    if (!day) return <div key={`pad-${i}`} />
                    const dateStr = toDateStr(day)
                    const sel = isSelectable(day)
                    const isSelected = dateStr === selectedDate
                    const isToday = dateStr === todayStr
                    return (
                      <button
                        key={dateStr}
                        onClick={() => sel && setSelectedDate(dateStr)}
                        disabled={!sel}
                        className={`aspect-square rounded-xl text-sm font-medium transition ${isSelected ? 'text-white shadow-lg' : sel ? 'text-gray-800 hover:opacity-80' : 'text-gray-300 cursor-not-allowed'}`}
                        style={isSelected
                          ? { background: accent }
                          : sel && isToday
                            ? { outline: `1px solid ${accent}`, outlineOffset: '-1px' }
                            : sel
                              ? { background: 'transparent' }
                              : {}}
                      >
                        {day.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Time slots ── */}
          {step === 'time' && (
            <div className="p-6">
              {selectedDateObj && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-5 bg-gray-50 rounded-xl px-4 py-2.5">
                  <Calendar size={13} className="shrink-0" style={{ color: accent }} />
                  <span>
                    {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  <span className="text-gray-300 mx-0.5">·</span>
                  <Users size={13} className="shrink-0" style={{ color: accent }} />
                  <span>{partySize} {partySize === 1 ? 'guest' : 'guests'}</span>
                </div>
              )}

              {slotsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-14">
                  <Clock size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold mb-1">No available times</p>
                  <p className="text-sm text-gray-400">Try a different date or smaller party size.</p>
                  <button
                    onClick={() => setStep('pick')}
                    className="mt-5 text-sm font-medium underline"
                    style={{ color: accent }}
                  >
                    Change date
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-4 uppercase tracking-wide font-medium">
                    {availableSlots.length} time{availableSlots.length !== 1 ? 's' : ''} available
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(slot => {
                      const isSelected = slot.time === selectedTime
                      const limited = slot.available && slot.remaining < capacity * 0.3
                      return (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`py-3 px-2 rounded-xl text-sm font-medium transition text-center leading-tight ${isSelected ? 'text-white shadow-lg' : slot.available ? 'bg-gray-50 text-gray-800 border border-gray-100 hover:opacity-80' : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'}`}
                        style={isSelected ? { background: accent } : {}}
                        >
                          {formatTime12h(slot.time)}
                          {limited && slot.available && !isSelected && (
                            <span className="block text-[10px] text-amber-500 font-normal mt-0.5">
                              Few left
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Contact ── */}
          {step === 'contact' && (
            <div className="p-6 space-y-5">
              {/* Summary card */}
              {selectedDateObj && (
                <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: accent + '12', border: `1px solid ${accent}30` }}>
                  <div className="text-center bg-white rounded-xl px-3 py-2 shadow-sm shrink-0">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">
                      {selectedDateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 leading-none mt-0.5">
                      {selectedDateObj.getDate()}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: accent }}>{formatTime12h(selectedTime)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {partySize} {partySize === 1 ? 'guest' : 'guests'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Your Information</p>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full Name *"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition"
                />
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone Number *"
                  type="tel"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition"
                />
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email (optional)"
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition"
                />
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Special requests — allergies, occasion, seating preference…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition resize-none"
                />
              </div>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                The restaurant will review and confirm your reservation.
                You may be contacted to verify your booking.
              </p>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={34} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Request Sent!</h3>
              <p className="text-sm text-gray-500 mb-7">
                {restaurant.name} will confirm your reservation shortly.
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2.5 mb-6">
                {[
                  ['Date', selectedDateObj?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) ?? ''],
                  ['Time', formatTime12h(selectedTime)],
                  ['Party', `${partySize} ${partySize === 1 ? 'guest' : 'guests'}`],
                  ['Name', form.name],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-300">
                Ref: {reservationId.substring(0, 8).toUpperCase()}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          {step === 'pick' && (
            <button
              onClick={() => selectedDate && setStep('time')}
              disabled={!selectedDate}
              className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition hover:opacity-90"
              style={{ background: accent }}
            >
              {selectedDate
                ? `See Times for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Select a Date to Continue'}
            </button>
          )}
          {step === 'time' && (
            <button
              onClick={() => selectedTime && setStep('contact')}
              disabled={!selectedTime}
              className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition hover:opacity-90"
              style={{ background: accent }}
            >
              {selectedTime ? `Continue with ${formatTime12h(selectedTime)}` : 'Select a Time to Continue'}
            </button>
          )}
          {step === 'contact' && (
            <button
              onClick={submit}
              disabled={submitting || !form.name.trim() || !form.phone.trim()}
              className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: accent }}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Request Reservation'}
            </button>
          )}
          {step === 'done' && (
            <button
              onClick={onClose}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-2xl transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
