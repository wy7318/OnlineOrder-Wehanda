'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/dashboard/Header'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { Search, RefreshCw, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import type { Order, OrderItem, OrderItemOption, OrderStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'new', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_FLOW: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'completed']

const statusBadge: Record<OrderStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' }> = {
  new: { label: 'New', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'orange' },
  preparing: { label: 'Preparing', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
}

export default function OrdersPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filtered, setFiltered] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<(OrderItem & { options: OrderItemOption[] })[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => { loadData() }, [])

  // Auto-refresh orders list when a new order arrives via realtime
  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`orders-page-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => { loadData() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId])

  useEffect(() => {
    let result = [...orders]
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.order_number.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [orders, statusFilter, search])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_user_id', user.id).single()
    if (!r) return
    setRestaurantId(r.id)
    const { data } = await supabase.from('orders').select('*').eq('restaurant_id', r.id).order('created_at', { ascending: false })
    setOrders(data ?? [])
  }

  async function openOrder(order: Order) {
    setSelectedOrder(order)
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    const { data: opts } = await supabase.from('order_item_options').select('*').eq('order_item_id', `in.(${(items ?? []).map(i => `'${i.id}'`).join(',')})`)
    setOrderItems((items ?? []).map(item => ({
      ...item,
      options: (opts ?? []).filter(o => o.order_item_id === item.id),
    })))
    setModalOpen(true)
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingStatus(true)
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
    if (error) {
      toast('Failed to update status', 'error')
    } else {
      toast('Order status updated', 'success')
      setSelectedOrder(prev => prev ? { ...prev, status } : prev)
      loadData()
    }
    setUpdatingStatus(false)
  }

  function nextStatus(current: OrderStatus): OrderStatus | null {
    const idx = STATUS_FLOW.indexOf(current)
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  }

  const counts = {
    new: orders.filter(o => o.status === 'new').length,
    preparing: orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length,
  }

  return (
    <>
      <Header
        title="Orders"
        subtitle="Manage all incoming and active orders"
        actions={
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw size={14} /> Refresh</Button>
        }
      />

      {/* Quick Stats */}
      <div className="flex gap-3 mb-6">
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium">
          {counts.new} New Orders
        </div>
        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium">
          {counts.preparing} In Progress
        </div>
        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium">
          {orders.length} Total
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or order #"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-orange-400"
          />
        </div>
        <Select options={STATUS_OPTIONS} value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)} className="sm:w-48" />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order #', 'Customer', 'Type', 'Items', 'Total', 'Status', 'Time', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => {
                  const s = statusBadge[order.status as OrderStatus]
                  const next = nextStatus(order.status as OrderStatus)
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{order.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-xs text-gray-400">{order.customer_phone}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{order.order_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-gray-600">—</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openOrder(order)} className="text-gray-400 hover:text-orange-500 transition">
                            <Eye size={16} />
                          </button>
                          {next && order.status !== 'cancelled' && (
                            <button
                              onClick={() => updateStatus(order.id, next)}
                              className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100 transition whitespace-nowrap"
                            >
                              → {next.charAt(0).toUpperCase() + next.slice(1)}
                            </button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'completed' && (
                            <button
                              onClick={() => updateStatus(order.id, 'cancelled')}
                              className="text-xs text-red-400 hover:text-red-600 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Order ${selectedOrder?.order_number}`} size="lg">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Customer</p>
                <p className="font-semibold text-gray-900">{selectedOrder.customer_name}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customer_phone}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customer_email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Order Info</p>
                <p className="text-sm text-gray-700 capitalize"><strong>Type:</strong> {selectedOrder.order_type.replace('_', ' ')}</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> <Badge variant={statusBadge[selectedOrder.status].variant}>{statusBadge[selectedOrder.status].label}</Badge></p>
                <p className="text-sm text-gray-500 mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            {selectedOrder.delivery_address && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Delivery Address</p>
                <p className="text-sm text-gray-700">{selectedOrder.delivery_address}</p>
                {selectedOrder.delivery_instructions && <p className="text-sm text-gray-500">{selectedOrder.delivery_instructions}</p>}
              </div>
            )}

            {selectedOrder.order_notes && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xs font-medium text-yellow-700 mb-1">Order Notes</p>
                <p className="text-sm text-yellow-800">{selectedOrder.order_notes}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">Items</p>
              <div className="space-y-3">
                {orderItems.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.quantity}× {item.item_name_snapshot}</p>
                      {item.options.map(opt => (
                        <p key={opt.id} className="text-xs text-gray-500">
                          {opt.option_group_name_snapshot}: {opt.option_name_snapshot}
                          {opt.additional_price_snapshot > 0 && ` (+${formatCurrency(opt.additional_price_snapshot)})`}
                        </p>
                      ))}
                      {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">Note: {item.notes}</p>}
                    </div>
                    <span className="font-semibold text-gray-900 ml-4">{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 pt-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Tax</span><span>{formatCurrency(selectedOrder.tax_amount)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Fees</span><span>{formatCurrency(selectedOrder.fee_amount)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-base"><span>Total</span><span>{formatCurrency(selectedOrder.total_amount)}</span></div>
            </div>

            {/* Status Actions */}
            {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
              <div className="flex flex-wrap gap-2 pt-2">
                {STATUS_FLOW.slice(STATUS_FLOW.indexOf(selectedOrder.status) + 1).map(s => (
                  <Button key={s} size="sm" onClick={() => updateStatus(selectedOrder.id, s)} loading={updatingStatus}>
                    Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
                <Button variant="danger" size="sm" onClick={() => updateStatus(selectedOrder.id, 'cancelled')} loading={updatingStatus}>
                  Cancel Order
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
