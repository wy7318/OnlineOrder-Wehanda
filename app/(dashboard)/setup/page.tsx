'use client'

import { useState, useEffect } from 'react'
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
import { Globe, Phone, Mail, MapPin, Clock, Save } from 'lucide-react'

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

export default function SetupPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [hours, setHours] = useState(defaultHours())
  const [form, setForm] = useState({
    name: '', slug: '', address: '', phone: '', email: '', website: '',
    description: '', timezone: 'America/New_York',
    online_ordering_enabled: true, pickup_enabled: true,
    dine_in_enabled: false, delivery_enabled: false,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: r } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_user_id', user.id)
        .single()

      if (r) {
        setRestaurant(r)
        setForm({
          name: r.name, slug: r.slug, address: r.address ?? '',
          phone: r.phone ?? '', email: r.email ?? '', website: r.website ?? '',
          description: r.description ?? '', timezone: r.timezone,
          online_ordering_enabled: r.online_ordering_enabled,
          pickup_enabled: r.pickup_enabled, dine_in_enabled: r.dine_in_enabled,
          delivery_enabled: r.delivery_enabled,
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
  }, [])

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
    }

    // Save hours
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
