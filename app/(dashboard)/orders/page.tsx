'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, RefreshCw, ChevronDown, ChevronUp, Clock, MessageSquare, X, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import type { Order, OrderItem, OrderItemOption, OrderStatus } from '@/lib/types'

/* ─── types ─── */

type OrderRow = Omit<Order, 'order_items'> & {
  order_items: { id: string }[]
}

type FullOrderItem = OrderItem & {
  order_item_options: OrderItemOption[]
}

/* ─── constants ─── */

const KANBAN_COLS: { status: OrderStatus; label: string; dotCls: string; headerCls: string }[] = [
  { status: 'new',       label: 'New',             dotCls: 'bg-blue-500',   headerCls: 'border-blue-100 bg-blue-50/60' },
  { status: 'accepted',  label: 'Accepted',         dotCls: 'bg-brand-500', headerCls: 'border-brand-100 bg-brand-50/60' },
  { status: 'preparing', label: 'Preparing',        dotCls: 'bg-amber-500',  headerCls: 'border-amber-100 bg-amber-50/60' },
  { status: 'ready',     label: 'Ready for Pickup', dotCls: 'bg-green-500',  headerCls: 'border-green-100 bg-green-50/60' },
]

const ADVANCE: Partial<Record<OrderStatus, { label: string; cls: string; next: OrderStatus }>> = {
  new:       { label: 'Accept Order',  cls: 'bg-emerald-500 hover:bg-emerald-600 text-white',  next: 'accepted' },
  accepted:  { label: 'Start Preparing', cls: 'bg-brand-500 hover:bg-brand-600 text-white',  next: 'preparing' },
  preparing: { label: 'Mark Ready',    cls: 'bg-blue-500 hover:bg-blue-600 text-white',         next: 'ready' },
  ready:     { label: 'Complete',      cls: 'bg-gray-700 hover:bg-gray-800 text-white',         next: 'completed' },
}

const TYPE_BADGE: Record<string, string> = {
  pickup:   'bg-blue-50 text-blue-600 border-blue-100',
  delivery: 'bg-brand-50 text-brand-600 border-brand-100',
  dine_in:  'bg-teal-50 text-teal-700 border-teal-100',
  takeout:  'bg-blue-50 text-blue-600 border-blue-100',
}

const TYPE_LABEL: Record<string, string> = {
  pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-in', takeout: 'Takeout',
}

/* ─── helpers ─── */

function minsAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function agePill(status: OrderStatus, iso: string) {
  const m = minsAgo(iso)
  let cls = 'bg-green-100 text-green-700'
  if (status === 'preparing') {
    if (m > 25) cls = 'bg-red-100 text-red-600'
    else if (m > 15) cls = 'bg-amber-100 text-amber-700'
  } else if (status === 'ready') {
    if (m > 15) cls = 'bg-red-100 text-red-600'
    else if (m > 8)  cls = 'bg-amber-100 text-amber-700'
  } else {
    if (m > 20) cls = 'bg-red-100 text-red-600'
    else if (m > 10) cls = 'bg-amber-100 text-amber-700'
  }
  return { cls, label: m === 0 ? 'just now' : `${m}m` }
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ─── main component ─── */

export default function OrdersPage() {
  const supabase = createClient()

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Modal state
  const [modalOrder, setModalOrder] = useState<OrderRow | null>(null)
  const [modalItems, setModalItems] = useState<FullOrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  /* ── load ── */
  const loadOrders = useCallback(async (rid?: string) => {
    const id = rid ?? restaurantId
    if (!id) return
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(id)')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })
      .limit(300)
    setOrders((data ?? []) as OrderRow[])
  }, [restaurantId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/restaurant/current')
      if (!res.ok) return
      const r = await res.json()
      if (!r?.id) return
      setRestaurantId(r.id)
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(id)')
        .eq('restaurant_id', r.id)
        .order('created_at', { ascending: false })
        .limit(300)
      setOrders((data ?? []) as OrderRow[])
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`kanban-${restaurantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => loadOrders())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => loadOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, loadOrders])

  /* ── filtered data ── */
  const q = search.trim().toLowerCase()
  const filtered = q
    ? orders.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
      )
    : orders

  const active   = filtered.filter(o => ['new', 'accepted', 'preparing', 'ready'].includes(o.status))
  const history  = filtered.filter(o => o.status === 'completed' || o.status === 'cancelled')

  /* ── actions ── */
  async function advanceStatus(e: React.MouseEvent, order: OrderRow, next: OrderStatus) {
    e.stopPropagation()
    setUpdatingId(order.id)
    await supabase.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', order.id)
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
    if (modalOrder?.id === order.id) setModalOrder(prev => prev ? { ...prev, status: next } : prev)
    setUpdatingId(null)
  }

  async function cancelOrder(e: React.MouseEvent, order: OrderRow) {
    e.stopPropagation()
    if (!confirm(`Cancel order ${order.order_number}?`)) return
    setUpdatingId(order.id)
    await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
    if (modalOrder?.id === order.id) setModalOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev)
    setUpdatingId(null)
  }

  async function openModal(order: OrderRow) {
    setModalOrder(order)
    setLoadingItems(true)
    const { data } = await supabase
      .from('order_items')
      .select('*, order_item_options(*)')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })
    setModalItems((data ?? []) as FullOrderItem[])
    setLoadingItems(false)
  }

  /* ── render ── */
  const activeCount = orders.filter(o => ['new', 'accepted', 'preparing', 'ready'].includes(o.status)).length
  const newCount    = orders.filter(o => o.status === 'new').length

  return (
    <div className="flex flex-col h-full pb-4">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-[15px] text-gray-400 mt-0.5">
            {activeCount} active · {newCount > 0 && <span className="text-blue-600 font-medium">{newCount} new</span>}
            {newCount === 0 && 'all caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Order #, name, phone…"
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-brand-400 w-56"
            />
          </div>
          <button
            onClick={() => loadOrders()}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-brand-500 hover:border-brand-200 transition"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ─── Kanban Board ─── */}
      <div className="flex gap-4 overflow-x-auto pb-3 flex-1">
        {KANBAN_COLS.map(col => {
          const colOrders = active
            .filter(o => o.status === col.status)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          const adv = ADVANCE[col.status]
          return (
            <div
              key={col.status}
              className="flex flex-col min-w-[272px] w-72 flex-shrink-0 rounded-2xl border border-gray-100 bg-gray-50/50 overflow-hidden"
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2.5 border-b ${col.headerCls}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotCls}`} />
                  <span className="text-[15px] font-semibold text-gray-700">{col.label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colOrders.length > 0 ? `${col.dotCls} text-white` : 'bg-gray-200 text-gray-500'}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colOrders.length === 0 && (
                  <div className="py-10 text-center text-gray-300 text-sm">
                    <CheckCircle size={22} className="mx-auto mb-1.5 opacity-50" />
                    Empty
                  </div>
                )}
                {colOrders.map(order => {
                  const age = agePill(order.status, order.created_at)
                  const isUpdating = updatingId === order.id
                  const itemCount = order.order_items?.length ?? 0
                  return (
                    <div
                      key={order.id}
                      onClick={() => openModal(order)}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:border-brand-200 hover:shadow-md transition-all group"
                    >
                      {/* Row 1: order # + type + age */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="font-mono text-xs font-bold text-gray-800 flex-1">{order.order_number}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TYPE_BADGE[order.order_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {TYPE_LABEL[order.order_type] ?? order.order_type}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${age.cls}`}>
                          <Clock size={9} />
                          {age.label}
                        </span>
                      </div>

                      {/* Row 2: customer + total */}
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate flex-1 mr-2">{order.customer_name}</p>
                        <p className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(order.total_amount)}</p>
                      </div>

                      {/* Row 3: item count */}
                      <p className="text-xs text-gray-400 mb-2">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                        {order.order_type === 'delivery' && order.delivery_address && (
                          <span className="ml-1 text-brand-500">· Delivery</span>
                        )}
                      </p>

                      {/* Notes */}
                      {order.order_notes && (
                        <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg mb-2">
                          <MessageSquare size={10} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{order.order_notes}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                        {adv && (
                          <button
                            onClick={e => advanceStatus(e, order, adv.next)}
                            disabled={isUpdating}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition disabled:opacity-60 ${adv.cls}`}
                          >
                            {isUpdating ? '…' : adv.label}
                          </button>
                        )}
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            onClick={e => cancelOrder(e, order)}
                            disabled={isUpdating}
                            className="px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-60 text-xs"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── History Section ─── */}
      <div className="mt-4">
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition font-medium"
        >
          {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          History — {history.length} order{history.length !== 1 ? 's' : ''} (completed &amp; cancelled)
        </button>

        {showHistory && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No completed or cancelled orders</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Order #', 'Customer', 'Type', 'Items', 'Total', 'Status', 'Time'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map(order => (
                      <tr
                        key={order.id}
                        onClick={() => openModal(order)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{order.order_number}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{order.customer_name}</p>
                          <p className="text-xs text-gray-400">{order.customer_phone}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TYPE_BADGE[order.order_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {TYPE_LABEL[order.order_type] ?? order.order_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{order.order_items?.length ?? 0} items</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{formatCurrency(order.total_amount)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {order.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtTime(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      {modalOrder && (
        <OrderDetailModal
          order={modalOrder}
          items={modalItems}
          loadingItems={loadingItems}
          updatingId={updatingId}
          onClose={() => setModalOrder(null)}
          onAdvance={(next) => advanceStatus({ stopPropagation: () => {} } as React.MouseEvent, modalOrder, next)}
          onCancel={(e) => cancelOrder(e, modalOrder)}
        />
      )}
    </div>
  )
}

/* ─── Order Detail Modal ─── */

interface ModalProps {
  order: OrderRow
  items: FullOrderItem[]
  loadingItems: boolean
  updatingId: string | null
  onClose: () => void
  onAdvance: (next: OrderStatus) => void
  onCancel: (e: React.MouseEvent) => void
}

function OrderDetailModal({ order, items, loadingItems, updatingId, onClose, onAdvance, onCancel }: ModalProps) {
  const adv = ADVANCE[order.status]
  const isUpdating = updatingId === order.id

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-32px)] mt-0">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-gray-900">{order.order_number}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TYPE_BADGE[order.order_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {TYPE_LABEL[order.order_type] ?? order.order_type}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              order.status === 'completed' ? 'bg-green-100 text-green-700' :
              order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
              order.status === 'ready' ? 'bg-green-100 text-green-700' :
              order.status === 'preparing' ? 'bg-amber-100 text-amber-700' :
              order.status === 'accepted' ? 'bg-brand-100 text-brand-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
              <p className="font-semibold text-gray-900">{order.customer_name}</p>
              <p className="text-sm text-gray-500">{order.customer_phone}</p>
              {order.customer_email && <p className="text-sm text-gray-500">{order.customer_email}</p>}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Placed at</p>
              <p className="font-semibold text-gray-900">{fmtTime(order.created_at)}</p>
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{minsAgo(order.created_at)} min ago</p>
            </div>
          </div>

          {/* Delivery address */}
          {order.delivery_address && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-1">Delivery Address</p>
              <p className="text-sm text-gray-800">{order.delivery_address}</p>
              {order.delivery_instructions && (
                <p className="text-xs text-gray-500 mt-0.5">{order.delivery_instructions}</p>
              )}
            </div>
          )}

          {/* Order notes */}
          {order.order_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <MessageSquare size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Order Notes</p>
                <p className="text-sm text-amber-900">{order.order_notes}</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
            {loadingItems ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        <span className="text-brand-600 font-bold">{item.quantity}×</span> {item.item_name_snapshot}
                      </p>
                      {item.order_item_options.map(opt => (
                        <p key={opt.id} className="text-xs text-gray-500 mt-0.5">
                          {opt.option_group_name_snapshot}: {opt.option_name_snapshot}
                          {opt.additional_price_snapshot > 0 && (
                            <span className="text-gray-400"> (+{formatCurrency(opt.additional_price_snapshot)})</span>
                          )}
                        </p>
                      ))}
                      {item.notes && (
                        <p className="text-xs text-amber-600 italic mt-0.5">"{item.notes}"</p>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 ml-4 text-sm shrink-0">{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>Tax</span><span>{formatCurrency(order.tax_amount)}</span></div>
            {order.fee_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-500"><span>Tip</span><span>{formatCurrency(order.fee_amount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Footer action buttons */}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-2">
            {adv && (
              <button
                onClick={() => onAdvance(adv.next)}
                disabled={isUpdating}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60 ${adv.cls}`}
              >
                {isUpdating ? 'Updating…' : adv.label}
              </button>
            )}
            <button
              onClick={onCancel}
              disabled={isUpdating}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-medium text-sm transition disabled:opacity-60"
            >
              Cancel Order
            </button>
          </div>
        )}

        {(order.status === 'completed' || order.status === 'cancelled') && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <p className={`text-center text-sm font-medium ${order.status === 'completed' ? 'text-green-600' : 'text-red-500'}`}>
              {order.status === 'completed' ? '✓ Order completed' : '✕ Order cancelled'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
