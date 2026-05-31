'use client'
import { useState } from 'react'
import { Plus, Minus, ShoppingBag, X, ChevronRight, MapPin, Clock, CalendarDays, Check } from 'lucide-react'
import { DEMO_MENU, type DemoMenuItem } from './demoData'

interface CartItem { item: DemoMenuItem; qty: number }

function fmt(n: number) { return `$${n.toFixed(2)}` }
function cartTotal(cart: CartItem[]) { return cart.reduce((s, c) => s + c.item.price * c.qty, 0) }
function cartCount(cart: CartItem[]) { return cart.reduce((s, c) => s + c.qty, 0) }

const ORDER_TIMES = ['ASAP (~20 min)', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM']
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]
const RES_TIMES = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM']

let fakeOrderNum = 42

export default function CustomerDemo() {
  const [activeCategory, setActiveCategory] = useState('appetizers')
  const [selectedItem, setSelectedItem] = useState<DemoMenuItem | null>(null)
  const [itemQty, setItemQty] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'loading' | 'success'>('form')
  const [orderName, setOrderName] = useState('')
  const [orderType, setOrderType] = useState<'Pickup' | 'Dine In'>('Pickup')
  const [orderTime, setOrderTime] = useState(ORDER_TIMES[0])
  const [orderNum, setOrderNum] = useState(0)
  const [showReservation, setShowReservation] = useState(false)
  const [resStep, setResStep] = useState<'form' | 'loading' | 'success'>('form')
  const [resName, setResName] = useState('')
  const [resDate, setResDate] = useState('Saturday, Jun 7')
  const [resTime, setResTime] = useState('7:00 PM')
  const [resSize, setResSize] = useState(2)

  const currentCategory = DEMO_MENU.find(c => c.id === activeCategory)!

  function addToCart() {
    setCart(prev => {
      const exists = prev.find(c => c.item.id === selectedItem!.id)
      if (exists) return prev.map(c => c.item.id === selectedItem!.id ? { ...c, qty: c.qty + itemQty } : c)
      return [...prev, { item: selectedItem!, qty: itemQty }]
    })
    setSelectedItem(null)
    setItemQty(1)
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.item.id !== id))
  }

  function placeOrder() {
    if (!orderName.trim()) return
    setCheckoutStep('loading')
    const num = ++fakeOrderNum
    setTimeout(() => { setOrderNum(num); setCheckoutStep('success') }, 1800)
  }

  function resetCheckout() {
    setCart([])
    setShowCart(false)
    setShowCheckout(false)
    setCheckoutStep('form')
    setOrderName('')
  }

  function submitReservation() {
    if (!resName.trim()) return
    setResStep('loading')
    setTimeout(() => setResStep('success'), 1800)
  }

  function resetReservation() {
    setShowReservation(false)
    setResStep('form')
    setResName('')
    setResSize(2)
  }

  const total = cartTotal(cart)
  const count = cartCount(cart)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div
        className="relative px-6 pt-20 pb-16 sm:pt-24 sm:pb-20"
        style={{ background: 'linear-gradient(135deg, #037FFC 0%, #0255c4 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Open Now
            </span>
            <span className="text-white/60 text-xs">Closes 10pm</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-3">Sakura Kitchen</h1>
          <p className="text-white/75 mb-4 leading-relaxed max-w-xl">
            Authentic Japanese cuisine with fresh fish flown in daily. From traditional omakase to casual ramen — everything made from scratch.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {['Japanese', 'Sushi', 'Ramen'].map(t => (
              <span key={t} className="bg-white/15 text-white text-xs px-3 py-1 rounded-full font-medium border border-white/20">{t}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setShowCart(true) }}
              className="flex items-center justify-center gap-2 bg-white text-brand-600 font-bold px-6 py-3 rounded-xl hover:bg-brand-50 transition"
            >
              <ShoppingBag size={18} /> Order Online
            </button>
            <button
              onClick={() => setShowReservation(true)}
              className="flex items-center justify-center gap-2 border border-white/30 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition"
            >
              <CalendarDays size={18} /> Reserve a Table
            </button>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><MapPin size={14} /> 123 Market St, San Francisco</span>
          <span className="flex items-center gap-1.5"><Clock size={14} /> Mon–Fri 11am–10pm · Sat–Sun 11am–11pm</span>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {DEMO_MENU.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
                activeCategory === cat.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentCategory.items.map(item => (
            <button
              key={item.id}
              onClick={() => { setSelectedItem(item); setItemQty(1) }}
              className="text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-brand-200 transition group"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-brand-600 transition">{item.name}</h3>
                    {item.popular && (
                      <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Popular</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-gray-900 text-sm">{fmt(item.price)}</p>
                  <div className="mt-2 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center ml-auto opacity-0 group-hover:opacity-100 transition">
                    <Plus size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Reservation section */}
        <div className="mt-12 bg-brand-50 rounded-2xl border border-brand-100 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Reserve a Table</h3>
              <p className="text-sm text-gray-600">Book ahead for groups or special occasions.</p>
            </div>
            <button
              onClick={() => setShowReservation(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
            >
              Book Now <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Loyalty section */}
        <div className="mt-4 bg-amber-50 rounded-2xl border border-amber-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shrink-0 text-white text-lg">🏆</div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Sakura Rewards</h4>
            <p className="text-xs text-gray-600 mt-0.5">Earn 1 point per $1. Sign up at checkout to start collecting rewards.</p>
          </div>
        </div>
      </div>

      {/* Cart bottom bar */}
      {count > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-[60] px-4 pb-4 pt-2 bg-white/80 backdrop-blur-sm border-t border-gray-100"
        >
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 transition shadow-lg shadow-brand-200"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm">{count}</span>
              <span>View Order</span>
              <span className="font-black">{fmt(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Item modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
                  {selectedItem.popular && (
                    <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">Popular item</span>
                  )}
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{selectedItem.desc}</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <textarea
                  className="w-full bg-transparent text-sm text-gray-500 resize-none outline-none placeholder-gray-400"
                  rows={2}
                  placeholder="Special instructions (allergies, modifications)..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setItemQty(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Minus size={14} className="text-gray-600" />
                  </button>
                  <span className="font-bold text-gray-900 w-6 text-center">{itemQty}</span>
                  <button
                    onClick={() => setItemQty(q => q + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Plus size={14} className="text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2"
                >
                  Add to Order · {fmt(selectedItem.price * itemQty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Your Order</h3>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Your cart is empty</p>
                  <button onClick={() => setShowCart(false)} className="mt-4 text-brand-500 font-semibold text-sm">Browse the menu →</button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {cart.map(c => (
                      <div key={c.item.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">{c.qty}</div>
                        <span className="flex-1 text-sm font-medium text-gray-800">{c.item.name}</span>
                        <span className="text-sm font-bold text-gray-900">{fmt(c.item.price * c.qty)}</span>
                        <button onClick={() => removeFromCart(c.item.id)} className="text-gray-300 hover:text-red-400 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-4 mb-5">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Subtotal</span><span>{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Tax (8.625%)</span><span>{fmt(total * 0.08625)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                      <span>Total</span><span>{fmt(total * 1.08625)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowCart(false); setShowCheckout(true) }}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl transition"
                  >
                    Proceed to Checkout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {checkoutStep === 'form' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Checkout</h3>
                  <button onClick={() => setShowCheckout(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Your Name *</label>
                    <input
                      value={orderName}
                      onChange={e => setOrderName(e.target.value)}
                      placeholder="e.g. Sarah Chen"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Order Type</label>
                    <div className="flex gap-2">
                      {(['Pickup', 'Dine In'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setOrderType(t)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${orderType === t ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Ready Time</label>
                    <select
                      value={orderTime}
                      onChange={e => setOrderTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {ORDER_TIMES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-4 flex justify-between text-sm">
                  <span className="text-gray-500">{count} item{count !== 1 ? 's' : ''}</span>
                  <span className="font-bold text-gray-900">{fmt(total * 1.08625)}</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={!orderName.trim()}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Place Order · {fmt(total * 1.08625)}
                </button>
              </div>
            )}

            {checkoutStep === 'loading' && (
              <div className="p-10 text-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Placing your order…</p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-green-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Order Confirmed! 🎉</h3>
                <p className="text-gray-500 text-sm mb-1">Order #{String(orderNum).padStart(4, '0')}</p>
                <p className="text-gray-700 font-medium mb-4">{orderType} · {orderTime}</p>
                <div className="bg-brand-50 rounded-xl p-4 mb-6 text-sm text-brand-700">
                  <p className="font-semibold">Ready in approximately 20–25 minutes</p>
                  <p className="text-brand-500 mt-1">Sakura Kitchen will start preparing shortly.</p>
                </div>
                <p className="text-xs text-gray-400 mb-4 italic">
                  Demo mode — no real order was placed. In production, this would be sent to the restaurant's live dashboard.
                </p>
                <button
                  onClick={resetCheckout}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl transition"
                >
                  Back to Menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reservation modal */}
      {showReservation && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {resStep === 'form' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Reserve a Table</h3>
                  <button onClick={() => setShowReservation(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Your Name *</label>
                    <input
                      value={resName}
                      onChange={e => setResName(e.target.value)}
                      placeholder="e.g. Sarah Chen"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Date</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Today', 'Tomorrow', 'Saturday, Jun 7', 'Sunday, Jun 8'].map(d => (
                        <button
                          key={d}
                          onClick={() => setResDate(d)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${resDate === d ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Time</label>
                      <select
                        value={resTime}
                        onChange={e => setResTime(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {RES_TIMES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Party Size</label>
                      <select
                        value={resSize}
                        onChange={e => setResSize(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {PARTY_SIZES.map(n => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  onClick={submitReservation}
                  disabled={!resName.trim()}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Reservation
                </button>
              </div>
            )}

            {resStep === 'loading' && (
              <div className="p-10 text-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Checking availability…</p>
              </div>
            )}

            {resStep === 'success' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays size={28} className="text-green-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Table Confirmed! ✅</h3>
                <p className="text-gray-500 text-sm mb-5">
                  {resName} · {resSize} guest{resSize !== 1 ? 's' : ''}<br />
                  <strong className="text-gray-700">{resDate} at {resTime}</strong><br />
                  Sakura Kitchen · 123 Market St, SF
                </p>
                <p className="text-xs text-gray-400 mb-5 italic">
                  Demo mode — no real reservation was created. In production, this would appear in the restaurant's bookings dashboard.
                </p>
                <button onClick={resetReservation} className="bg-brand-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-brand-600 transition">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
