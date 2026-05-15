'use client'

import { useEffect, useState } from 'react'
import { X, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import type { Order } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  accepted:  'bg-indigo-100 text-indigo-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready:     'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Received', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled',
}

interface Props {
  restaurantId: string
  onClose: () => void
}

export default function OrderHistory({ restaurantId, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customer/orders?restaurant_id=${restaurantId}`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []) })
      .finally(() => setLoading(false))
  }, [restaurantId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Package size={18} className="text-orange-500" /> My Orders
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No orders yet</p>
              <p className="text-sm mt-1">Your orders at this restaurant will appear here</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">#{order.order_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>

                {order.order_items && order.order_items.length > 0 && (
                  <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                    {order.order_items.map(item => (
                      <p key={item.id}>{item.quantity}× {item.item_name_snapshot}</p>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400 capitalize">{order.order_type.replace('_', ' ')}</span>
                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
