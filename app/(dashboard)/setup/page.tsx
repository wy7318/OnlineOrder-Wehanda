'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/helpers'
import { DAY_NAMES } from '@/lib/utils/hours'
import Header from '@/components/dashboard/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import type { Restaurant, RestaurantHours } from '@/lib/types'
import { Globe, Phone, Mail, MapPin, Clock, Save, Bell, CalendarDays } from 'lucide-react'
import { useNotificationSettings } from '@/store/notificationSettings'
import { playBell } from '@/lib/utils/bellSound'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

function defaultHours(): Omit<RestaurantHours, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    open_time: '09:00',
    close_time: '21:00',
    is_closed: i === 0, // Sunday closed by default
  }))
}

function SetupContent() {
  const { toast } = useToast()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === '1'
  const {
    orderSoundMode, orderRepeatCount, setOrderSoundMode, setOrderRepeatCount,
    reservationSoundMode, reservationRepeatCount, setReservationSoundMode, setReservationRepeatCount,
  } = useNotificationSettings()
  const [loading, setLoading] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [hours, setHours] = useState(defaultHours())
  const [form, setForm] = useState({
    name: '', slug: '', address: '', phone: '', email: '', website: '',
    description: '', timezone: 'America/New_York',
    online_ordering_enabled: true, pickup_enabled: true,
    dine_in_enabled: false, delivery_enabled: false,
    tax_rate: 0,
    reservations_enabled: false,
    reservation_capacity: 20,
    reservation_max_party_size: 10,
    reservation_advance_days: 30,
    reservation_min_notice_hours: 1,
  })

  useEffect(() => {
    if (isNew) return // Create mode — don't load any existing restaurant

    async function load() {
      // Load the currently selected restaurant (respects multi-restaurant cookie)
      const res = await fetch('/api/restaurant/current')
      const r = res.ok ? await res.json() : null

      if (r) {
        setRestaurant(r)
        setForm({
          name: r.name, slug: r.slug, address: r.address ?? '',
          phone: r.phone ?? '', email: r.email ?? '', website: r.website ?? '',
          description: r.description ?? '', timezone: r.timezone,
          online_ordering_enabled: r.online_ordering_enabled,
          pickup_enabled: r.pickup_enabled, dine_in_enabled: r.dine_in_enabled,
          delivery_enabled: r.delivery_enabled,
          tax_rate: r.tax_rate ?? 0,
          reservations_enabled: r.reservations_enabled ?? false,
          reservation_capacity: r.reservation_capacity ?? 20,
          reservation_max_party_size: r.reservation_max_party_size ?? 10,
          reservation_advance_days: r.reservation_advance_days ?? 30,
          reservation_min_notice_hours: r.reservation_min_notice_hours ?? 1,
        })
        const { data: h } = await supabase
          .from('restaurant_hours')
          .select('*')
          .eq('restaurant_id', r.id)
          .order('day_of_week')
        if (h && h.length > 0) setHours(h)
      }
    }
    load()
  }, [isNew]) // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'name') next.slug = slugify(String(value))
      return next
    })
  }

  function updateHour(day: number, field: string, value: string | boolean) {
    setHours(h => h.map(r => r.day_of_week === day ? { ...r, [field]: value } : r))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Restaurant name is required', 'error'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let restaurantId = restaurant?.id

    if (restaurant) {
      const { error } = await supabase.from('restaurants').update({
        ...form, updated_at: new Date().toISOString(),
      }).eq('id', restaurant.id)
      if (error) { toast(error.message, 'error'); setLoading(false); return }
    } else {
      const { data, error } = await supabase.from('restaurants').insert({
        ...form, owner_user_id: user.id, is_active: true,
      }).select().single()
      if (error) { toast(error.message, 'error'); setLoading(false); return }
      restaurantId = data.id
      setRestaurant(data)

      // Save hours then select the new restaurant and go to its dashboard
      if (restaurantId) {
        await supabase.from('restaurant_hours').delete().eq('restaurant_id', restaurantId)
        const hoursToInsert = hours.map(h => ({ ...h, restaurant_id: restaurantId! }))
        await supabase.from('restaurant_hours').insert(hoursToInsert)
      }
      toast('Restaurant created! Opening dashboard…', 'success')
      setLoading(false)
      window.location.href = `/api/restaurant/select?id=${restaurantId}`
      return
    }

    // Save hours (edit mode)
    if (restaurantId) {
      await supabase.from('restaurant_hours').delete().eq('restaurant_id', restaurantId)
      const hoursToInsert = hours.map(h => ({ ...h, restaurant_id: restaurantId! }))
      await supabase.from('restaurant_hours').insert(hoursToInsert)
    }

    toast('Restaurant saved successfully!', 'success')
    setLoading(false)
  }

  return (
    <>
      <Header
        title="Restaurant Setup"
        subtitle="Configure your restaurant profile and ordering settings"
        actions={
          <Button onClick={handleSave} loading={loading} size="md">
            <Save size={16} /> Save Changes
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Basic Information</h3>
            <div className="grid gap-4">
              <Input label="Restaurant Name *" placeholder="My Restaurant" value={form.name}
                onChange={e => setField('name', e.target.value)} />
              <Input label="URL Slug" placeholder="my-restaurant"
                value={form.slug} hint={`Customers will visit: /restaurant/${form.slug}`}
                onChange={e => setField('slug', e.target.value)} />
              <Textarea label="Description" placeholder="Tell customers about your restaurant…"
                value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Contact & Location</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Address" placeholder="123 Main St, City, State" value={form.address}
                  onChange={e => setField('address', e.target.value)} />
              </div>
              <Input label="Phone" placeholder="+1 (555) 000-0000" value={form.phone}
                onChange={e => setField('phone', e.target.value)} />
              <Input label="Email" type="email" placeholder="info@restaurant.com" value={form.email}
                onChange={e => setField('email', e.target.value)} />
              <div className="sm:col-span-2">
                <Input label="Website" placeholder="https://restaurant.com" value={form.website}
                  onChange={e => setField('website', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Pricing</h3>
            <Input
              label="Sales Tax Rate (%)"
              type="number"
              min="0"
              max="30"
              step="0.001"
              placeholder="e.g. 8.875"
              value={form.tax_rate === 0 ? '' : String(form.tax_rate)}
              onChange={e => setField('tax_rate', parseFloat(e.target.value) || 0)}
              hint="Applied to every customer order at checkout. Enter 0 for no tax."
            />
          </div>

          {/* Reservation Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays size={18} className="text-orange-500" /> Reservations
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer"
                    checked={form.reservations_enabled}
                    onChange={e => setField('reservations_enabled', e.target.checked)} />
                  <div className="w-10 h-6 bg-gray-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {form.reservations_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {form.reservations_enabled && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Capacity per time slot (people)"
                  type="number" min="1" max="500"
                  value={String(form.reservation_capacity)}
                  onChange={e => setField('reservation_capacity', parseInt(e.target.value) || 1)}
                  hint="Max total guests accepted at the same time slot."
                />
                <Input
                  label="Max party size"
                  type="number" min="1" max="100"
                  value={String(form.reservation_max_party_size)}
                  onChange={e => setField('reservation_max_party_size', parseInt(e.target.value) || 1)}
                  hint="Largest group a customer can book online."
                />
                <Input
                  label="Advance booking (days)"
                  type="number" min="1" max="365"
                  value={String(form.reservation_advance_days)}
                  onChange={e => setField('reservation_advance_days', parseInt(e.target.value) || 1)}
                  hint="How far ahead customers can reserve."
                />
                <Input
                  label="Minimum notice (hours)"
                  type="number" min="0" max="72"
                  value={String(form.reservation_min_notice_hours)}
                  onChange={e => setField('reservation_min_notice_hours', parseInt(e.target.value) || 0)}
                  hint="Earliest a customer can book before the slot."
                />
              </div>
            )}

            {!form.reservations_enabled && (
              <p className="text-sm text-gray-400">
                Enable reservations to let customers book tables directly from your public page.
              </p>
            )}
          </div>

          {/* Operation Hours */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Clock size={18} className="text-orange-500" /> Operation Hours
            </h3>
            <Select label="Timezone" value={form.timezone} options={TIMEZONES}
              onChange={e => setField('timezone', e.target.value)} />
            <div className="mt-4 space-y-3">
              {hours.map(h => (
                <div key={h.day_of_week} className="flex items-center gap-3 flex-wrap">
                  <span className="w-24 text-sm text-gray-700 font-medium shrink-0">{DAY_NAMES[h.day_of_week]}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={h.is_closed}
                      onChange={e => updateHour(h.day_of_week, 'is_closed', e.target.checked)}
                      className="rounded" />
                    <span className="text-gray-500">Closed</span>
                  </label>
                  {!h.is_closed && (
                    <>
                      <input type="time" value={h.open_time} disabled={h.is_closed}
                        onChange={e => updateHour(h.day_of_week, 'open_time', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
                      <span className="text-gray-400 text-sm">to</span>
                      <input type="time" value={h.close_time} disabled={h.is_closed}
                        onChange={e => updateHour(h.day_of_week, 'close_time', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Ordering Options */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Ordering Options</h3>
            <div className="space-y-4">
              {[
                { key: 'online_ordering_enabled', label: 'Online Ordering', desc: 'Enable customer ordering' },
                { key: 'pickup_enabled', label: 'Pickup', desc: 'Customers pick up at restaurant' },
                { key: 'dine_in_enabled', label: 'Dine-In', desc: 'Customers order at table' },
                { key: 'delivery_enabled', label: 'Delivery', desc: 'Deliver to customer address' },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5">
                    <input type="checkbox" className="sr-only peer"
                      checked={form[opt.key as keyof typeof form] as boolean}
                      onChange={e => setField(opt.key as keyof typeof form, e.target.checked as boolean)} />
                    <div className="w-10 h-6 bg-gray-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Alert Sounds */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Bell size={16} className="text-orange-500" /> Alert Sounds
            </h3>
            <p className="text-xs text-gray-400 mb-5">Plays in this browser tab when new activity arrives</p>

            {/* Orders */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-orange-500">O</span>
                </div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Orders</p>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="orderSoundMode" value="none"
                    checked={orderSoundMode === 'none'} onChange={() => setOrderSoundMode('none')}
                    className="mt-0.5 accent-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">No sound</p>
                    <p className="text-xs text-gray-400">Silent — visual only</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="orderSoundMode" value="repeat"
                    checked={orderSoundMode === 'repeat'} onChange={() => setOrderSoundMode('repeat')}
                    className="mt-0.5 accent-orange-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Ring a set number of times</p>
                    {orderSoundMode === 'repeat' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">Ring</span>
                        <input type="number" min={1} max={10} value={orderRepeatCount}
                          onChange={e => setOrderRepeatCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                          className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-orange-400" />
                        <span className="text-xs text-gray-500">time{orderRepeatCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="orderSoundMode" value="until_click"
                    checked={orderSoundMode === 'until_click'} onChange={() => setOrderSoundMode('until_click')}
                    className="mt-0.5 accent-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ring until acknowledged</p>
                    <p className="text-xs text-gray-400">Repeats every 3 s until you click</p>
                  </div>
                </label>
              </div>
              <button type="button" onClick={() => playBell()}
                className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition">
                <Bell size={12} /> Test order sound
              </button>
            </div>

            <div className="border-t border-gray-100 pt-5">
              {/* Reservations */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-blue-500">R</span>
                </div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reservations</p>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="reservationSoundMode" value="none"
                    checked={reservationSoundMode === 'none'} onChange={() => setReservationSoundMode('none')}
                    className="mt-0.5 accent-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">No sound</p>
                    <p className="text-xs text-gray-400">Silent — visual only</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="reservationSoundMode" value="repeat"
                    checked={reservationSoundMode === 'repeat'} onChange={() => setReservationSoundMode('repeat')}
                    className="mt-0.5 accent-orange-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Ring a set number of times</p>
                    {reservationSoundMode === 'repeat' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">Ring</span>
                        <input type="number" min={1} max={10} value={reservationRepeatCount}
                          onChange={e => setReservationRepeatCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                          className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-orange-400" />
                        <span className="text-xs text-gray-500">time{reservationRepeatCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="reservationSoundMode" value="until_click"
                    checked={reservationSoundMode === 'until_click'} onChange={() => setReservationSoundMode('until_click')}
                    className="mt-0.5 accent-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ring until acknowledged</p>
                    <p className="text-xs text-gray-400">Repeats every 3 s until you click</p>
                  </div>
                </label>
              </div>
              <button type="button" onClick={() => playBell()}
                className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                <Bell size={12} /> Test reservation sound
              </button>
            </div>
          </div>

          {restaurant && (
            <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6">
              <p className="text-sm font-semibold text-orange-800 mb-1">Your public ordering page</p>
              <p className="text-xs text-orange-600 break-all">/restaurant/{form.slug}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400 text-sm">Loading…</div>}>
      <SetupContent />
    </Suspense>
  )
}
