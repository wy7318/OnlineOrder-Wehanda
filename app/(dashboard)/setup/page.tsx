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
import { Globe, Phone, Mail, MapPin, Clock, Save, Bell, CalendarDays, ImageIcon, X, UtensilsCrossed, Star, CreditCard } from 'lucide-react'
import Image from 'next/image'
import { useNotificationSettings } from '@/store/notificationSettings'
import { playBell } from '@/lib/utils/bellSound'
import LoyaltySetupWizard from '@/components/dashboard/LoyaltySetupWizard'
import StripeSetupWizard from '@/components/dashboard/StripeSetupWizard'
import type { StripeSettings } from '@/components/dashboard/StripeSetupWizard'
import type { LoyaltyProgram } from '@/lib/types'

const CUISINE_OPTIONS = [
  // World cuisines
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Korean', 'Thai',
  'Indian', 'Mediterranean', 'Vietnamese', 'Filipino', 'French', 'Spanish',
  'Greek', 'Middle Eastern', 'Caribbean', 'Hawaiian',
  // Food styles
  'Pizza', 'Burgers', 'Sandwiches', 'Sushi', 'Tacos', 'Ramen', 'Noodles',
  'BBQ', 'Wings', 'Fried Chicken', 'Seafood', 'Steak',
  // Meal occasions
  'Breakfast & Brunch', 'Fast Food', 'Street Food', 'Fine Dining',
  // Diet / lifestyle
  'Healthy', 'Salads', 'Vegan', 'Vegetarian',
  // Sweets & drinks
  'Desserts', 'Bakery', 'Ice Cream', 'Coffee & Tea', 'Bubble Tea', 'Juice Bar',
]

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
    orderSoundMode, orderRepeatCount, orderFlashEnabled,
    setOrderSoundMode, setOrderRepeatCount, setOrderFlashEnabled,
    reservationSoundMode, reservationRepeatCount, reservationFlashEnabled,
    setReservationSoundMode, setReservationRepeatCount, setReservationFlashEnabled,
  } = useNotificationSettings()
  const [loading, setLoading] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null)
  const [loyaltyWizardOpen, setLoyaltyWizardOpen] = useState(false)
  const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null)
  const [stripeWizardOpen, setStripeWizardOpen] = useState(false)

  // Handle return from Stripe OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_connected') === '1') {
      toast('Stripe connected successfully!', 'success')
      window.history.replaceState({}, '', '/setup')
      fetch('/api/stripe/settings').then(r => r.ok ? r.json() : null).then(d => { if (d) setStripeSettings(d) })
    } else if (params.get('stripe_error')) {
      const code = params.get('stripe_error')
      const detail = params.get('detail')
      const messages: Record<string, string> = {
        not_configured: 'Stripe is not configured on the platform yet.',
        access_denied: 'Stripe authorization was cancelled.',
        exchange_failed: `Stripe connection failed: ${detail ?? 'unknown error'}`,
        db_save_failed: `Connected to Stripe but failed to save: ${detail ?? 'unknown error'}`,
      }
      toast(messages[code!] ?? 'Stripe connection failed. Please try again.', 'error')
      window.history.replaceState({}, '', '/setup')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([])
  const [hours, setHours] = useState(defaultHours())
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [form, setForm] = useState({
    name: '', slug: '', address: '', phone: '', email: '', website: '',
    description: '', timezone: 'America/New_York',
    logo_url: '', cover_image_url: '',
    online_ordering_enabled: true, pickup_enabled: true,
    dine_in_enabled: false, delivery_enabled: false,
    tax_rate: 0,
    reservations_enabled: false,
    reservation_auto_confirm: false,
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
        setCuisineTypes(r.cuisine_types ?? [])
        setForm({
          name: r.name, slug: r.slug, address: r.address ?? '',
          phone: r.phone ?? '', email: r.email ?? '', website: r.website ?? '',
          description: r.description ?? '', timezone: r.timezone,
          logo_url: r.logo_url ?? '', cover_image_url: r.cover_image_url ?? '',
          online_ordering_enabled: r.online_ordering_enabled,
          pickup_enabled: r.pickup_enabled, dine_in_enabled: r.dine_in_enabled,
          delivery_enabled: r.delivery_enabled,
          tax_rate: r.tax_rate ?? 0,
          reservations_enabled: r.reservations_enabled ?? false,
          reservation_auto_confirm: r.reservation_auto_confirm ?? false,
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

        // Load loyalty program
        const lpRes = await fetch(`/api/loyalty/program?restaurant_id=${r.id}`)
        if (lpRes.ok) setLoyaltyProgram(await lpRes.json())

        // Load Stripe settings
        const sRes = await fetch('/api/stripe/settings')
        if (sRes.ok) setStripeSettings(await sRes.json())
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

  async function uploadRestaurantImage(file: File, type: 'logo' | 'cover', restaurantId: string): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${restaurantId}/${type}.${ext}`
    const { error } = await supabase.storage.from('restaurant-images').upload(path, file, { upsert: true })
    if (error) { toast(`Image upload failed: ${error.message}`, 'error'); return null }
    return supabase.storage.from('restaurant-images').getPublicUrl(path).data.publicUrl
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Restaurant name is required', 'error'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let restaurantId = restaurant?.id
    let logoUrl = form.logo_url || null
    let coverUrl = form.cover_image_url || null

    if (restaurant) {
      // Upload any pending images first (restaurantId is known)
      if (logoFile) { const u = await uploadRestaurantImage(logoFile, 'logo', restaurantId!); if (u) logoUrl = u }
      if (coverFile) { const u = await uploadRestaurantImage(coverFile, 'cover', restaurantId!); if (u) coverUrl = u }

      const { error } = await supabase.from('restaurants').update({
        ...form, logo_url: logoUrl, cover_image_url: coverUrl,
        cuisine_types: cuisineTypes, updated_at: new Date().toISOString(),
      }).eq('id', restaurant.id)
      if (error) { toast(error.message, 'error'); setLoading(false); return }
    } else {
      // Create restaurant first (no images yet)
      const { data, error } = await supabase.from('restaurants').insert({
        ...form, logo_url: null, cover_image_url: null,
        cuisine_types: cuisineTypes, owner_user_id: user.id, is_active: true,
      }).select().single()
      if (error) { toast(error.message, 'error'); setLoading(false); return }
      restaurantId = data.id
      setRestaurant(data)

      // Now upload images with the new restaurantId
      if (logoFile) { const u = await uploadRestaurantImage(logoFile, 'logo', restaurantId!); if (u) logoUrl = u }
      if (coverFile) { const u = await uploadRestaurantImage(coverFile, 'cover', restaurantId!); if (u) coverUrl = u }
      if (logoUrl || coverUrl) {
        await supabase.from('restaurants').update({ logo_url: logoUrl, cover_image_url: coverUrl }).eq('id', restaurantId!)
      }

      // Save hours then redirect to the new restaurant dashboard
      if (restaurantId) {
        await supabase.from('restaurant_hours').delete().eq('restaurant_id', restaurantId)
        await supabase.from('restaurant_hours').insert(hours.map(h => ({ ...h, restaurant_id: restaurantId! })))
      }
      toast('Restaurant created! Opening dashboard…', 'success')
      setLoading(false)
      window.location.href = `/api/restaurant/select?id=${restaurantId}`
      return
    }

    // Save hours (edit mode)
    if (restaurantId) {
      await supabase.from('restaurant_hours').delete().eq('restaurant_id', restaurantId)
      await supabase.from('restaurant_hours').insert(hours.map(h => ({ ...h, restaurant_id: restaurantId! })))
    }

    // Sync local state with saved URLs and clear pending files
    setForm(f => ({ ...f, logo_url: logoUrl ?? '', cover_image_url: coverUrl ?? '' }))
    setLogoFile(null); setLogoPreview('')
    setCoverFile(null); setCoverPreview('')

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

          {/* Restaurant Photos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <ImageIcon size={17} className="text-brand-500" /> Restaurant Photos
            </h3>
            <p className="text-xs text-gray-400 mb-5">These images appear on your public customer ordering page.</p>

            {/* Live preview */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 mb-5 border border-gray-100">
              {/* Cover banner */}
              <div className="relative h-32">
                {(coverPreview || form.cover_image_url) ? (
                  <Image src={coverPreview || form.cover_image_url} alt="Cover preview" fill className="object-cover" />
                ) : (
                  <div className="h-full bg-gradient-to-br from-brand-100 via-amber-50 to-brand-50 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-medium">Cover photo will appear here</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              {/* Logo + name overlaid */}
              <div className="absolute bottom-3 left-3 flex items-end gap-2">
                <div className="w-10 h-10 rounded-xl border-2 border-white/40 shadow-lg bg-white overflow-hidden shrink-0">
                  {(logoPreview || form.logo_url) ? (
                    <Image src={logoPreview || form.logo_url} alt="Logo preview" width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-brand-50 flex items-center justify-center text-base">🍣</div>
                  )}
                </div>
                <span className="text-white text-xs font-bold drop-shadow">{form.name || 'Restaurant Name'}</span>
              </div>
              <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                <span className="text-white text-[10px] font-bold">Preview</span>
              </div>
            </div>

            {/* Upload controls */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Cover photo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Cover Photo</p>
                <div className="relative h-28 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-brand-300 transition group cursor-pointer bg-gray-50">
                  {(coverPreview || form.cover_image_url) ? (
                    <Image src={coverPreview || form.cover_image_url} alt="Cover" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1.5 text-gray-400">
                      <ImageIcon size={20} className="opacity-50" />
                      <span className="text-xs font-medium">Click to upload</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                    <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/50 px-2.5 py-1 rounded-lg transition">
                      {(coverPreview || form.cover_image_url) ? 'Change' : 'Upload'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null
                      setCoverFile(file)
                      setCoverPreview(file ? URL.createObjectURL(file) : '')
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-gray-400">Recommended: 1200×400px</p>
                  {(coverPreview || form.cover_image_url) && (
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverPreview(''); setForm(f => ({ ...f, cover_image_url: '' })) }}
                      className="flex items-center gap-0.5 text-[11px] text-red-400 hover:text-red-600 transition"
                    >
                      <X size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Logo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Restaurant Logo</p>
                <div className="relative h-28 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-brand-300 transition group cursor-pointer bg-gray-50">
                  {(logoPreview || form.logo_url) ? (
                    <Image src={logoPreview || form.logo_url} alt="Logo" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1.5 text-gray-400">
                      <ImageIcon size={20} className="opacity-50" />
                      <span className="text-xs font-medium">Click to upload</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                    <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/50 px-2.5 py-1 rounded-lg transition">
                      {(logoPreview || form.logo_url) ? 'Change' : 'Upload'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null
                      setLogoFile(file)
                      setLogoPreview(file ? URL.createObjectURL(file) : '')
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-gray-400">Recommended: 400×400px square</p>
                  {(logoPreview || form.logo_url) && (
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(''); setForm(f => ({ ...f, logo_url: '' })) }}
                      className="flex items-center gap-0.5 text-[11px] text-red-400 hover:text-red-600 transition"
                    >
                      <X size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(logoFile || coverFile) && (
              <p className="text-xs text-brand-600 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 mt-4">
                You have unsaved photo changes — click <strong>Save Changes</strong> above to upload them.
              </p>
            )}
          </div>

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

          {/* Cuisine Types */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <UtensilsCrossed size={17} className="text-brand-500" /> Cuisine & Category
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Select all that apply — shown to customers on your public page. Pick up to 5.
            </p>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map(c => {
                const selected = cuisineTypes.includes(c)
                const atMax = cuisineTypes.length >= 5
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setCuisineTypes(prev => prev.filter(x => x !== c))
                      } else if (!atMax) {
                        setCuisineTypes(prev => [...prev, c])
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition select-none ${
                      selected
                        ? 'bg-brand-500 text-white border-brand-500'
                        : atMax
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
            {cuisineTypes.length > 0 && (
              <p className="text-xs text-brand-600 mt-3 font-medium">
                {cuisineTypes.length}/5 selected: {cuisineTypes.join(', ')}
              </p>
            )}
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
                <CalendarDays size={18} className="text-brand-500" /> Reservations
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer"
                    checked={form.reservations_enabled}
                    onChange={e => setField('reservations_enabled', e.target.checked)} />
                  <div className="w-10 h-6 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {form.reservations_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {form.reservations_enabled && (
              <div className="space-y-4">
                {/* Auto-confirm toggle */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Auto-confirm reservations</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When ON, new bookings are immediately confirmed and customers receive a confirmation email.
                      When OFF, bookings stay pending until you review and confirm them manually.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5">
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer"
                        checked={form.reservation_auto_confirm}
                        onChange={e => setField('reservation_auto_confirm', e.target.checked)} />
                      <div className="w-10 h-6 bg-gray-200 peer-checked:bg-green-500 rounded-full transition-colors" />
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-14">
                      {form.reservation_auto_confirm ? 'On' : 'Off'}
                    </span>
                  </label>
                </div>

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
              <Clock size={18} className="text-brand-500" /> Operation Hours
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
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400" />
                      <span className="text-gray-400 text-sm">to</span>
                      <input type="time" value={h.close_time} disabled={h.is_closed}
                        onChange={e => updateHour(h.day_of_week, 'close_time', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400" />
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
                    <div className="w-10 h-6 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
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
              <Bell size={16} className="text-brand-500" /> Alert Sounds
            </h3>
            <p className="text-xs text-gray-400 mb-5">Plays in this browser tab when new activity arrives</p>

            {/* Orders */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-brand-500">O</span>
                </div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Orders</p>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="orderSoundMode" value="none"
                    checked={orderSoundMode === 'none'} onChange={() => setOrderSoundMode('none')}
                    className="mt-0.5 accent-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">No sound</p>
                    <p className="text-xs text-gray-400">Silent — visual only</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="orderSoundMode" value="repeat"
                    checked={orderSoundMode === 'repeat'} onChange={() => setOrderSoundMode('repeat')}
                    className="mt-0.5 accent-brand-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Ring a set number of times</p>
                    {orderSoundMode === 'repeat' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">Ring</span>
                        <input type="number" min={1} max={10} value={orderRepeatCount}
                          onChange={e => setOrderRepeatCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                          className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-brand-400" />
                        <span className="text-xs text-gray-500">time{orderRepeatCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="orderSoundMode" value="until_click"
                    checked={orderSoundMode === 'until_click'} onChange={() => setOrderSoundMode('until_click')}
                    className="mt-0.5 accent-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ring until acknowledged</p>
                    <p className="text-xs text-gray-400">Repeats every 3 s until you click</p>
                  </div>
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => playBell()}
                  className="flex items-center gap-1.5 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
                  <Bell size={12} /> Test order sound
                </button>
                {/* Screen flash toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer"
                      checked={orderFlashEnabled}
                      onChange={e => setOrderFlashEnabled(e.target.checked)} />
                    <div className="w-8 h-4 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Screen flash</span>
                </label>
              </div>
              {orderFlashEnabled && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Screen blinks with each ring — follows the same count/mode as sound
                </p>
              )}
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
                    className="mt-0.5 accent-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">No sound</p>
                    <p className="text-xs text-gray-400">Silent — visual only</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="reservationSoundMode" value="repeat"
                    checked={reservationSoundMode === 'repeat'} onChange={() => setReservationSoundMode('repeat')}
                    className="mt-0.5 accent-brand-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Ring a set number of times</p>
                    {reservationSoundMode === 'repeat' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">Ring</span>
                        <input type="number" min={1} max={10} value={reservationRepeatCount}
                          onChange={e => setReservationRepeatCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                          className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-brand-400" />
                        <span className="text-xs text-gray-500">time{reservationRepeatCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="reservationSoundMode" value="until_click"
                    checked={reservationSoundMode === 'until_click'} onChange={() => setReservationSoundMode('until_click')}
                    className="mt-0.5 accent-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ring until acknowledged</p>
                    <p className="text-xs text-gray-400">Repeats every 3 s until you click</p>
                  </div>
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => playBell()}
                  className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                  <Bell size={12} /> Test reservation sound
                </button>
                {/* Screen flash toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer"
                      checked={reservationFlashEnabled}
                      onChange={e => setReservationFlashEnabled(e.target.checked)} />
                    <div className="w-8 h-4 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Screen flash</span>
                </label>
              </div>
              {reservationFlashEnabled && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Screen blinks with each ring — follows the same count/mode as sound
                </p>
              )}
            </div>
          </div>

          {restaurant && (
            <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6">
              <p className="text-sm font-semibold text-brand-800 mb-1">Your public ordering page</p>
              <p className="text-xs text-brand-600 break-all">/restaurant/{form.slug}</p>
            </div>
          )}

          {/* Loyalty Program card */}
          {restaurant && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star size={17} className="text-amber-500" /> Loyalty Program
                </h3>
                {loyaltyProgram?.is_enabled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                )}
              </div>
              {loyaltyProgram?.is_enabled ? (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-bold text-gray-800">{loyaltyProgram.program_name}</p>
                  <p className="text-xs text-gray-500">{loyaltyProgram.points_per_dollar} pt / $1 earned · {loyaltyProgram.points_to_redeem} pts = $1 off</p>
                  {loyaltyProgram.welcome_bonus_points > 0 && (
                    <p className="text-xs text-amber-600">+{loyaltyProgram.welcome_bonus_points} welcome bonus</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-4">
                  Reward repeat customers with a points-based loyalty program.
                </p>
              )}
              <button
                type="button"
                onClick={() => setLoyaltyWizardOpen(true)}
                className="w-full py-2 rounded-xl border-2 border-brand-200 text-brand-600 text-sm font-bold hover:bg-brand-50 transition"
              >
                {loyaltyProgram ? 'Edit Program' : 'Set Up Rewards'}
              </button>
            </div>
          )}

          {/* Stripe Payments card */}
          {restaurant && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard size={17} className="text-indigo-500" /> Online Payments
                </h3>
                {stripeSettings?.stripe_enabled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                )}
              </div>
              {stripeSettings?.stripe_enabled ? (
                <div className="space-y-1.5 mb-4">
                  <p className="text-sm font-bold text-gray-800">Stripe connected</p>
                  <p className="text-xs text-gray-500 font-mono">{stripeSettings.stripe_account_id?.slice(0, 14)}…</p>
                  <p className="text-xs text-gray-400">
                    Mode: <span className={`font-semibold ${stripeSettings.stripe_mode === 'test' ? 'text-amber-600' : 'text-green-600'}`}>
                      {stripeSettings.stripe_mode === 'test' ? 'Test (admin)' : 'Live'}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-4">
                  Accept card payments online via Stripe. Customers pay at checkout instead of at the restaurant.
                </p>
              )}
              <button
                type="button"
                onClick={() => setStripeWizardOpen(true)}
                className="w-full py-2 rounded-xl border-2 border-indigo-200 text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition"
              >
                {stripeSettings?.stripe_enabled ? 'Manage Stripe' : 'Set Up Payments'}
              </button>
            </div>
          )}
        </div>
      </div>

      {loyaltyWizardOpen && restaurant && (
        <LoyaltySetupWizard
          restaurantId={restaurant.id}
          existing={loyaltyProgram}
          onSaved={saved => { setLoyaltyProgram(saved); setLoyaltyWizardOpen(false) }}
          onClose={() => setLoyaltyWizardOpen(false)}
        />
      )}

      {stripeWizardOpen && restaurant && (
        <StripeSetupWizard
          restaurantId={restaurant.id}
          existing={stripeSettings}
          onSaved={saved => { setStripeSettings(saved); setStripeWizardOpen(false) }}
          onClose={() => setStripeWizardOpen(false)}
        />
      )}
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
