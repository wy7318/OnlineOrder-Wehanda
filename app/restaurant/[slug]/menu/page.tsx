'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import { isRestaurantOpen } from '@/lib/utils/hours'
import { formatCurrency } from '@/lib/utils/helpers'
import Image from 'next/image'
import { Search, ShoppingBag, MapPin, Phone, Clock, X, Utensils, CalendarDays, User, Plus, CreditCard, Banknote } from 'lucide-react'
import ItemModal from '@/components/customer/ItemModal'
import Cart from '@/components/customer/Cart'
import ReservationModal from '@/components/customer/ReservationModal'
import CustomerAuthModal from '@/components/customer/CustomerAuthModal'
import CustomerProfileModal from '@/components/customer/CustomerProfileModal'
import OrderHistory from '@/components/customer/OrderHistory'
import CustomerMenu from '@/components/customer/CustomerMenu'
import ReservationHistory from '@/components/customer/ReservationHistory'
import CustomerSettingsPanel from '@/components/customer/CustomerSettingsPanel'
import LoyaltyWidget from '@/components/customer/LoyaltyWidget'
import StripeCardCapture from '@/components/customer/StripeCardCapture'
import type { ConfirmPaymentFn } from '@/components/customer/StripeCardCapture'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { Category, CustomerProfile, LoyaltyProgram, MenuItem, Option, OptionGroup, PublicRestaurant, Subcategory, Tag, CartOption } from '@/lib/types'
import { Star } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { use } from 'react'

const TIP_PRESETS = [0, 15, 18, 20, 25] as const

function getTimeInZone(tz: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? 'Sun'
  const rawHour = parts.find(p => p.type === 'hour')?.value ?? '0'
  const hour = rawHour === '24' ? 0 : parseInt(rawHour, 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  const DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { day: DAYS[weekday] ?? 0, minutes: hour * 60 + minute }
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function checkAvailability(
  entity: { available_order_types?: string[] | null; happy_hour_enabled?: boolean; happy_hour_start?: string | null; happy_hour_end?: string | null; happy_hour_days?: number[] | null },
  orderType: string,
  tz: string
): boolean {
  if (entity.available_order_types?.length && !entity.available_order_types.includes(orderType)) return false
  if (entity.happy_hour_enabled && entity.happy_hour_start && entity.happy_hour_end && entity.happy_hour_days?.length) {
    const { day, minutes } = getTimeInZone(tz)
    if (!entity.happy_hour_days.includes(day)) return false
    if (minutes < timeToMins(entity.happy_hour_start) || minutes >= timeToMins(entity.happy_hour_end)) return false
  }
  return true
}

export default function RestaurantMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const supabase = createClient()
  const cartStore = useCartStore()

  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<(MenuItem & { option_groups: (OptionGroup & { options: Option[] })[] }) | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderType, setOrderType] = useState<'pickup' | 'dine_in' | 'delivery'>('pickup')
  const [checkoutForm, setCheckoutForm] = useState({
    name: '', phone: '', email: '', notes: '', delivery_address: '', delivery_instructions: '',
  })
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [wantsUtensils, setWantsUtensils] = useState(false)
  const [tipPercent, setTipPercent] = useState<number>(0)
  const [customTip, setCustomTip] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [reservationOpen, setReservationOpen] = useState(false)

  const [customerSession, setCustomerSession] = useState<Session | null>(null)
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false)
  const [reservationHistoryOpen, setReservationHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rewardsPanelOpen, setRewardsPanelOpen] = useState(false)
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null)
  const [loyaltyBalance, setLoyaltyBalance] = useState(0)
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0)

  const [accent, setAccent] = useState('#037FFC')
  const [template, setTemplate] = useState<'modern' | 'bold' | 'minimal' | 'classic' | 'noir' | 'organic' | 'electric' | 'zen'>('modern')

  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null)
  const [stripeIsTestMode, setStripeIsTestMode] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('cash')
  const [stripePaymentError, setStripePaymentError] = useState('')
  const stripeConfirmRef = useRef<ConfirmPaymentFn | null>(null)

  const upsellModalRef = useRef(false)
  const cartSyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!customerSession?.access_token || !restaurant) return
    clearTimeout(cartSyncTimer.current)
    cartSyncTimer.current = setTimeout(() => {
      fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerSession.access_token}` },
        body: JSON.stringify({ restaurant_id: restaurant.id, items: cartStore.items }),
      }).catch(() => {})
    }, 2000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartStore.items, customerSession?.access_token, restaurant?.id])

  const stripePromise = useMemo(
    () => stripePublishableKey ? loadStripe(stripePublishableKey) : null,
    [stripePublishableKey]
  )

  const itemCount = cartStore.itemCount()
  const subtotal = cartStore.subtotal()
  const taxRate = (restaurant?.tax_rate ?? 0) / 100
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  const tipAmount = tipPercent === -1
    ? Math.max(0, Math.round((parseFloat(customTip) || 0) * 100) / 100)
    : Math.round(subtotal * tipPercent) / 100
  const loyaltyDiscountAmount = loyaltyPointsToRedeem > 0 && loyaltyProgram
    ? Math.floor(loyaltyPointsToRedeem / loyaltyProgram.points_to_redeem)
    : 0
  const totalAmount = Math.max(0, Math.round((subtotal + taxAmount + tipAmount - loyaltyDiscountAmount) * 100) / 100)

  useEffect(() => { loadRestaurant() }, [slug])

  useEffect(() => {
    if (customerSession && restaurant?.id && loyaltyProgram?.is_enabled) {
      fetchLoyaltyBalance(restaurant.id)
    }
  }, [customerSession?.user?.id, restaurant?.id, loyaltyProgram?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`wehanda_mkt_optin_${slug}`)
      if (stored !== null) {
        setMarketingOptIn(stored === 'true')
        sessionStorage.removeItem(`wehanda_mkt_optin_${slug}`)
      }
    } catch {}
  }, [slug])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCustomerSession(session)
      if (session) fetchCustomerProfile(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCustomerSession(session)
      if (session) {
        fetchCustomerProfile(session)
      } else {
        setCustomerProfile(null)
        setLoyaltyBalance(0)
        setLoyaltyPointsToRedeem(0)
        setCheckoutForm({ name: '', phone: '', email: '', notes: '', delivery_address: '', delivery_instructions: '' })
        setMarketingOptIn(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchCustomerProfile(session: Session) {
    const res = await fetch('/api/customer/profile')
    if (!res.ok) return
    const data: CustomerProfile | null = await res.json()
    if (data) {
      setCustomerProfile(data)
      setCheckoutForm(f => ({ ...f, name: data.display_name, phone: data.phone, email: session.user.email ?? f.email }))
    } else {
      setProfileModalOpen(true)
    }
  }

  async function fetchLoyaltyBalance(restaurantId: string) {
    try {
      const res = await fetch(`/api/loyalty/balance?restaurant_id=${restaurantId}`)
      if (!res.ok) return
      const d = await res.json()
      setLoyaltyBalance(d.balance ?? 0)
      if (d.program?.is_enabled) setLoyaltyProgram(d.program)
    } catch {}
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOrderHistoryOpen(false)
    setReservationHistoryOpen(false)
    setSettingsOpen(false)
  }

  async function loadRestaurant() {
    setLoading(true)
    const { data: r } = await supabase.from('restaurants').select('*').eq('slug', slug).eq('is_active', true).single()
    if (!r) { setNotFound(true); setLoading(false); return }

    const [{ data: hours }, { data: cats }, { data: subs }, { data: items }, { data: allTags }, { data: itemTags }, { data: optGroups }, { data: opts }] = await Promise.all([
      supabase.from('restaurant_hours').select('*').eq('restaurant_id', r.id).order('day_of_week'),
      supabase.from('categories').select('*').eq('restaurant_id', r.id).eq('is_active', true).order('display_order'),
      supabase.from('subcategories').select('*').eq('restaurant_id', r.id).eq('is_active', true).order('display_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', r.id).eq('is_available', true).order('display_order'),
      supabase.from('tags').select('*').eq('restaurant_id', r.id),
      supabase.from('menu_item_tags').select('*').eq('restaurant_id', r.id),
      supabase.from('option_groups').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('options').select('*').eq('restaurant_id', r.id).eq('is_active', true).order('display_order'),
    ])

    const enrichedItems = (items ?? []).map(item => ({
      ...item,
      tags: (itemTags ?? []).filter(t => t.menu_item_id === item.id).map(t => allTags?.find(tg => tg.id === t.tag_id)).filter(Boolean) as Tag[],
      option_groups: (optGroups ?? []).filter(g => g.menu_item_id === item.id).map(g => ({
        ...g,
        options: (opts ?? []).filter(o => o.option_group_id === g.id),
      })),
    }))

    const enrichedCats = (cats ?? []).map(c => ({
      ...c,
      subcategories: (subs ?? []).filter(s => s.category_id === c.id),
    }))

    setRestaurant({ ...r, restaurant_hours: hours ?? [], categories: enrichedCats, menu_items: enrichedItems })
    setIsOpen(isRestaurantOpen(hours ?? [], r.timezone))
    if (enrichedCats.length > 0) setActiveCategory(enrichedCats[0].id)

    fetch(`/api/loyalty/program?restaurant_id=${r.id}`)
      .then(res => res.json())
      .then(lp => { if (lp?.is_enabled) setLoyaltyProgram(lp) })
      .catch(() => {})

    fetch(`/api/public/theme?slug=${slug}`)
      .then(res => res.json())
      .then(d => {
        if (d.accent_color) setAccent(d.accent_color)
        if (d.template) setTemplate(d.template)
      })
      .catch(() => {})

    fetch(`/api/stripe/public-config?restaurant_id=${r.id}`)
      .then(res => res.json())
      .then(cfg => {
        if (cfg?.stripe_enabled && cfg.publishable_key) {
          setStripeEnabled(true)
          setStripePublishableKey(cfg.publishable_key)
          setStripeIsTestMode(!!cfg.is_test_mode)
          setPaymentMethod('card')
        }
      })
      .catch(() => {})

    if (r.pickup_enabled) setOrderType('pickup')
    else if (r.dine_in_enabled) setOrderType('dine_in')
    else if (r.delivery_enabled) setOrderType('delivery')

    setLoading(false)
  }

  function filteredItems(categoryId?: string, subcategoryId?: string) {
    if (!restaurant) return []
    let items = restaurant.menu_items
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
    }
    if (categoryId) items = items.filter(i => i.category_id === categoryId)
    if (subcategoryId) items = items.filter(i => i.subcategory_id === subcategoryId)
    const tz = restaurant!.timezone
    items = items.filter(i => {
      if (!checkAvailability(i, orderType, tz)) return false
      if (i.category_id) {
        const cat = restaurant!.categories.find(c => c.id === i.category_id)
        if (cat && !checkAvailability(cat, orderType, tz)) return false
      }
      if (i.subcategory_id) {
        const sub = restaurant!.categories.flatMap(c => c.subcategories).find(s => s.id === i.subcategory_id)
        if (sub && !checkAvailability(sub, orderType, tz)) return false
      }
      return true
    })
    return items
  }

  function addToCart(item: MenuItem, qty: number, options: CartOption[], notes: string) {
    if (!restaurant) return
    const fromUpsell = upsellModalRef.current
    upsellModalRef.current = false
    cartStore.addItem({
      restaurantId: restaurant.id,
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      quantity: qty,
      notes,
      selected_options: options,
      added_from_upsell: fromUpsell,
    })
  }

  function openItemModal(item: typeof selectedItem) {
    if (!item) return
    setSelectedItem(item)
    if (customerSession?.access_token && restaurant) {
      fetch('/api/events/item-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerSession.access_token}` },
        body: JSON.stringify({ restaurant_id: restaurant.id, menu_item_id: item.id }),
      }).catch(() => {})
    }
  }

  function handleUpsellAdd(menuItemId: string) {
    const item = restaurant?.menu_items.find(i => i.id === menuItemId)
    if (!item) return
    upsellModalRef.current = true
    setCartOpen(false)
    openItemModal(item)
  }

  async function placeOrder() {
    if (!restaurant || cartStore.items.length === 0) return
    if (!checkoutForm.name || !checkoutForm.phone) return

    setCheckoutLoading(true)
    setStripePaymentError('')

    let stripePaymentIntentId: string | undefined
    if (paymentMethod === 'card' && stripeEnabled && stripeConfirmRef.current) {
      const amountCents = Math.round(totalAmount * 100)
      const piRes = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurant.id, amount_cents: amountCents }),
      })
      if (!piRes.ok) {
        const d = await piRes.json()
        setStripePaymentError(d.error ?? 'Could not start payment')
        setCheckoutLoading(false)
        return
      }
      const { client_secret } = await piRes.json()
      const { error, paymentIntentId } = await stripeConfirmRef.current(client_secret)
      if (error || !paymentIntentId) {
        setStripePaymentError(error ?? 'Payment was not completed')
        setCheckoutLoading(false)
        return
      }
      stripePaymentIntentId = paymentIntentId
    }

    const noteParts: string[] = []
    if (wantsUtensils) noteParts.push('Utensils requested')
    if (checkoutForm.notes.trim()) noteParts.push(checkoutForm.notes.trim())
    const orderNotes = noteParts.join('\n') || null

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        order_type: orderType,
        customer_name: checkoutForm.name,
        customer_phone: checkoutForm.phone,
        customer_email: checkoutForm.email,
        order_notes: orderNotes,
        delivery_address: orderType === 'delivery' ? checkoutForm.delivery_address : null,
        delivery_instructions: orderType === 'delivery' ? checkoutForm.delivery_instructions : null,
        subtotal,
        fee_amount: tipAmount,
        marketing_opt_in: marketingOptIn,
        customer_user_id: customerSession?.user?.id ?? null,
        loyalty_points_redeemed: loyaltyPointsToRedeem,
        loyalty_discount_amount: loyaltyDiscountAmount,
        payment_method: stripePaymentIntentId ? 'stripe' : 'cash',
        stripe_payment_intent_id: stripePaymentIntentId ?? null,
        items: cartStore.items.map(item => ({
          menu_item_id: item.menu_item_id,
          item_name_snapshot: item.name,
          base_price_snapshot: item.price,
          quantity: item.quantity,
          notes: item.notes || null,
          line_total: item.line_total,
          added_from_upsell: item.added_from_upsell ?? false,
          options: item.selected_options.map(opt => ({
            option_group_name_snapshot: opt.option_group_name,
            option_name_snapshot: opt.option_name,
            additional_price_snapshot: opt.additional_price,
          })),
        })),
      }),
    })

    const data = await res.json()
    if (res.ok) {
      setOrderConfirmed({ orderId: data.id, orderNumber: data.order_number })
      cartStore.clearCart()
      if (customerSession?.access_token && restaurant) {
        fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerSession.access_token}` },
          body: JSON.stringify({ restaurant_id: restaurant.id, items: [] }),
        }).catch(() => {})
      }
      setCheckoutOpen(false)
      setCartOpen(false)
      setTipPercent(0)
      setCustomTip('')
      setWantsUtensils(false)
      if (loyaltyPointsToRedeem > 0 && restaurant?.id) {
        setLoyaltyBalance(b => b - loyaltyPointsToRedeem)
        setLoyaltyPointsToRedeem(0)
      }
    }
    setCheckoutLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading menu…</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gray-50">
      <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-5 text-4xl">🍽️</div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Restaurant not found</h1>
      <p className="text-gray-500 max-w-xs">This restaurant page doesn&apos;t exist or isn&apos;t available right now.</p>
    </div>
  )

  if (!restaurant) return null

  // Template-derived styles
  const isBold = template === 'bold'
  const isMinimal = template === 'minimal'
  const isClassic = template === 'classic'
  const isNoir = template === 'noir'
  const isOrganic = template === 'organic'
  const isElectric = template === 'electric'
  const isZen = template === 'zen'
  const isDark = isBold || isNoir

  const pageBg = isBold ? 'bg-[#0f0f0f]' : isNoir ? 'bg-[#0c0c0c]' : isMinimal ? 'bg-stone-50' : isClassic ? 'bg-[#fdf8f3]' : isOrganic ? 'bg-[#faf7f2]' : isElectric ? 'bg-white' : isZen ? 'bg-[#f9f8f7]' : 'bg-gray-50'
  const cartBg = isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-100'
  const cartHeaderText = isDark ? 'text-white' : 'text-gray-900'
  const itemsClass = isBold ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : isNoir ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : isClassic ? 'grid grid-cols-2 gap-3' : isOrganic ? 'grid grid-cols-2 sm:grid-cols-3 gap-4' : isMinimal || isZen ? 'divide-y divide-stone-200' : 'space-y-3'
  const subLabelClass = isDark ? 'text-white/30' : isMinimal ? 'text-stone-400' : isClassic ? 'text-amber-700/40' : isOrganic ? 'text-[#a8967e]' : isZen ? 'text-gray-300' : 'text-gray-400'
  const searchInputClass = isDark ? 'border-white/8 bg-[#161616] text-white placeholder:text-white/35 focus:border-white/25' : isMinimal ? 'border-stone-200 bg-white focus:border-stone-400' : isClassic ? 'border-amber-200 bg-white focus:border-amber-400' : isOrganic ? 'border-[#e2d8cc] bg-white focus:border-[#a8967e]' : isZen ? 'border-gray-200 bg-white focus:border-gray-400' : 'border-gray-200 bg-white focus:border-[var(--accent)]'
  const searchIconClass = isDark ? 'text-white/25' : isZen ? 'text-gray-300' : 'text-gray-400'
  const searchClearClass = isDark ? 'text-white/35 hover:text-white/65' : 'text-gray-400 hover:text-gray-600'
  const actionBarClass = isDark ? 'bg-[#161616] border-white/8' : isMinimal ? 'bg-stone-50 border-stone-200' : isClassic ? 'bg-[#fdf8f3] border-amber-100' : isOrganic ? 'bg-[#faf7f2] border-[#e2d8cc]' : isZen ? 'bg-[#f9f8f7] border-gray-200' : 'bg-white border-gray-100'
  const subCatActive = isDark ? 'bg-white/15 border border-white/20 text-white' : isClassic ? 'text-white' : isOrganic ? 'text-white' : 'bg-gray-900 text-white'
  const subCatInactive = isDark ? 'border border-transparent text-white/40 hover:text-white hover:bg-white/10' : isMinimal || isZen ? 'text-stone-400 hover:text-gray-700 hover:bg-stone-100' : isClassic ? 'text-amber-800/50 hover:text-amber-900 hover:bg-amber-50' : isOrganic ? 'text-[#a8967e] hover:text-[#5c5044] hover:bg-[#f0e8dc]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
  const orderTypePillActive = isDark ? 'bg-white text-gray-900' : isOrganic ? 'bg-[#1a1612] text-white' : isElectric ? 'bg-[#0a0a0a] text-white' : 'bg-gray-900 text-white'
  const orderTypePillInactive = isDark ? 'bg-white/10 text-white/50 hover:bg-white/20' : isMinimal ? 'bg-stone-200 text-stone-500 hover:bg-stone-300' : isClassic ? 'bg-amber-50 text-amber-800/50 hover:bg-amber-100' : isOrganic ? 'bg-[#f0e8dc] text-[#a8967e] hover:bg-[#e8ddd0]' : isZen ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'

  const displayItems = search.trim()
    ? filteredItems()
    : restaurant.categories.flatMap(cat => filteredItems(cat.id))

  return (
    <div className={`min-h-screen ${pageBg}`} style={{ '--accent': accent } as React.CSSProperties}>

      {/* Order Confirmation */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-green-600 text-3xl leading-none">✓</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Order Placed!</h2>
            <p className="text-gray-500 text-sm mb-5">Your order has been received by the restaurant.</p>
            <div className="rounded-2xl py-4 px-6 mb-5" style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Order Number</p>
              <p className="text-3xl font-extrabold" style={{ color: accent }}>#{orderConfirmed.orderNumber}</p>
            </div>
            <p className="text-xs text-gray-400 mb-6">💳 Pay at the restaurant — card or cash accepted</p>
            <button onClick={() => setOrderConfirmed(null)} className="w-full text-white font-bold py-3.5 rounded-2xl transition hover:opacity-90" style={{ background: accent }}>
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      {isMinimal ? (
        <div className="bg-white border-b border-stone-200 relative">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 border border-stone-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-stone-50 transition">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          <div className="max-w-6xl mx-auto px-4 pt-[88px] pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h1>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 mb-2">
                  {restaurant.address && <span className="flex items-center gap-1"><MapPin size={13} /> {restaurant.address}</span>}
                  {restaurant.phone && <span className="flex items-center gap-1"><Phone size={13} /> {restaurant.phone}</span>}
                </div>
                {(restaurant.cuisine_types ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {restaurant.cuisine_types.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              {restaurant.logo_url && (
                <div className="w-14 h-14 rounded-2xl border border-stone-200 overflow-hidden shrink-0 bg-white">
                  <Image src={restaurant.logo_url} alt={restaurant.name} width={56} height={56} className="object-cover w-full h-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : isBold ? (
        <div className="relative h-80 md:h-[28rem]">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl text-sm font-bold hover:bg-white/20 transition border border-white/20">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          {restaurant.cover_image_url ? (
            <>
              <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/80" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#0f0f0f]" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pt-[60px]">
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-3 leading-tight">{restaurant.name}</h1>
            <div className="h-1 w-16 rounded-full mb-5" style={{ background: accent }} />
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen ? 'animate-pulse' : ''}`} />
              {isOpen ? 'Open' : 'Closed'}
            </span>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
              {restaurant.address && <span className="text-white/50 text-sm flex items-center gap-1.5"><MapPin size={13} /> {restaurant.address}</span>}
              {restaurant.phone && <span className="text-white/50 text-sm flex items-center gap-1.5"><Phone size={13} /> {restaurant.phone}</span>}
            </div>
            {(restaurant.cuisine_types ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {restaurant.cuisine_types.map(c => (
                  <span key={c} className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[11px] font-medium border border-white/15">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : isClassic ? (
        <div className="relative h-72 md:h-96">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-black/35 backdrop-blur-sm text-white rounded-xl text-sm font-bold hover:bg-black/55 transition">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          {restaurant.cover_image_url ? (
            <>
              <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-amber-950/40 via-amber-900/50 to-amber-950/70" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #78350f 0%, #92400e 60%, #1c1008 100%)' }} />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-end text-center pb-8 px-6 pt-[60px]">
            {restaurant.logo_url ? (
              <div className="w-16 h-16 rounded-2xl border-2 border-amber-300/30 overflow-hidden bg-white mb-3">
                <Image src={restaurant.logo_url} alt={restaurant.name} width={64} height={64} className="object-cover w-full h-full" />
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-10 bg-amber-300/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-300/60" />
                <div className="h-px w-10 bg-amber-300/40" />
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide mb-2">{restaurant.name}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${isOpen ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen ? 'animate-pulse' : ''}`} />
              {isOpen ? 'Open' : 'Closed'}
            </span>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {restaurant.address && <span className="text-amber-100/70 text-xs flex items-center gap-1"><MapPin size={11} /> {restaurant.address}</span>}
              {restaurant.phone && <span className="text-amber-100/70 text-xs flex items-center gap-1"><Phone size={11} /> {restaurant.phone}</span>}
            </div>
          </div>
        </div>
      ) : isNoir ? (
        /* Noir — cinematic dark italic */
        <div className="relative h-80 md:h-[26rem]">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl text-sm font-bold hover:bg-white/20 transition border border-white/15">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          {restaurant.cover_image_url ? (
            <>
              <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/85" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c] via-[#1a1612] to-[#0c0c0c]" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pt-[60px]">
            <div className="w-10 h-px bg-white/20 mb-6" />
            <h1 className="text-4xl sm:text-6xl font-light italic tracking-[0.06em] text-white mb-6">{restaurant.name}</h1>
            <div className="w-10 h-px bg-white/20 mb-5" />
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 border text-[11px] uppercase tracking-[0.2em]"
              style={{ borderColor: isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.35)', color: isOpen ? 'rgba(255,255,255,0.55)' : 'rgba(239,68,68,0.65)' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-4">
              {restaurant.address && <span className="text-white/30 text-xs flex items-center gap-1"><MapPin size={11} /> {restaurant.address}</span>}
              {restaurant.phone && <span className="text-white/30 text-xs flex items-center gap-1"><Phone size={11} /> {restaurant.phone}</span>}
            </div>
          </div>
        </div>
      ) : isOrganic ? (
        /* Organic — warm earthy text header */
        <div className="bg-[#faf7f2] border-b border-[#e2d8cc] relative">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 border border-[#c4b5a0] bg-white/80 text-[#5c5044] rounded-xl text-sm font-bold hover:bg-white transition">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          <div className="max-w-6xl mx-auto px-4 pt-[88px] pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {(restaurant.cuisine_types ?? []).length > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#a8967e] mb-3">{restaurant.cuisine_types!.join(' · ')}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1612]">{restaurant.name}</h1>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#8a7f72]">
                  {restaurant.address && <span className="flex items-center gap-1"><MapPin size={13} /> {restaurant.address}</span>}
                  {restaurant.phone && <span className="flex items-center gap-1"><Phone size={13} /> {restaurant.phone}</span>}
                </div>
              </div>
              {restaurant.logo_url && (
                <div className="w-14 h-14 rounded-2xl border border-[#e2d8cc] overflow-hidden shrink-0 bg-white">
                  <Image src={restaurant.logo_url} alt={restaurant.name} width={56} height={56} className="object-cover w-full h-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : isElectric ? (
        /* Electric — oversized bold name at bottom */
        <div className="relative h-72 md:h-[380px] overflow-hidden">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white/15 backdrop-blur-sm text-white rounded-xl text-sm font-black hover:bg-white/25 transition border border-white/25">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          {restaurant.cover_image_url ? (
            <>
              <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/55" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#0a0a0a]" />
          )}
          <div className="absolute inset-0 flex flex-col items-start justify-end px-5 sm:px-8 pb-6 pt-[60px]">
            <h1 className="font-black uppercase text-white leading-none tracking-tighter"
              style={{ fontSize: 'clamp(2.4rem, 9vw, 6rem)' }}>
              {restaurant.name}
            </h1>
            <div className="h-1.5 rounded-full mt-3 mb-4 w-14" style={{ background: accent }} />
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${isOpen ? 'bg-green-400 text-black' : 'bg-red-500 text-white'}`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-current ${isOpen ? 'animate-pulse' : ''}`} />
                {isOpen ? 'Open' : 'Closed'}
              </span>
              {restaurant.address && <span className="text-white/55 text-xs flex items-center gap-1"><MapPin size={11} /> {restaurant.address}</span>}
            </div>
          </div>
        </div>
      ) : isZen ? (
        /* Zen — ultra-minimal centered text header */
        <div className="bg-[#f9f8f7] border-b border-gray-200 relative">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-white transition">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          <div className="max-w-6xl mx-auto px-4 pt-[88px] pb-8 text-center">
            {(restaurant.cuisine_types ?? []).length > 0 && (
              <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-5">{restaurant.cuisine_types!.join('  ·  ')}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
              <h1 className="font-extralight tracking-[0.12em] text-[#1c1c1c]" style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)' }}>
                {restaurant.name}
              </h1>
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 border text-[10px] uppercase tracking-widest"
                style={{ borderColor: isOpen ? '#d1d5db' : '#fecaca', color: isOpen ? '#9ca3af' : '#f87171' }}>
                <span className={`w-1 h-1 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-400 font-light">
              {restaurant.address && <span className="flex items-center gap-1.5"><MapPin size={12} /> {restaurant.address}</span>}
              {restaurant.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {restaurant.phone}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* Modern */
        <div className="relative">
          <div className="absolute top-[60px] right-4 z-20 flex items-center gap-2">
            {customerSession ? (
              <CustomerMenu profile={customerProfile} onMyOrders={() => setOrderHistoryOpen(true)} onMyReservations={() => setReservationHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onSignOut={handleSignOut} loyaltyEnabled={!!loyaltyProgram?.is_enabled} onMyRewards={() => setRewardsPanelOpen(true)} />
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-black/35 backdrop-blur-sm text-white rounded-xl text-sm font-bold hover:bg-black/55 transition">
                <User size={14} /> Sign in
              </button>
            )}
          </div>
          <div className="relative h-64 md:h-80">
            {restaurant.cover_image_url ? (
              <>
                <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="h-full" style={{ background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)` }} />
            )}
            <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 flex items-end gap-3">
              <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-2xl border-2 border-white/30 shadow-2xl bg-white overflow-hidden shrink-0">
                {restaurant.logo_url ? (
                  <Image src={restaurant.logo_url} alt={restaurant.name} width={72} height={72} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-2xl">🍣</div>
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{restaurant.name}</h1>
                  <span className={`inline-flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen ? 'animate-pulse' : ''}`} />
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {restaurant.address && <span className="text-white/70 text-xs flex items-center gap-1"><MapPin size={11} /> {restaurant.address}</span>}
                  {restaurant.phone && <span className="text-white/70 text-xs flex items-center gap-1"><Phone size={11} /> {restaurant.phone}</span>}
                </div>
                {(restaurant.cuisine_types ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {restaurant.cuisine_types.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-medium backdrop-blur-sm border border-white/20">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className={`border-b shadow-sm ${actionBarClass}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap min-h-[52px]">
          {!isOpen && <div className={`flex items-center gap-1.5 text-sm font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}><Clock size={14} /> Ordering unavailable — restaurant is closed</div>}
          {!restaurant.online_ordering_enabled && <div className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}><Clock size={14} /> Online ordering is currently disabled</div>}
          {restaurant.reservations_enabled && (
            <button onClick={() => setReservationOpen(true)} className="ml-auto flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-xl transition shadow-sm hover:opacity-90" style={{ background: accent }}>
              <CalendarDays size={15} /> Reserve a Table
            </button>
          )}
        </div>
      </div>

      {/* Sticky Category Nav */}
      {restaurant.categories.length > 0 && !search.trim() && (
        isBold ? (
          <div className="sticky top-0 z-20 border-b border-[#2a2a2a] bg-[#1a1a1a]">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex overflow-x-auto scrollbar-hide">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 px-5 py-4 text-sm font-bold transition whitespace-nowrap border-b-2 -mb-[1px] ${isActive ? 'text-white' : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'}`}
                      style={isActive ? { borderBottomColor: accent, color: accent } : {}}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : isMinimal ? (
          <div className="sticky top-0 z-20 bg-white border-b border-stone-200">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-6 overflow-x-auto scrollbar-hide py-3">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 text-sm font-semibold transition whitespace-nowrap pb-0.5 border-b-2 ${isActive ? 'text-gray-900' : 'border-transparent text-stone-400 hover:text-gray-700 hover:border-stone-300'}`}
                      style={isActive ? { borderBottomColor: accent, color: accent } : {}}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : isClassic ? (
          <div className="sticky top-0 z-20 border-b border-amber-100 bg-[#fdf8f3] shadow-sm">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'text-white shadow-sm' : 'text-amber-800/60 hover:text-amber-900 hover:bg-amber-50'}`}
                      style={isActive ? { background: accent } : {}}>
                      {cat.name}
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                        {filteredItems(cat.id).length}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : isNoir ? (
          <div className="sticky top-0 z-20 border-b border-[#252525] bg-[#181818]">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex overflow-x-auto scrollbar-hide">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 px-5 py-4 text-sm font-light tracking-[0.1em] uppercase transition whitespace-nowrap border-b-2 -mb-[1px] ${isActive ? 'text-white' : 'border-transparent text-white/35 hover:text-white/60 hover:border-white/15'}`}
                      style={isActive ? { borderBottomColor: accent, color: 'rgba(240,237,232,0.85)' } : {}}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : isOrganic ? (
          <div className="sticky top-0 z-20 border-b border-[#e2d8cc] bg-[#faf7f2] shadow-sm">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${isActive ? 'text-white' : 'bg-[#f0e8dc] text-[#a8967e] hover:bg-[#e8ddd0] hover:text-[#5c5044]'}`}
                      style={isActive ? { background: accent } : {}}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : isElectric ? (
          <div className="sticky top-0 z-20 border-b-2 border-[#0a0a0a] bg-white">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex overflow-x-auto scrollbar-hide">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 px-5 py-4 text-xs font-black uppercase tracking-[0.12em] transition whitespace-nowrap border-b-2 -mb-[2px] ${isActive ? '' : 'border-transparent text-gray-400 hover:text-[#0a0a0a] hover:border-gray-300'}`}
                      style={isActive ? { borderBottomColor: accent, color: accent } : {}}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : isZen ? (
          <div className="sticky top-0 z-20 bg-[#f9f8f7] border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-8 overflow-x-auto scrollbar-hide py-3">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 text-[11px] font-light uppercase tracking-[0.2em] transition whitespace-nowrap pb-0.5 border-b ${isActive ? 'text-[#1c1c1c]' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
                      style={isActive ? { borderBottomColor: accent, color: accent } : {}}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="sticky top-0 z-20 border-b border-gray-100 bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-3">
                {restaurant.categories.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                      style={isActive ? { background: accent } : {}}>
                      {cat.name}
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {filteredItems(cat.id).length}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-32">
        {[restaurant.pickup_enabled, restaurant.dine_in_enabled, restaurant.delivery_enabled].filter(Boolean).length > 1 && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className={`text-xs font-medium shrink-0 ${isDark ? 'text-white/40' : isClassic ? 'text-amber-800/40' : isOrganic ? 'text-[#a8967e]' : 'text-gray-400'}`}>Ordering as:</span>
            {restaurant.pickup_enabled && (
              <button onClick={() => setOrderType('pickup')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${orderType === 'pickup' ? orderTypePillActive : orderTypePillInactive}`}>🏃 Pickup</button>
            )}
            {restaurant.dine_in_enabled && (
              <button onClick={() => setOrderType('dine_in')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${orderType === 'dine_in' ? orderTypePillActive : orderTypePillInactive}`}>🍽️ Dine In</button>
            )}
            {restaurant.delivery_enabled && (
              <button onClick={() => setOrderType('delivery')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${orderType === 'delivery' ? orderTypePillActive : orderTypePillInactive}`}>🚗 Delivery</button>
            )}
          </div>
        )}

        <div className="relative mb-6">
          <Search size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${searchIconClass}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the menu…"
            className={`w-full pl-11 pr-10 py-3.5 rounded-2xl border text-sm focus:outline-none shadow-sm transition ${searchInputClass}`} />
          {search && <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${searchClearClass}`}><X size={15} /></button>}
        </div>

        <div className="flex gap-8 items-start">
          <div className="flex-1 min-w-0">
            {search.trim() ? (
              <div>
                <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : isClassic ? 'text-amber-800/60' : isOrganic ? 'text-[#8a7f72]' : 'text-gray-500'}`}>{displayItems.length} result{displayItems.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</p>
                {displayItems.length > 0 ? (
                  <div className={itemsClass}>{displayItems.map(item => <MenuItemCard key={item.id} item={item} accent={accent} template={template} onClick={() => openItemModal(item)} />)}</div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}><Search size={24} className={isDark ? 'text-white/30' : 'text-gray-400'} /></div>
                    <p className={`font-bold mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>No items found</p>
                    <p className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Try searching something else</p>
                  </div>
                )}
              </div>
            ) : (() => {
              const cat = restaurant.categories.find(c => c.id === activeCategory)
              if (!cat) return null
              const catItems = filteredItems(cat.id)
              return (
                <div key={cat.id}>
                  {cat.subcategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
                      <button onClick={() => setActiveSubcategory(null)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${activeSubcategory === null ? subCatActive : subCatInactive}`}
                        style={isClassic && activeSubcategory === null ? { background: accent } : {}}>All</button>
                      {cat.subcategories.map(sub => (
                        <button key={sub.id} onClick={() => setActiveSubcategory(sub.id)}
                          className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${activeSubcategory === sub.id ? subCatActive : subCatInactive}`}
                          style={isClassic && activeSubcategory === sub.id ? { background: accent } : {}}>
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {activeSubcategory ? (
                    <div className={itemsClass}>{filteredItems(cat.id, activeSubcategory).map(item => <MenuItemCard key={item.id} item={item} accent={accent} template={template} onClick={() => openItemModal(item)} />)}</div>
                  ) : cat.subcategories.length > 0 ? (
                    cat.subcategories.map(sub => {
                      const subItems = filteredItems(cat.id, sub.id)
                      if (subItems.length === 0) return null
                      return (
                        <div key={sub.id} className="mb-6">
                          <p className={`text-xs font-bold uppercase tracking-widest mb-3 pl-1 ${subLabelClass}`}>{sub.name}</p>
                          <div className={itemsClass}>{subItems.map(item => <MenuItemCard key={item.id} item={item} accent={accent} template={template} onClick={() => openItemModal(item)} />)}</div>
                        </div>
                      )
                    })
                  ) : (
                    <div className={itemsClass}>{catItems.filter(i => !i.subcategory_id).map(item => <MenuItemCard key={item.id} item={item} accent={accent} template={template} onClick={() => openItemModal(item)} />)}</div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Desktop Cart Sidebar */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-[57px]">
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${cartBg}`}>
              <div className={`px-5 py-4 border-b flex items-center gap-2 ${isBold ? 'border-white/10' : 'border-gray-100'}`}>
                <ShoppingBag size={18} style={{ color: accent }} />
                <h2 className={`font-extrabold ${cartHeaderText}`}>Your Order</h2>
                {itemCount > 0 && <span className="ml-auto text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: accent }}>{itemCount}</span>}
              </div>
              <div className="p-5">
                <Cart taxRate={taxRate} onCheckout={() => setCheckoutOpen(true)} restaurantId={restaurant?.id} onUpsellAdd={handleUpsellAdd} accent={accent} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating cart */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button onClick={() => setCartOpen(true)} className="w-full text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 shadow-2xl transition hover:opacity-90" style={{ background: accent }}>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center">{itemCount}</span>
              <span className="text-sm font-bold">View Order</span>
            </div>
            <span className="font-extrabold">{formatCurrency(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-extrabold text-gray-900 text-lg">Your Order</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Cart taxRate={taxRate} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} restaurantId={restaurant?.id} onUpsellAdd={handleUpsellAdd} accent={accent} />
            </div>
          </div>
        </div>
      )}

      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} accent={accent} />}

      {reservationOpen && restaurant.reservations_enabled && (
        <ReservationModal
          restaurant={restaurant}
          onClose={() => setReservationOpen(false)}
          prefill={{ name: customerProfile?.display_name, phone: customerProfile?.phone, email: customerSession?.user?.email ?? undefined }}
          customerUserId={customerSession?.user?.id ?? null}
          accent={accent}
        />
      )}

      {authModalOpen && <CustomerAuthModal restaurantSlug={slug} onClose={() => setAuthModalOpen(false)} />}

      {profileModalOpen && customerSession && (
        <CustomerProfileModal
          email={customerSession.user.email ?? ''}
          onSaved={profile => {
            setCustomerProfile(profile)
            setProfileModalOpen(false)
            setCheckoutForm(f => ({ ...f, name: profile.display_name, phone: profile.phone, email: customerSession.user.email ?? f.email }))
          }}
        />
      )}

      {orderHistoryOpen && restaurant && <OrderHistory restaurantId={restaurant.id} onClose={() => setOrderHistoryOpen(false)} />}
      {reservationHistoryOpen && restaurant && <ReservationHistory restaurantId={restaurant.id} onClose={() => setReservationHistoryOpen(false)} />}
      {rewardsPanelOpen && restaurant && <LoyaltyWidget restaurantId={restaurant.id} onClose={() => setRewardsPanelOpen(false)} />}

      {settingsOpen && customerSession && customerProfile && (
        <CustomerSettingsPanel
          profile={customerProfile}
          email={customerSession.user.email ?? ''}
          onSaved={updated => {
            setCustomerProfile(updated)
            setCheckoutForm(f => ({ ...f, name: updated.display_name, phone: updated.phone }))
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCheckoutOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-extrabold text-gray-900">Checkout</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">How are you ordering?</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${[restaurant.pickup_enabled, restaurant.dine_in_enabled, restaurant.delivery_enabled].filter(Boolean).length}, 1fr)` }}>
                    {restaurant.pickup_enabled && (
                      <button onClick={() => setOrderType('pickup')}
                        className={`py-3 rounded-2xl border-2 text-sm font-bold transition flex flex-col items-center gap-1.5 ${orderType === 'pickup' ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        style={orderType === 'pickup' ? { borderColor: accent, background: accent } : {}}>
                        <span className="text-xl">🏃</span> Pickup
                      </button>
                    )}
                    {restaurant.dine_in_enabled && (
                      <button onClick={() => setOrderType('dine_in')}
                        className={`py-3 rounded-2xl border-2 text-sm font-bold transition flex flex-col items-center gap-1.5 ${orderType === 'dine_in' ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        style={orderType === 'dine_in' ? { borderColor: accent, background: accent } : {}}>
                        <span className="text-xl">🍽️</span> Dine In
                      </button>
                    )}
                    {restaurant.delivery_enabled && (
                      <button onClick={() => setOrderType('delivery')}
                        className={`py-3 rounded-2xl border-2 text-sm font-bold transition flex flex-col items-center gap-1.5 ${orderType === 'delivery' ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        style={orderType === 'delivery' ? { borderColor: accent, background: accent } : {}}>
                        <span className="text-xl">🚗</span> Delivery
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-sm font-bold text-gray-700">Your Information</p>
                  <input value={checkoutForm.name} onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name *" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition" />
                  <input value={checkoutForm.phone} onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone Number *" required type="tel" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition" />
                  <input value={checkoutForm.email} onChange={e => setCheckoutForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition" />
                </div>

                {orderType === 'delivery' && (
                  <div className="space-y-2.5">
                    <p className="text-sm font-bold text-gray-700">Delivery Address</p>
                    <input value={checkoutForm.delivery_address} onChange={e => setCheckoutForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder="Street Address *" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition" />
                    <input value={checkoutForm.delivery_instructions} onChange={e => setCheckoutForm(f => ({ ...f, delivery_instructions: e.target.value }))} placeholder="Delivery instructions (optional)" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Special Instructions</p>
                  <textarea value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Allergies, special requests…" rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] resize-none transition" />
                </div>

                <label className="flex items-center justify-between gap-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition rounded-2xl px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0"><Utensils size={16} className="text-gray-500" /></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Include utensils</p>
                      <p className="text-xs text-gray-400">Chopsticks, fork &amp; napkins</p>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={wantsUtensils} onChange={e => setWantsUtensils(e.target.checked)} />
                    <div className="w-11 h-6 rounded-full transition-colors" style={{ background: wantsUtensils ? accent : '#e5e7eb' }} />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
                  </div>
                </label>

                {loyaltyProgram?.is_enabled && customerSession && loyaltyBalance >= loyaltyProgram.minimum_points_to_redeem && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={16} className="text-amber-500 shrink-0" />
                      <p className="text-sm font-bold text-amber-800">Use Rewards Points <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{loyaltyBalance} pts available</span></p>
                    </div>
                    {loyaltyPointsToRedeem === 0 ? (
                      <button type="button" onClick={() => { const maxPts = Math.floor(loyaltyBalance / loyaltyProgram.points_to_redeem) * loyaltyProgram.points_to_redeem; setLoyaltyPointsToRedeem(maxPts) }}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition">
                        Apply {loyaltyBalance} pts → ${Math.floor(loyaltyBalance / loyaltyProgram.points_to_redeem)} off
                      </button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-green-700">− ${loyaltyDiscountAmount} discount applied! <span className="ml-1.5 text-xs font-medium text-green-600">({loyaltyPointsToRedeem} pts)</span></p>
                        <button type="button" onClick={() => setLoyaltyPointsToRedeem(0)} className="text-xs text-gray-400 hover:text-red-500 transition font-medium px-2 py-1 rounded-lg hover:bg-red-50">Remove</button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">Add a Tip</p>
                  <div className="flex flex-wrap gap-2">
                    {TIP_PRESETS.map(pct => (
                      <button key={pct} type="button" onClick={() => { setTipPercent(pct); setCustomTip('') }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tipPercent === pct ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={tipPercent === pct ? { background: accent } : {}}>
                        {pct === 0 ? 'No tip' : `${pct}%`}
                        {pct > 0 && tipPercent === pct && subtotal > 0 && <span className="ml-1 text-white/70 text-xs">{formatCurrency(Math.round(subtotal * pct) / 100)}</span>}
                      </button>
                    ))}
                    <button type="button" onClick={() => setTipPercent(-1)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tipPercent === -1 ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={tipPercent === -1 ? { background: accent } : {}}>Custom</button>
                  </div>
                  {tipPercent === -1 && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm font-medium text-gray-500">$</span>
                      <input type="number" min="0" step="0.50" value={customTip} onChange={e => setCustomTip(e.target.value)} placeholder="0.00" className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <div className="relative mt-0.5 shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} />
                    <div className="w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center"
                      style={{ borderColor: marketingOptIn ? accent : '#d1d5db', background: marketingOptIn ? accent : 'transparent' }}>
                      {marketingOptIn && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">I agree to receive exclusive offers, promotions, and updates from <span className="font-semibold text-gray-700">{restaurant?.name}</span>. You can opt out at any time.</p>
                </label>

                {stripeEnabled ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-700">Payment</p>
                    {stripeIsTestMode && <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><span className="text-xs font-bold text-amber-700">TEST MODE — use card 4242 4242 4242 4242</span></div>}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-sm font-bold transition ${paymentMethod === 'card' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <CreditCard size={18} /> Pay by card
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-sm font-bold transition ${paymentMethod === 'cash' ? 'border-gray-700 bg-gray-50 text-gray-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <Banknote size={18} /> Pay at restaurant
                      </button>
                    </div>
                    {paymentMethod === 'card' && stripePromise && (
                      <Elements stripe={stripePromise}><StripeCardCapture onReady={fn => { stripeConfirmRef.current = fn }} onError={msg => setStripePaymentError(msg)} /></Elements>
                    )}
                    {paymentMethod === 'card' && !stripePromise && <p className="text-xs text-gray-400">Loading payment form…</p>}
                    {stripePaymentError && <p className="text-sm text-red-600 font-medium">{stripePaymentError}</p>}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5 flex items-center gap-3">
                    <span className="text-xl">💳</span>
                    <div><p className="text-sm font-semibold text-blue-900">Pay at restaurant</p><p className="text-xs text-blue-500">Card or cash accepted</p></div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Order Summary</p>
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {taxRate > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Tax ({parseFloat((taxRate * 100).toFixed(3))}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
                  {tipAmount > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Tip</span><span>{formatCurrency(tipAmount)}</span></div>}
                  {loyaltyDiscountAmount > 0 && <div className="flex justify-between text-sm text-green-600 font-semibold"><span className="flex items-center gap-1"><Star size={12} /> Rewards discount</span><span>− {formatCurrency(loyaltyDiscountAmount)}</span></div>}
                  <div className="flex justify-between font-extrabold text-gray-900 text-base pt-2 border-t border-gray-200 mt-1"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0">
              <button onClick={placeOrder} disabled={checkoutLoading || !isOpen || !restaurant.online_ordering_enabled}
                className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl transition flex items-center justify-center gap-2 text-base hover:opacity-90"
                style={{ background: accent }}>
                {checkoutLoading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : paymentMethod === 'card'
                    ? `Pay ${formatCurrency(totalAmount)} with card`
                    : `Place Order · ${formatCurrency(totalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItemCard({ item, accent, template, onClick }: {
  item: MenuItem & { tags: Tag[]; option_groups?: { id: string }[] }
  accent: string
  template: 'modern' | 'bold' | 'minimal' | 'classic' | 'noir' | 'organic' | 'electric' | 'zen'
  onClick: () => void
}) {
  if (template === 'noir') return (
    <button onClick={onClick} className="w-full rounded-xl overflow-hidden text-left group transition-all duration-200 hover:opacity-80"
      style={{ background: '#0e0e0e', border: '1px solid rgba(240,237,232,0.07)' }}>
      <div className="relative aspect-[4/3]" style={{ background: '#161616' }}>
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Utensils size={24} style={{ color: 'rgba(240,237,232,0.1)' }} /></div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-light italic tracking-[0.04em] text-[14px] mb-1.5 leading-snug" style={{ color: 'rgba(240,237,232,0.85)' }}>{item.name}</h3>
        {item.description && <p className="text-xs line-clamp-2 mb-3 leading-relaxed" style={{ color: 'rgba(240,237,232,0.35)' }}>{item.description}</p>}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.map(t => <span key={t.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '25', color: t.color }}>{t.name}</span>)}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-light text-sm" style={{ color: accent }}>{formatCurrency(item.price)}</span>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,237,232,0.08)' }}><Plus size={14} style={{ color: 'rgba(240,237,232,0.5)' }} /></div>
        </div>
      </div>
    </button>
  )

  if (template === 'organic') return (
    <button onClick={onClick} className="w-full rounded-3xl border border-[#e8e0d4] bg-white hover:border-[#c4b5a0] hover:shadow-md transition-all duration-200 overflow-hidden text-left group">
      <div className="relative aspect-square bg-[#f5f0e8]">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Utensils size={24} className="text-[#c4b5a0]" /></div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="font-serif font-normal text-[#1a1612] text-[13px] mb-1.5 leading-snug line-clamp-2">{item.name}</h3>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.slice(0, 2).map(t => <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + '20', color: t.color }}>{t.name}</span>)}
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="font-medium text-[#1a1612] text-sm">{formatCurrency(item.price)}</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: accent }}><Plus size={13} className="text-white" /></div>
        </div>
      </div>
    </button>
  )

  if (template === 'electric') return (
    <button onClick={onClick} className="w-full rounded-none border-b-2 border-transparent hover:border-[#0a0a0a] bg-white text-left group transition-all duration-200 py-4">
      <div className="flex items-center gap-4 px-1">
        <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Utensils size={18} className="text-gray-300" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-[#0a0a0a] text-[14px] leading-snug mb-1 tracking-tight uppercase">{item.name}</h3>
          {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{item.description}</p>}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map(t => <span key={t.id} className="text-[10px] font-bold px-2 py-0.5" style={{ color: t.color }}>{t.name}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="font-black text-base" style={{ color: accent }}>{formatCurrency(item.price)}</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0a0a0a] group-hover:opacity-80 transition-opacity"><Plus size={16} className="text-white" /></div>
        </div>
      </div>
    </button>
  )

  if (template === 'zen') return (
    <button onClick={onClick} className="w-full py-5 text-left flex items-center gap-5 hover:opacity-60 transition-opacity group">
      <div className="flex-1 min-w-0">
        <h3 className="font-light text-[#1c1c1c] text-[15px] mb-0.5 leading-snug tracking-wide">{item.name}</h3>
        {item.description && <p className="text-sm text-gray-400 font-light line-clamp-1 mb-1">{item.description}</p>}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(t => <span key={t.id} className="text-[10px] font-light px-2 py-0.5" style={{ color: t.color }}>{t.name}</span>)}
          </div>
        )}
      </div>
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 opacity-60 group-hover:opacity-90 transition-opacity">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Utensils size={14} className="text-gray-300" /></div>
        )}
      </div>
      <span className="font-light text-sm shrink-0 w-16 text-right" style={{ color: accent }}>{formatCurrency(item.price)}</span>
    </button>
  )

  if (template === 'bold') return (
    <button onClick={onClick} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] hover:border-white/30 transition-all duration-200 overflow-hidden text-left group">
      <div className="relative aspect-[4/3] bg-white/5">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Utensils size={28} className="text-white/15" /></div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white text-[14px] mb-1.5 leading-snug">{item.name}</h3>
        {item.description && <p className="text-xs text-white/50 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.map(t => <span key={t.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '30', color: t.color }}>{t.name}</span>)}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-white">{formatCurrency(item.price)}</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent }}><Plus size={16} className="text-white" /></div>
        </div>
      </div>
    </button>
  )

  if (template === 'minimal') return (
    <button onClick={onClick} className="w-full py-4 text-left flex items-center gap-4 hover:opacity-75 transition group">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-[15px] mb-0.5 leading-snug">{item.name}</h3>
        {item.description && <p className="text-sm text-stone-400 line-clamp-1 mb-1">{item.description}</p>}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {item.tags.map(t => <span key={t.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '18', color: t.color }}>{t.name}</span>)}
          </div>
        )}
        <span className="font-bold text-gray-900">{formatCurrency(item.price)}</span>
      </div>
      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-stone-100">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Utensils size={18} className="text-stone-300" /></div>
        )}
        <div className="absolute bottom-1 right-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: accent }}><Plus size={12} className="text-white" /></div>
        </div>
      </div>
    </button>
  )

  if (template === 'classic') return (
    <button onClick={onClick} className="w-full rounded-2xl border border-amber-100 bg-white hover:border-amber-200 hover:shadow-md transition-all duration-200 overflow-hidden text-left group">
      <div className="relative aspect-square bg-amber-50">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Utensils size={24} className="text-amber-200" /></div>
        )}
      </div>
      <div className="p-3 text-center">
        <h3 className="font-bold text-gray-900 text-[13px] mb-1 leading-snug line-clamp-2">{item.name}</h3>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-2">
            {item.tags.slice(0, 2).map(t => <span key={t.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + '18', color: t.color }}>{t.name}</span>)}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="font-extrabold text-gray-900 text-sm">{formatCurrency(item.price)}</span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: accent }}><Plus size={12} className="text-white" /></div>
        </div>
      </div>
    </button>
  )

  // Modern (default): horizontal card, image right
  return (
    <button onClick={onClick} className="w-full rounded-2xl border border-gray-100 bg-white hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden text-left group">
      <div className="flex items-center p-4 gap-4">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-bold text-[15px] leading-snug text-gray-900">{item.name}</h3>
          {item.description && <p className="text-sm line-clamp-2 leading-relaxed text-gray-500">{item.description}</p>}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map(t => <span key={t.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '18', color: t.color }}>{t.name}</span>)}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="font-extrabold text-gray-900">{formatCurrency(item.price)}</span>
            {item.option_groups && item.option_groups.length > 0 && <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Customizable</span>}
          </div>
        </div>
        <div className="relative w-28 h-24 rounded-xl overflow-hidden shrink-0">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50"><Utensils size={22} className="text-gray-300" /></div>
          )}
          <div className="absolute bottom-1.5 right-1.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-md" style={{ background: accent }}><Plus size={15} className="text-white" /></div>
          </div>
        </div>
      </div>
    </button>
  )
}
