'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import { isRestaurantOpen } from '@/lib/utils/hours'
import { formatCurrency } from '@/lib/utils/helpers'
import Image from 'next/image'
import { Search, ShoppingBag, MapPin, Phone, Clock, X, Utensils, CalendarDays, User, Plus } from 'lucide-react'
import ItemModal from '@/components/customer/ItemModal'
import Cart from '@/components/customer/Cart'
import ReservationModal from '@/components/customer/ReservationModal'
import CustomerAuthModal from '@/components/customer/CustomerAuthModal'
import CustomerProfileModal from '@/components/customer/CustomerProfileModal'
import OrderHistory from '@/components/customer/OrderHistory'
import CustomerMenu from '@/components/customer/CustomerMenu'
import ReservationHistory from '@/components/customer/ReservationHistory'
import CustomerSettingsPanel from '@/components/customer/CustomerSettingsPanel'
import type { Category, CustomerProfile, MenuItem, Option, OptionGroup, PublicRestaurant, Subcategory, Tag, CartOption } from '@/lib/types'
import type { Session } from '@supabase/supabase-js'
import { use } from 'react'

// Preset tip percentages; -1 = custom input
const TIP_PRESETS = [0, 15, 18, 20, 25] as const

export default function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
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
  const [tipPercent, setTipPercent] = useState<number>(0)  // 0 = no tip, -1 = custom, 15/18/20/25 = preset
  const [customTip, setCustomTip] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [reservationOpen, setReservationOpen] = useState(false)

  // Customer auth state
  const [customerSession, setCustomerSession] = useState<Session | null>(null)
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false)
  const [reservationHistoryOpen, setReservationHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  // Tracks whether the currently-open ItemModal was triggered by an upsell prompt
  const upsellModalRef = useRef(false)
  const itemCount = cartStore.itemCount()
  const subtotal = cartStore.subtotal()

  // Derived totals
  const taxRate = (restaurant?.tax_rate ?? 0) / 100
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  const tipAmount = tipPercent === -1
    ? Math.max(0, Math.round((parseFloat(customTip) || 0) * 100) / 100)
    : Math.round(subtotal * tipPercent) / 100
  const totalAmount = Math.round((subtotal + taxAmount + tipAmount) * 100) / 100

  useEffect(() => { loadRestaurant() }, [slug])

  // Read marketing opt-in preference stored by the auth modal before OTP redirect
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`wehanda_mkt_optin_${slug}`)
      if (stored !== null) {
        setMarketingOptIn(stored === 'true')
        sessionStorage.removeItem(`wehanda_mkt_optin_${slug}`)
      }
    } catch {}
  }, [slug])

  // Auth state listener — runs once on mount
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
      setCheckoutForm(f => ({
        ...f,
        name: data.display_name,
        phone: data.phone,
        email: session.user.email ?? f.email,
      }))
    } else {
      setProfileModalOpen(true)
    }
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

  function handleUpsellAdd(menuItemId: string) {
    const item = restaurant?.menu_items.find(i => i.id === menuItemId)
    if (!item) return
    upsellModalRef.current = true
    setCartOpen(false)
    setSelectedItem(item)
  }

  async function placeOrder() {
    if (!restaurant || cartStore.items.length === 0) return
    if (!checkoutForm.name || !checkoutForm.phone) return

    setCheckoutLoading(true)

    // Compose order notes — prepend utensil request if selected
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
        fee_amount: tipAmount,   // tip stored in fee_amount
        marketing_opt_in: marketingOptIn,
        customer_user_id: customerSession?.user?.id ?? null,
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
      setCheckoutOpen(false)
      setCartOpen(false)
      setTipPercent(0)
      setCustomTip('')
      setWantsUtensils(false)
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

  const displayItems = search.trim()
    ? filteredItems()
    : restaurant.categories.flatMap(cat => filteredItems(cat.id))

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Order Confirmation ── */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-green-600 text-3xl leading-none">✓</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Order Placed!</h2>
            <p className="text-gray-500 text-sm mb-5">Your order has been received by the restaurant.</p>
            <div className="bg-brand-50 border border-brand-100 rounded-2xl py-4 px-6 mb-5">
              <p className="text-xs text-brand-500 font-bold uppercase tracking-widest mb-1">Order Number</p>
              <p className="text-3xl font-extrabold text-brand-500">#{orderConfirmed.orderNumber}</p>
            </div>
            <p className="text-xs text-gray-400 mb-6">💳 Pay at the restaurant — card or cash accepted</p>
            <button
              onClick={() => setOrderConfirmed(null)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-2xl transition"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative">
        {/* Auth controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {customerSession ? (
            <CustomerMenu
              profile={customerProfile}
              onMyOrders={() => setOrderHistoryOpen(true)}
              onMyReservations={() => setReservationHistoryOpen(true)}
              onSettings={() => setSettingsOpen(true)}
              onSignOut={handleSignOut}
            />
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-black/35 backdrop-blur-sm text-white rounded-xl text-sm font-bold hover:bg-black/55 transition"
            >
              <User size={14} /> Sign in
            </button>
          )}
        </div>

        {/* Cover image with gradient + restaurant info overlaid */}
        <div className="relative h-64 md:h-80">
          {restaurant.cover_image_url ? (
            <>
              <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="h-full bg-gradient-to-br from-brand-400 via-brand-500 to-amber-500" />
          )}

          {/* Restaurant info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 flex items-end gap-3">
            <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-2xl border-2 border-white/30 shadow-2xl bg-white overflow-hidden shrink-0">
              {restaurant.logo_url ? (
                <Image src={restaurant.logo_url} alt={restaurant.name} width={72} height={72} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-brand-50 flex items-center justify-center text-2xl">🍣</div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{restaurant.name}</h1>
                <span className={`inline-flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen ? 'animate-pulse' : ''}`} />
                  {isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {restaurant.address && (
                  <span className="text-white/70 text-xs flex items-center gap-1"><MapPin size={11} /> {restaurant.address}</span>
                )}
                {restaurant.phone && (
                  <span className="text-white/70 text-xs flex items-center gap-1"><Phone size={11} /> {restaurant.phone}</span>
                )}
              </div>
              {(restaurant.cuisine_types ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {restaurant.cuisine_types.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-medium backdrop-blur-sm border border-white/20">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap min-h-[52px]">
          {!isOpen && (
            <div className="flex items-center gap-1.5 text-red-600 text-sm font-semibold">
              <Clock size={14} /> Ordering unavailable — restaurant is closed
            </div>
          )}
          {!restaurant.online_ordering_enabled && (
            <div className="text-amber-600 text-sm font-semibold flex items-center gap-1.5">
              <Clock size={14} /> Online ordering is currently disabled
            </div>
          )}
          {restaurant.reservations_enabled && (
            <button
              onClick={() => setReservationOpen(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              <CalendarDays size={15} /> Reserve a Table
            </button>
          )}
        </div>
      </div>

      {/* ── Sticky Category Nav ── */}
      {restaurant.categories.length > 0 && !search.trim() && (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-3">
              {restaurant.categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); categoryRefs.current[cat.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition whitespace-nowrap ${
                    activeCategory === cat.id
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-brand-500 hover:bg-brand-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-32">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the menu…"
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-400 shadow-sm transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex gap-8 items-start">
          {/* Menu sections */}
          <div className="flex-1 min-w-0">
            {search.trim() ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  {displayItems.length} result{displayItems.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
                </p>
                {displayItems.length > 0 ? (
                  <div className="space-y-3">
                    {displayItems.map(item => <MenuItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <p className="font-bold text-gray-700 mb-1">No items found</p>
                    <p className="text-sm text-gray-400">Try searching something else</p>
                  </div>
                )}
              </div>
            ) : (
              restaurant.categories.map(cat => {
                const catItems = filteredItems(cat.id)
                if (catItems.length === 0) return null
                return (
                  <div key={cat.id} ref={el => { categoryRefs.current[cat.id] = el }} className="mb-10 scroll-mt-16">
                    <div className="flex items-baseline gap-2 mb-4">
                      <h2 className="text-lg font-extrabold text-gray-900">{cat.name}</h2>
                      <span className="text-sm text-gray-400">{catItems.length} items</span>
                    </div>
                    {cat.subcategories.length > 0 ? (
                      cat.subcategories.map(sub => {
                        const subItems = filteredItems(cat.id, sub.id)
                        if (subItems.length === 0) return null
                        return (
                          <div key={sub.id} className="mb-6">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">{sub.name}</p>
                            <div className="space-y-3">
                              {subItems.map(item => <MenuItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="space-y-3">
                        {catItems.filter(i => !i.subcategory_id).map(item => <MenuItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Cart Sidebar */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-[57px]">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <ShoppingBag size={18} className="text-brand-500" />
                <h2 className="font-extrabold text-gray-900">Your Order</h2>
                {itemCount > 0 && (
                  <span className="ml-auto bg-brand-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{itemCount}</span>
                )}
              </div>
              <div className="p-5">
                <Cart taxRate={taxRate} onCheckout={() => setCheckoutOpen(true)} restaurantId={restaurant?.id} onUpsellAdd={handleUpsellAdd} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile floating cart ── */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 shadow-2xl shadow-brand-300/40 transition"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center">{itemCount}</span>
              <span className="text-sm font-bold">View Order</span>
            </div>
            <span className="font-extrabold">{formatCurrency(subtotal)}</span>
          </button>
        </div>
      )}

      {/* ── Mobile Cart Drawer ── */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-extrabold text-gray-900 text-lg">Your Order</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Cart taxRate={taxRate} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} restaurantId={restaurant?.id} onUpsellAdd={handleUpsellAdd} />
            </div>
          </div>
        </div>
      )}

      {/* ── Item Modal ── */}
      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} />}

      {/* ── Reservation Modal ── */}
      {reservationOpen && restaurant.reservations_enabled && (
        <ReservationModal
          restaurant={restaurant}
          onClose={() => setReservationOpen(false)}
          prefill={{ name: customerProfile?.display_name, phone: customerProfile?.phone, email: customerSession?.user?.email ?? undefined }}
          customerUserId={customerSession?.user?.id ?? null}
        />
      )}

      {/* ── Auth Modal ── */}
      {authModalOpen && <CustomerAuthModal restaurantSlug={slug} onClose={() => setAuthModalOpen(false)} />}

      {/* ── Profile Modal ── */}
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

      {/* ── Order History ── */}
      {orderHistoryOpen && restaurant && <OrderHistory restaurantId={restaurant.id} onClose={() => setOrderHistoryOpen(false)} />}

      {/* ── Reservation History ── */}
      {reservationHistoryOpen && restaurant && (
        <ReservationHistory restaurantId={restaurant.id} onClose={() => setReservationHistoryOpen(false)} />
      )}

      {/* ── Customer Settings ── */}
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

      {/* ── Checkout Modal ── */}
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
                {/* Order Type */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">How are you ordering?</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${[restaurant.pickup_enabled, restaurant.dine_in_enabled, restaurant.delivery_enabled].filter(Boolean).length}, 1fr)` }}>
                    {restaurant.pickup_enabled && (
                      <button onClick={() => setOrderType('pickup')}
                        className={`py-3 rounded-2xl border-2 text-sm font-bold transition flex flex-col items-center gap-1.5 ${orderType === 'pickup' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <span className="text-xl">🏃</span> Pickup
                      </button>
                    )}
                    {restaurant.dine_in_enabled && (
                      <button onClick={() => setOrderType('dine_in')}
                        className={`py-3 rounded-2xl border-2 text-sm font-bold transition flex flex-col items-center gap-1.5 ${orderType === 'dine_in' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <span className="text-xl">🍽️</span> Dine In
                      </button>
                    )}
                    {restaurant.delivery_enabled && (
                      <button onClick={() => setOrderType('delivery')}
                        className={`py-3 rounded-2xl border-2 text-sm font-bold transition flex flex-col items-center gap-1.5 ${orderType === 'delivery' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <span className="text-xl">🚗</span> Delivery
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2.5">
                  <p className="text-sm font-bold text-gray-700">Your Information</p>
                  <input value={checkoutForm.name} onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full Name *" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition" />
                  <input value={checkoutForm.phone} onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone Number *" required type="tel"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition" />
                  <input value={checkoutForm.email} onChange={e => setCheckoutForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email (optional)" type="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition" />
                </div>

                {/* Delivery address */}
                {orderType === 'delivery' && (
                  <div className="space-y-2.5">
                    <p className="text-sm font-bold text-gray-700">Delivery Address</p>
                    <input value={checkoutForm.delivery_address} onChange={e => setCheckoutForm(f => ({ ...f, delivery_address: e.target.value }))}
                      placeholder="Street Address *" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition" />
                    <input value={checkoutForm.delivery_instructions} onChange={e => setCheckoutForm(f => ({ ...f, delivery_instructions: e.target.value }))}
                      placeholder="Delivery instructions (optional)"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition" />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Special Instructions</p>
                  <textarea value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Allergies, special requests…" rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none transition" />
                </div>

                {/* Utensils */}
                <label className="flex items-center justify-between gap-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition rounded-2xl px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <Utensils size={16} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Include utensils</p>
                      <p className="text-xs text-gray-400">Chopsticks, fork &amp; napkins</p>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={wantsUtensils} onChange={e => setWantsUtensils(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
                  </div>
                </label>

                {/* Tip */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">Add a Tip</p>
                  <div className="flex flex-wrap gap-2">
                    {TIP_PRESETS.map(pct => (
                      <button key={pct} type="button" onClick={() => { setTipPercent(pct); setCustomTip('') }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tipPercent === pct ? 'bg-brand-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {pct === 0 ? 'No tip' : `${pct}%`}
                        {pct > 0 && tipPercent === pct && subtotal > 0 && (
                          <span className="ml-1 text-white/70 text-xs">{formatCurrency(Math.round(subtotal * pct) / 100)}</span>
                        )}
                      </button>
                    ))}
                    <button type="button" onClick={() => setTipPercent(-1)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tipPercent === -1 ? 'bg-brand-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      Custom
                    </button>
                  </div>
                  {tipPercent === -1 && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm font-medium text-gray-500">$</span>
                      <input type="number" min="0" step="0.50" value={customTip} onChange={e => setCustomTip(e.target.value)} placeholder="0.00"
                        className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
                    </div>
                  )}
                </div>

                {/* Marketing opt-in */}
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={marketingOptIn}
                      onChange={e => setMarketingOptIn(e.target.checked)}
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-brand-500 peer-checked:bg-brand-500 transition-colors flex items-center justify-center">
                      {marketingOptIn && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    I agree to receive exclusive offers, promotions, and updates from{' '}
                    <span className="font-semibold text-gray-700">{restaurant?.name}</span>.
                    {' '}You can opt out at any time by contacting the restaurant.
                  </p>
                </label>

                {/* Payment note */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5 flex items-center gap-3">
                  <span className="text-xl">💳</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Pay at restaurant</p>
                    <p className="text-xs text-blue-500">Card or cash accepted</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Order Summary</p>
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax ({parseFloat((taxRate * 100).toFixed(3))}%)</span><span>{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  {tipAmount > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Tip</span><span>{formatCurrency(tipAmount)}</span></div>}
                  <div className="flex justify-between font-extrabold text-gray-900 text-base pt-2 border-t border-gray-200 mt-1">
                    <span>Total</span><span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0">
              <button
                onClick={placeOrder}
                disabled={checkoutLoading || !isOpen || !restaurant.online_ordering_enabled}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl transition flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-200/60"
              >
                {checkoutLoading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : `Place Order · ${formatCurrency(totalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItemCard({ item, onClick }: { item: MenuItem & { tags: Tag[]; option_groups?: { id: string }[] }, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-100 transition-all duration-200 overflow-hidden text-left group"
    >
      <div className="flex items-center p-4 gap-4">
        {/* Text content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-bold text-[15px] text-gray-900 leading-snug group-hover:text-brand-500 transition-colors">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map(t => (
                <span key={t.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: t.color + '18', color: t.color }}>
                  {t.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="font-extrabold text-gray-900">{formatCurrency(item.price)}</span>
            {item.option_groups && item.option_groups.length > 0 && (
              <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Customizable</span>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        <div className="relative w-28 h-24 rounded-xl overflow-hidden shrink-0">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-50 to-amber-50 flex items-center justify-center">
              <Utensils size={22} className="text-brand-400" />
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5">
            <div className="w-7 h-7 bg-brand-500 group-hover:bg-brand-600 rounded-full flex items-center justify-center shadow-md transition-colors">
              <Plus size={15} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
