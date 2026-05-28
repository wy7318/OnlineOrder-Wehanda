'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  ArrowLeft, Copy, Check, MailCheck, Ban, ShieldOff,
  Plus, X, Package, Activity, MapPin, MessageSquare,
  ShoppingBag, CalendarDays, TrendingUp, Clock, Users,
  Smartphone, Monitor, Apple, Tablet,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'
import type {
  Customer, CustomerEvent, CustomerSegment,
  CustomerDietaryFlag, CustomerAddress, Order,
  AcquisitionSource, DietaryFlagType, CustomerEventType,
} from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface CustomerProfile {
  customer: Customer
  segments: (CustomerSegment & { added_at: string; added_by: string })[]
  dietary_flags: CustomerDietaryFlag[]
  addresses: CustomerAddress[]
  stats: {
    total_orders: number
    lifetime_value: number
    avg_order_value: number
    last_order_at: string | null
    first_order_at: string | null
    days_since_last: number | null
  }
}

type Tab = 'orders' | 'reservations' | 'events' | 'addresses' | 'communication' | 'info'

interface Reservation {
  id: string
  reservation_date: string
  reservation_time: string
  party_size: number
  status: string
  notes: string | null
  customer_name: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACQUISITION_LABELS: Record<AcquisitionSource, string> = {
  organic: 'Organic', google_ad: 'Google Ad', instagram_ad: 'Instagram',
  facebook_ad: 'Facebook', referral: 'Referral', qr_code: 'QR Code',
  walk_in: 'Walk-in', loyalty_signup: 'Loyalty', other: 'Other',
}

const DIETARY_FLAGS: DietaryFlagType[] = [
  'vegetarian','vegan','gluten_free','halal','kosher','nut_allergy','dairy_free','shellfish_allergy','other',
]
const DIETARY_LABELS: Record<DietaryFlagType, string> = {
  vegetarian: 'Vegetarian', vegan: 'Vegan', gluten_free: 'Gluten-Free',
  halal: 'Halal', kosher: 'Kosher', nut_allergy: 'Nut Allergy',
  dairy_free: 'Dairy-Free', shellfish_allergy: 'Shellfish Allergy', other: 'Other',
}

const EVENT_ICONS: Partial<Record<CustomerEventType, React.ElementType>> = {
  order_placed: ShoppingBag, order_cancelled: X, order_refunded: ArrowLeft,
  reservation_made: CalendarDays, reservation_cancelled: X,
  login: Check, logout: X, app_session_started: Monitor,
  email_opened: MailCheck, email_clicked: MailCheck, sms_opened: Smartphone,
  loyalty_points_earned: TrendingUp, loyalty_points_redeemed: TrendingUp,
  promo_redeemed: Check, review_submitted: MessageSquare,
}

const EVENT_LABELS: Partial<Record<CustomerEventType, string>> = {
  order_placed: 'Placed an order',
  order_cancelled: 'Cancelled an order',
  order_refunded: 'Received a refund',
  reservation_made: 'Made a reservation',
  reservation_cancelled: 'Cancelled a reservation',
  login: 'Signed in',
  logout: 'Signed out',
  email_opened: 'Opened email campaign',
  email_clicked: 'Clicked email link',
  sms_opened: 'Opened SMS',
  loyalty_points_earned: 'Earned loyalty points',
  loyalty_points_redeemed: 'Redeemed loyalty points',
  promo_redeemed: 'Redeemed a promo',
  review_submitted: 'Submitted a review',
  app_session_started: 'Started app session',
  cart_abandoned: 'Abandoned cart',
  item_viewed: 'Viewed menu item',
  support_ticket_opened: 'Opened support ticket',
  promo_ignored: 'Ignored promo',
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' }> = {
  new: { label: 'New', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'orange' },
  preparing: { label: 'Preparing', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  mobile_web: Smartphone, desktop_web: Monitor, ios_app: Apple, android_app: Tablet,
}

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(c: Customer) {
  const n = c.first_name ? `${c.first_name} ${c.last_name ?? ''}` : c.name
  return n.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function displayName(c: Customer) {
  return c.first_name ? `${c.first_name} ${c.last_name ?? ''}`.trim() : c.name
}

function relativeDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function groupByDay(events: CustomerEvent[]) {
  const groups: Record<string, CustomerEvent[]> = {}
  for (const e of events) {
    const day = e.event_at.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(e)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('orders')

  // Orders tab
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Events tab
  const [events, setEvents] = useState<CustomerEvent[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsLoading, setEventsLoading] = useState(false)

  // Reservations tab
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationsTotal, setReservationsTotal] = useState(0)
  const [reservationsLoading, setReservationsLoading] = useState(false)

  // Editing
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tag input
  const [tagInput, setTagInput] = useState('')
  const [tagLoading, setTagLoading] = useState(false)

  // Segment modal
  const [allSegments, setAllSegments] = useState<CustomerSegment[]>([])
  const [segModalOpen, setSegModalOpen] = useState(false)
  const [segLoading, setSegLoading] = useState(false)

  // Dietary flags
  const [dietModalOpen, setDietModalOpen] = useState(false)
  const [dietLoading, setDietLoading] = useState(false)

  // Blocking
  const [blockLoading, setBlockLoading] = useState(false)

  // Copy feedback
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProfile()
    loadAllSegments()
  }, [id])

  useEffect(() => {
    if (activeTab === 'orders') loadOrders()
  }, [activeTab, ordersPage])

  useEffect(() => {
    if (activeTab === 'events') loadEvents()
  }, [activeTab, eventsPage])

  useEffect(() => {
    if (activeTab === 'reservations') loadReservations()
  }, [activeTab])

  async function loadProfile() {
    setLoading(true)
    const res = await fetch(`/api/customers/${id}`)
    if (res.ok) {
      const data: CustomerProfile = await res.json()
      setProfile(data)
      setNotes(data.customer.notes ?? '')
    } else {
      toast('Customer not found', 'error')
      router.push('/customers')
    }
    setLoading(false)
  }

  async function loadAllSegments() {
    const res = await fetch('/api/segments')
    if (res.ok) setAllSegments(await res.json())
  }

  async function loadOrders() {
    setOrdersLoading(true)
    const res = await fetch(`/api/customers/${id}/orders?page=${ordersPage}&per_page=10`)
    if (res.ok) {
      const data = await res.json()
      setOrders(data.data ?? [])
      setOrdersTotal(data.total ?? 0)
    }
    setOrdersLoading(false)
  }

  async function loadEvents() {
    setEventsLoading(true)
    const res = await fetch(`/api/customers/${id}/events?page=${eventsPage}&per_page=20`)
    if (res.ok) {
      const data = await res.json()
      setEvents(data.data ?? [])
      setEventsTotal(data.total ?? 0)
    }
    setEventsLoading(false)
  }

  async function loadReservations() {
    setReservationsLoading(true)
    const res = await fetch(`/api/customers/${id}/reservations`)
    if (res.ok) {
      const data = await res.json()
      setReservations(data.data ?? [])
      setReservationsTotal(data.total ?? 0)
    }
    setReservationsLoading(false)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleNotesChange(v: string) {
    setNotes(v)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      setNotesSaving(true)
      await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: v }),
      })
      setNotesSaving(false)
    }, 800)
  }

  async function addTag() {
    if (!tagInput.trim()) return
    setTagLoading(true)
    const res = await fetch(`/api/customers/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: tagInput.trim() }),
    })
    if (res.ok) {
      const { tags } = await res.json()
      setProfile(p => p ? { ...p, customer: { ...p.customer, tags } } : p)
      setTagInput('')
    }
    setTagLoading(false)
  }

  async function removeTag(tag: string) {
    const res = await fetch(`/api/customers/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' })
    if (res.ok) {
      const { tags } = await res.json()
      setProfile(p => p ? { ...p, customer: { ...p.customer, tags } } : p)
    }
  }

  async function addSegment(segmentId: string) {
    setSegLoading(true)
    const res = await fetch(`/api/customers/${id}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment_id: segmentId }),
    })
    if (res.ok) { await loadProfile(); setSegModalOpen(false) }
    setSegLoading(false)
  }

  async function removeSegment(segmentId: string) {
    await fetch(`/api/customers/${id}/segments/${segmentId}`, { method: 'DELETE' })
    setProfile(p => p ? { ...p, segments: p.segments.filter(s => s.id !== segmentId) } : p)
  }

  async function addDietaryFlag(flagType: DietaryFlagType) {
    setDietLoading(true)
    const res = await fetch(`/api/customers/${id}/dietary-flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_type: flagType }),
    })
    if (res.ok) { await loadProfile(); setDietModalOpen(false) }
    setDietLoading(false)
  }

  async function removeDietaryFlag(flagType: DietaryFlagType) {
    await fetch(`/api/customers/${id}/dietary-flags/${flagType}`, { method: 'DELETE' })
    setProfile(p => p ? { ...p, dietary_flags: p.dietary_flags.filter(f => f.flag_type !== flagType) } : p)
  }

  async function toggleBlock() {
    if (!profile) return
    setBlockLoading(true)
    const isBlocked = profile.customer.is_blocked
    const res = await fetch(`/api/customers/${id}/block`, {
      method: isBlocked ? 'DELETE' : 'POST',
    })
    if (res.ok) {
      const data = await res.json()
      setProfile(p => p ? { ...p, customer: { ...p.customer, is_blocked: data.is_blocked } } : p)
      toast(data.is_blocked ? 'Customer blocked' : 'Customer unblocked', 'success')
    }
    setBlockLoading(false)
  }

  async function toggleMarketingOptIn() {
    if (!profile) return
    const current = profile.customer.marketing_opt_in
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketing_opt_in: !current }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProfile(p => p ? { ...p, customer: updated } : p)
    }
  }

  function copyToClipboard(value: string, field: 'email' | 'phone') {
    navigator.clipboard.writeText(value)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return null

  const { customer, stats, segments, dietary_flags, addresses } = profile

  return (
    <>
      {/* ── Mobile compact header ─────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm active:bg-gray-50 transition shrink-0"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{displayName(customer)}</h1>
          <p className="text-xs text-gray-400">Customer profile</p>
        </div>
        {customer.is_blocked && <Badge variant="danger">Blocked</Badge>}
      </div>

      {/* ── Desktop header ────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <Header
          title={displayName(customer)}
          subtitle="Customer profile"
          actions={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={14} /> Back
            </Button>
          }
        />
      </div>

      {/* ── Mobile: hero identity card + stats grid ───────────────────────── */}
      <div className="lg:hidden space-y-3 mb-4">

        {/* Identity + contact card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'w-14 h-14 rounded-full text-xl font-bold flex items-center justify-center shrink-0',
              customer.is_blocked ? 'bg-red-100 text-red-500' : 'bg-brand-100 text-brand-600'
            )}>
              {initials(customer)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-base leading-tight">{displayName(customer)}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Since {new Date(customer.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-1.5">
                <Badge variant="default">{ACQUISITION_LABELS[customer.acquisition_source] ?? customer.acquisition_source}</Badge>
              </div>
            </div>
          </div>

          {/* Tap-to-copy contact rows */}
          <div className="space-y-2">
            {customer.email && (
              <button
                onClick={() => copyToClipboard(customer.email!, 'email')}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl active:bg-gray-100 transition text-left"
              >
                <span className="text-sm text-gray-700 truncate flex-1">{customer.email}</span>
                {copied === 'email'
                  ? <Check size={14} className="text-green-500 shrink-0" />
                  : <Copy size={14} className="text-gray-400 shrink-0" />
                }
              </button>
            )}
            {customer.phone && (
              <button
                onClick={() => copyToClipboard(customer.phone!, 'phone')}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl active:bg-gray-100 transition text-left"
              >
                <span className="text-sm text-gray-700 flex-1">{customer.phone}</span>
                {copied === 'phone'
                  ? <Check size={14} className="text-green-500 shrink-0" />
                  : <Copy size={14} className="text-gray-400 shrink-0" />
                }
              </button>
            )}
          </div>

          {/* Marketing opt-in toggle */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Marketing opt-in</p>
              {customer.marketing_opt_in && customer.marketing_opt_in_at && (
                <p className="text-xs text-gray-400">{new Date(customer.marketing_opt_in_at).toLocaleDateString()}</p>
              )}
            </div>
            <button
              onClick={toggleMarketingOptIn}
              className={cn('relative w-10 h-5 rounded-full transition-colors focus:outline-none', customer.marketing_opt_in ? 'bg-brand-500' : 'bg-gray-200')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', customer.marketing_opt_in && 'translate-x-5')} />
            </button>
          </div>

          {/* Block button */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Button
              variant={customer.is_blocked ? 'outline' : 'danger'}
              size="sm"
              className="w-full"
              onClick={toggleBlock}
              loading={blockLoading}
            >
              {customer.is_blocked ? <><ShieldOff size={12} /> Unblock Customer</> : <><Ban size={12} /> Block Customer</>}
            </Button>
          </div>
        </div>

        {/* Stats 2×2 grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{stats.total_orders}</p>
            <p className="text-xs text-gray-400">Orders</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.lifetime_value)}</p>
            <p className="text-xs text-gray-400">Lifetime</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.avg_order_value)}</p>
            <p className="text-xs text-gray-400">Avg Order</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{stats.days_since_last ?? '—'}</p>
            <p className="text-xs text-gray-400">Days Since</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left Sidebar (desktop only) ───────────────────────────────────── */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4">

          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <div className={cn(
                'w-16 h-16 rounded-full text-xl font-bold flex items-center justify-center mb-3',
                customer.is_blocked ? 'bg-red-100 text-red-500' : 'bg-brand-100 text-brand-600'
              )}>
                {initials(customer)}
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{displayName(customer)}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Customer since {new Date(customer.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Contact */}
            <div className="space-y-2 text-sm">
              {customer.email && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 truncate flex-1">{customer.email}</span>
                  <button onClick={() => copyToClipboard(customer.email!, 'email')} className="ml-2 text-gray-400 hover:text-brand-500 transition">
                    {copied === 'email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{customer.phone}</span>
                  <button onClick={() => copyToClipboard(customer.phone!, 'phone')} className="ml-2 text-gray-400 hover:text-brand-500 transition">
                    {copied === 'phone' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Acquisition source */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Acquisition source</p>
              <Badge variant="default">{ACQUISITION_LABELS[customer.acquisition_source] ?? customer.acquisition_source}</Badge>
            </div>

            {/* Marketing opt-in */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Marketing opt-in</p>
                {customer.marketing_opt_in && customer.marketing_opt_in_at && (
                  <p className="text-xs text-gray-400">{new Date(customer.marketing_opt_in_at).toLocaleDateString()}</p>
                )}
              </div>
              <button
                onClick={toggleMarketingOptIn}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors focus:outline-none',
                  customer.marketing_opt_in ? 'bg-brand-500' : 'bg-gray-200'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  customer.marketing_opt_in && 'translate-x-5'
                )} />
              </button>
            </div>

            {/* Block */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Button
                variant={customer.is_blocked ? 'outline' : 'danger'}
                size="sm"
                className="w-full"
                onClick={toggleBlock}
                loading={blockLoading}
              >
                {customer.is_blocked ? <><ShieldOff size={12} /> Unblock Customer</> : <><Ban size={12} /> Block Customer</>}
              </Button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{stats.total_orders}</p>
              <p className="text-xs text-gray-400">Orders</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.lifetime_value)}</p>
              <p className="text-xs text-gray-400">Lifetime</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.avg_order_value)}</p>
              <p className="text-xs text-gray-400">Avg Order</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{stats.days_since_last ?? '—'}</p>
              <p className="text-xs text-gray-400">Days Since</p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(customer.tags ?? []).map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {(customer.tags ?? []).length === 0 && <p className="text-xs text-gray-400">No tags</p>}
            </div>
            <form onSubmit={e => { e.preventDefault(); addTag() }} className="flex gap-1.5">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Add tag…"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-400"
              />
              <button type="submit" disabled={tagLoading || !tagInput.trim()} className="p-1.5 bg-brand-500 text-white rounded-lg disabled:opacity-40 hover:bg-brand-600 transition">
                <Plus size={12} />
              </button>
            </form>
          </div>

          {/* Segments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</p>
              <button onClick={() => setSegModalOpen(true)} className="text-brand-500 hover:text-brand-600 transition">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1.5">
              {segments.map(seg => (
                <div key={seg.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs text-gray-700">{seg.name}</span>
                  </span>
                  <button onClick={() => removeSegment(seg.id)} className="text-gray-300 hover:text-red-400 transition">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {segments.length === 0 && <p className="text-xs text-gray-400">No segments</p>}
            </div>
          </div>

          {/* Dietary flags */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dietary</p>
              <button onClick={() => setDietModalOpen(true)} className="text-brand-500 hover:text-brand-600 transition">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dietary_flags.map(f => (
                <span key={f.flag_type} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                  {DIETARY_LABELS[f.flag_type]}
                  {f.source === 'inferred_from_orders' && <span className="text-green-400 text-[9px]">AI</span>}
                  <button onClick={() => removeDietaryFlag(f.flag_type)} className="text-green-400 hover:text-red-500 transition">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {dietary_flags.length === 0 && <p className="text-xs text-gray-400">None recorded</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Notes</p>
              {notesSaving && <span className="text-xs text-gray-400">Saving…</span>}
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              rows={4}
              placeholder="Notes visible only to staff…"
              className="w-full text-xs text-gray-700 border border-gray-200 rounded-xl p-2.5 resize-none focus:outline-none focus:border-brand-400"
            />
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Tab bar — scrollable on mobile, even-width on desktop */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 overflow-x-auto">
            {([
              { key: 'orders',        label: 'Orders',       icon: ShoppingBag,   mobileOnly: false },
              { key: 'reservations',  label: 'Reservations', icon: CalendarDays,  mobileOnly: false },
              { key: 'events',        label: 'Events',       icon: Activity,      mobileOnly: false },
              { key: 'addresses',     label: 'Addresses',    icon: MapPin,        mobileOnly: false },
              { key: 'communication', label: 'Comms',        icon: MessageSquare, mobileOnly: false },
              { key: 'info',          label: 'Info',         icon: Users,         mobileOnly: true  },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition whitespace-nowrap shrink-0',
                  'lg:flex-1 lg:justify-center',
                  tab.mobileOnly && 'lg:hidden',
                  activeTab === tab.key
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Orders Tab ──────────────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div>
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">
                  <Package size={36} className="mx-auto mb-3 text-gray-300" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => {
                    const s = STATUS_BADGE[order.status]
                    const expanded = expandedOrder === order.id
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button
                          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                          onClick={() => setExpandedOrder(expanded ? null : order.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono text-xs text-gray-500">#{order.order_number}</span>
                              <Badge variant={s?.variant ?? 'default'}>{s?.label ?? order.status}</Badge>
                              <span className="text-xs text-gray-400 capitalize">{order.order_type.replace('_', ' ')}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                            <p className="text-xs text-gray-400">
                              Sub {formatCurrency(order.subtotal)} · Tax {formatCurrency(order.tax_amount)}
                              {order.fee_amount > 0 && ` · Tip ${formatCurrency(order.fee_amount)}`}
                            </p>
                          </div>
                        </button>

                        {expanded && order.order_items && (
                          <div className="px-5 pb-4 border-t border-gray-50 space-y-2 pt-3">
                            {order.order_items.map(item => (
                              <div key={item.id} className="flex items-start justify-between text-sm">
                                <div>
                                  <span className="text-gray-800">{item.quantity}× {item.item_name_snapshot}</span>
                                  {item.order_item_options?.map(opt => (
                                    <p key={opt.id} className="text-xs text-gray-400 ml-3">
                                      {opt.option_group_name_snapshot}: {opt.option_name_snapshot}
                                      {opt.additional_price_snapshot > 0 && ` (+${formatCurrency(opt.additional_price_snapshot)})`}
                                    </p>
                                  ))}
                                </div>
                                <span className="text-gray-700 font-medium ml-4">{formatCurrency(item.line_total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Orders pagination */}
              {ordersTotal > 10 && (
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <p>{ordersTotal} total orders</p>
                  <div className="flex gap-2">
                    <button disabled={ordersPage <= 1} onClick={() => setOrdersPage(p => p - 1)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition text-xs">
                      ← Prev
                    </button>
                    <button disabled={ordersPage * 10 >= ordersTotal} onClick={() => setOrdersPage(p => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition text-xs">
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Reservations Tab ────────────────────────────────────────────── */}
          {activeTab === 'reservations' && (
            <div>
              {reservationsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">
                  <CalendarDays size={36} className="mx-auto mb-3 text-gray-300" />
                  <p>No reservations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map(r => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-amber-50 text-amber-700 border-amber-200',
                      confirmed: 'bg-green-50 text-green-700 border-green-200',
                      cancelled: 'bg-red-50 text-red-600 border-red-200',
                      completed: 'bg-gray-50 text-gray-600 border-gray-200',
                      no_show: 'bg-red-50 text-red-600 border-red-200',
                    }
                    const colorClass = statusColors[r.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                    const dateObj = new Date(r.reservation_date + 'T00:00:00')
                    return (
                      <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                        <div className="text-center bg-brand-50 rounded-xl px-3 py-2 shrink-0 w-14">
                          <p className="text-[10px] text-brand-400 font-medium uppercase">
                            {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                          </p>
                          <p className="text-2xl font-bold text-brand-600 leading-none mt-0.5">
                            {dateObj.getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                              {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                            <span className="text-sm text-brand-600 font-medium">
                              {r.reservation_time.slice(0, 5)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${colorClass}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users size={11} /> {r.party_size} {r.party_size === 1 ? 'guest' : 'guests'}
                            </span>
                            {r.notes && <span className="truncate">{r.notes}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {reservationsTotal > 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">{reservationsTotal} total reservation{reservationsTotal !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {/* ── Events Tab ──────────────────────────────────────────────────── */}
          {activeTab === 'events' && (
            <div>
              {/* AI readiness callout */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex gap-3 items-start">
                <Activity size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>This activity log powers future AI personalization</strong> — churn prediction, smart upsell, optimal send time, and LTV forecasting are all driven by these events.
                </p>
              </div>

              {eventsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">
                  <Activity size={36} className="mx-auto mb-3 text-gray-300" />
                  <p>No events recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupByDay(events).map(([day, dayEvents]) => (
                    <div key={day}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                        {new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                        {dayEvents.map(evt => {
                          const Icon = EVENT_ICONS[evt.event_type] ?? Activity
                          const DevIcon = DEVICE_ICONS[evt.device_type] ?? Monitor
                          return (
                            <div key={evt.id} className="flex items-start gap-3 px-4 py-3">
                              <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Icon size={13} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800">
                                  {EVENT_LABELS[evt.event_type] ?? evt.event_type.replace(/_/g, ' ')}
                                  {evt.event_type === 'order_placed' && evt.metadata?.order_total !== undefined && (
                                    <span className="text-gray-500"> · {formatCurrency(evt.metadata.order_total as number)}</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(evt.event_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {' · '}
                                  <DevIcon size={10} className="inline mb-0.5" /> {evt.device_type.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {eventsTotal > 20 && (
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <p>{eventsTotal} total events</p>
                  <div className="flex gap-2">
                    <button disabled={eventsPage <= 1} onClick={() => setEventsPage(p => p - 1)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition text-xs">← Prev</button>
                    <button disabled={eventsPage * 20 >= eventsTotal} onClick={() => setEventsPage(p => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition text-xs">Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Addresses Tab ─────────────────────────────────────────────── */}
          {activeTab === 'addresses' && (
            <div>
              {addresses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">
                  <MapPin size={36} className="mx-auto mb-3 text-gray-300" />
                  <p>No saved addresses</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <div key={addr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                      <MapPin size={16} className="text-brand-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{addr.label}</p>
                          {addr.is_default && <Badge variant="success">Default</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">
                          {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}, {addr.city}, {addr.state} {addr.zip}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Communication Tab ──────────────────────────────────────────── */}
          {activeTab === 'communication' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-800 mb-4">Preferences</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-600">Preferred contact method</span>
                    <Badge variant="default" className="capitalize">{customer.preferred_contact_method}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-600">Marketing opt-in</span>
                    <Badge variant={customer.marketing_opt_in ? 'success' : 'default'}>
                      {customer.marketing_opt_in ? 'Opted in' : 'Not opted in'}
                    </Badge>
                  </div>
                  {customer.marketing_opt_in_at && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Opted in on</span>
                      <span className="text-gray-500 text-xs">{new Date(customer.marketing_opt_in_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign history placeholder */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <MessageSquare size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-400">Campaign History</p>
                <p className="text-sm text-gray-400 mt-1">Coming soon — connects to the AI marketing module</p>
              </div>
            </div>
          )}
          {/* ── Info Tab (mobile only — sidebar content) ────────────────────── */}
          {activeTab === 'info' && (
            <div className="lg:hidden space-y-4">

              {/* Tags */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tags</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(customer.tags ?? []).map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition"><X size={10} /></button>
                    </span>
                  ))}
                  {(customer.tags ?? []).length === 0 && <p className="text-xs text-gray-400">No tags yet</p>}
                </div>
                <form onSubmit={e => { e.preventDefault(); addTag() }} className="flex gap-1.5">
                  <input
                    value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag…"
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-400"
                  />
                  <button type="submit" disabled={tagLoading || !tagInput.trim()} className="p-1.5 bg-brand-500 text-white rounded-lg disabled:opacity-40 hover:bg-brand-600 transition">
                    <Plus size={12} />
                  </button>
                </form>
              </div>

              {/* Segments */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</p>
                  <button onClick={() => setSegModalOpen(true)} className="text-brand-500 hover:text-brand-600 transition"><Plus size={14} /></button>
                </div>
                <div className="space-y-2">
                  {segments.map(seg => (
                    <div key={seg.id} className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-sm text-gray-700">{seg.name}</span>
                      </span>
                      <button onClick={() => removeSegment(seg.id)} className="text-gray-300 hover:text-red-400 transition p-1"><X size={14} /></button>
                    </div>
                  ))}
                  {segments.length === 0 && <p className="text-xs text-gray-400">No segments</p>}
                </div>
              </div>

              {/* Dietary flags */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dietary Flags</p>
                  <button onClick={() => setDietModalOpen(true)} className="text-brand-500 hover:text-brand-600 transition"><Plus size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dietary_flags.map(f => (
                    <span key={f.flag_type} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                      {DIETARY_LABELS[f.flag_type]}
                      {f.source === 'inferred_from_orders' && <span className="text-green-400 text-[9px] font-bold">AI</span>}
                      <button onClick={() => removeDietaryFlag(f.flag_type)} className="text-green-400 hover:text-red-500 transition ml-0.5"><X size={10} /></button>
                    </span>
                  ))}
                  {dietary_flags.length === 0 && <p className="text-xs text-gray-400">None recorded</p>}
                </div>
              </div>

              {/* Internal notes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Notes</p>
                  {notesSaving && <span className="text-xs text-gray-400">Saving…</span>}
                </div>
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  rows={5}
                  placeholder="Notes visible only to staff…"
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-brand-400"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Add Segment Modal ──────────────────────────────────────────────── */}
      <Modal open={segModalOpen} onClose={() => setSegModalOpen(false)} title="Add to Segment" size="sm">
        <div className="space-y-2">
          {allSegments.filter(s => !segments.find(cs => cs.id === s.id)).map(seg => (
            <button
              key={seg.id}
              onClick={() => addSegment(seg.id)}
              disabled={segLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition text-left disabled:opacity-50"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <div>
                <p className="text-sm font-medium text-gray-800">{seg.name}</p>
                {seg.description && <p className="text-xs text-gray-400">{seg.description}</p>}
              </div>
            </button>
          ))}
          {allSegments.filter(s => !segments.find(cs => cs.id === s.id)).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No other segments available</p>
          )}
        </div>
      </Modal>

      {/* ── Add Dietary Flag Modal ─────────────────────────────────────────── */}
      <Modal open={dietModalOpen} onClose={() => setDietModalOpen(false)} title="Add Dietary Flag" size="sm">
        <div className="grid grid-cols-2 gap-2">
          {DIETARY_FLAGS.filter(f => !dietary_flags.find(df => df.flag_type === f)).map(flag => (
            <button
              key={flag}
              onClick={() => addDietaryFlag(flag)}
              disabled={dietLoading}
              className="px-3 py-2.5 rounded-xl border border-gray-100 hover:border-green-300 hover:bg-green-50 text-sm text-gray-700 transition disabled:opacity-50"
            >
              {DIETARY_LABELS[flag]}
            </button>
          ))}
          {DIETARY_FLAGS.filter(f => !dietary_flags.find(df => df.flag_type === f)).length === 0 && (
            <p className="col-span-2 text-sm text-gray-400 text-center py-4">All dietary flags already added</p>
          )}
        </div>
      </Modal>
    </>
  )
}
