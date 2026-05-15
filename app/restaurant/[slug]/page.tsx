'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import { isRestaurantOpen } from '@/lib/utils/hours'
import { formatCurrency } from '@/lib/utils/helpers'
import Image from 'next/image'
import { Search, ShoppingBag, MapPin, Phone, Clock, X, Plus, Minus, ChevronRight } from 'lucide-react'
import ItemModal from '@/components/customer/ItemModal'
import Cart from '@/components/customer/Cart'
import type { Category, MenuItem, Option, OptionGroup, PublicRestaurant, Subcategory, Tag, CartOption } from '@/lib/types'
import { use } from 'react'

const TAX_RATE = 0.08875

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
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState<{ orderId: string; orderNumber: string } | null>(null)

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const itemCount = cartStore.itemCount()
  const subtotal = cartStore.subtotal()

  useEffect(() => { loadRestaurant() }, [slug])

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

    const fullRestaurant: PublicRestaurant = {
      ...r,
      restaurant_hours: hours ?? [],
      categories: enrichedCats,
      menu_items: enrichedItems,
    }

    setRestaurant(fullRestaurant)
    setIsOpen(isRestaurantOpen(hours ?? [], r.timezone))
    if (enrichedCats.length > 0) setActiveCategory(enrichedCats[0].id)

    // Set default order type
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
    cartStore.addItem({
      restaurantId: restaurant.id,
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      quantity: qty,
      notes,
      selected_options: options,
    })
  }

  async function placeOrder() {
    if (!restaurant || cartStore.items.length === 0) return
    if (!checkoutForm.name || !checkoutForm.phone) return

    setCheckoutLoading(true)
    const tax = subtotal * TAX_RATE
    const total = subtotal + tax

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        order_type: orderType,
        customer_name: checkoutForm.name,
        customer_phone: checkoutForm.phone,
        customer_email: checkoutForm.email,
        order_notes: checkoutForm.notes || null,
        delivery_address: orderType === 'delivery' ? checkoutForm.delivery_address : null,
        delivery_instructions: orderType === 'delivery' ? checkoutForm.delivery_instructions : null,
        subtotal,
        tax_amount: tax,
        fee_amount: 0,
        total_amount: total,
        items: cartStore.items.map(item => ({
          menu_item_id: item.menu_item_id,
          item_name_snapshot: item.name,
          base_price_snapshot: item.price,
          quantity: item.quantity,
          notes: item.notes || null,
          line_total: item.line_total,
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
    }
    setCheckoutLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl mb-4">🍽️</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h1>
      <p className="text-gray-500">This restaurant page doesn't exist or is not available.</p>
    </div>
  )

  if (!restaurant) return null

  const displayItems = search.trim()
    ? filteredItems()
    : restaurant.categories.flatMap(cat => filteredItems(cat.id))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Order Confirmation Overlay */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-gray-500 mb-2">Your order has been received.</p>
            <div className="bg-orange-50 rounded-xl p-4 my-4">
              <p className="text-xs text-orange-600 font-medium">Order Number</p>
              <p className="text-xl font-bold text-orange-500">{orderConfirmed.orderNumber}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">Payment: Pay at restaurant</p>
            <button onClick={() => setOrderConfirmed(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition">
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Hero / Header */}
      <div className="relative">
        {restaurant.cover_image_url ? (
          <div className="relative h-56 md:h-72">
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-r from-orange-400 to-amber-500" />
        )}

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex items-end gap-4 -mt-12 md:-mt-16 pb-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-xl bg-white overflow-hidden shrink-0">
              {restaurant.logo_url ? (
                <Image src={restaurant.logo_url} alt={restaurant.name} width={128} height={128} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-orange-100 flex items-center justify-center text-4xl">🍣</div>
              )}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {isOpen ? '● Open' : '● Closed'}
                </span>
              </div>
              {restaurant.address && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={13} /> {restaurant.address}
                </p>
              )}
              {restaurant.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone size={13} /> {restaurant.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Closed Banner */}
      {!isOpen && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-4">
            <Clock size={16} /> Online ordering is currently unavailable (restaurant is closed)
          </div>
        </div>
      )}

      {!restaurant.online_ordering_enabled && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm mb-4">
            Online ordering is currently disabled for this restaurant.
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pb-32">
        {/* Search */}
        <div className="relative my-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search menu items…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-orange-400 shadow-sm" />
        </div>

        <div className="flex gap-6 items-start">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Category Nav */}
            {!search.trim() && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                {restaurant.categories.map(cat => (
                  <button key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); categoryRefs.current[cat.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Items */}
            {search.trim() ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">{displayItems.length} results for &ldquo;{search}&rdquo;</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {displayItems.map(item => (
                    <MenuItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                  ))}
                </div>
              </div>
            ) : (
              restaurant.categories.map(cat => {
                const catItems = filteredItems(cat.id)
                if (catItems.length === 0) return null
                return (
                  <div key={cat.id} ref={el => { categoryRefs.current[cat.id] = el }} className="mb-10">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      {cat.name}
                      <span className="text-sm font-normal text-gray-400">{catItems.length} items</span>
                    </h2>

                    {cat.subcategories.length > 0 ? (
                      cat.subcategories.map(sub => {
                        const subItems = filteredItems(cat.id, sub.id)
                        if (subItems.length === 0) return null
                        return (
                          <div key={sub.id} className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{sub.name}</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                              {subItems.map(item => (
                                <MenuItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                              ))}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {catItems.filter(i => !i.subcategory_id).map(item => (
                          <MenuItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Cart */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingBag size={18} className="text-orange-500" /> Your Order
                {itemCount > 0 && <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{itemCount}</span>}
              </h2>
              <Cart onCheckout={() => setCheckoutOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Cart Button */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button onClick={() => setCartOpen(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-between px-6 shadow-2xl shadow-orange-300 transition">
            <span className="flex items-center gap-2"><ShoppingBag size={20} /> {itemCount} item{itemCount > 1 ? 's' : ''}</span>
            <span>{formatCurrency(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">Your Order</h2>
              <button onClick={() => setCartOpen(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Cart onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} />
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} />
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCheckoutOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Checkout</h2>
              <button onClick={() => setCheckoutOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Order Type */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Order Type</p>
                <div className="flex gap-2">
                  {restaurant.pickup_enabled && (
                    <button onClick={() => setOrderType('pickup')}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${orderType === 'pickup' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600'}`}>
                      Pickup
                    </button>
                  )}
                  {restaurant.dine_in_enabled && (
                    <button onClick={() => setOrderType('dine_in')}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${orderType === 'dine_in' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600'}`}>
                      Dine-In
                    </button>
                  )}
                  {restaurant.delivery_enabled && (
                    <button onClick={() => setOrderType('delivery')}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${orderType === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600'}`}>
                      Delivery
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Your Information</p>
                <input value={checkoutForm.name} onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full Name *" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                <input value={checkoutForm.phone} onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone Number *" required type="tel"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                <input value={checkoutForm.email} onChange={e => setCheckoutForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email (optional)" type="email"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
              </div>

              {/* Delivery Address */}
              {orderType === 'delivery' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                  <input value={checkoutForm.delivery_address} onChange={e => setCheckoutForm(f => ({ ...f, delivery_address: e.target.value }))}
                    placeholder="Street Address *" required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  <input value={checkoutForm.delivery_instructions} onChange={e => setCheckoutForm(f => ({ ...f, delivery_instructions: e.target.value }))}
                    placeholder="Delivery instructions (optional)"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              )}

              <textarea value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Order notes (optional)" rows={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />

              {/* Payment */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                💳 <strong>Payment:</strong> Pay at restaurant (card/cash accepted)
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-100 pt-4 space-y-1">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Tax</span><span>{formatCurrency(subtotal * TAX_RATE)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span><span>{formatCurrency(subtotal * (1 + TAX_RATE))}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0">
              <button onClick={placeOrder} disabled={checkoutLoading || !isOpen || !restaurant.online_ordering_enabled}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition flex items-center justify-center gap-2 text-base">
                {checkoutLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Place Order · {formatCurrency(subtotal * (1 + TAX_RATE))}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItemCard({ item, onClick }: { item: MenuItem & { tags: Tag[] }, onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition overflow-hidden text-left group">
      <div className="flex gap-3 p-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm group-hover:text-orange-500 transition">{item.name}</h3>
          {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags?.map(t => (
              <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: t.color + '20', color: t.color }}>
                {t.name}
              </span>
            ))}
          </div>
          <p className="font-bold text-orange-500 text-sm mt-2">{formatCurrency(item.price)}</p>
        </div>
        {item.image_url && (
          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
            <Image src={item.image_url} alt={item.name} width={80} height={80} className="object-cover w-full h-full" />
          </div>
        )}
      </div>
    </button>
  )
}
