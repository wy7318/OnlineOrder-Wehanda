'use client'

import { Plus, Minus, X, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/lib/utils/helpers'
import Button from '@/components/ui/Button'

interface CartProps {
  onCheckout: () => void
  isOpen?: boolean
}

const TAX_RATE = 0.08875

export default function Cart({ onCheckout, isOpen }: CartProps) {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore()
  const sub = subtotal()
  const tax = sub * TAX_RATE
  const total = sub + tax

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <ShoppingBag size={40} className="mb-3 opacity-40" />
        <p className="font-medium text-gray-500">Your cart is empty</p>
        <p className="text-xs mt-1">Add items from the menu to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{item.name}</p>
              {item.selected_options.map((opt, i) => (
                <p key={i} className="text-xs text-gray-500">
                  {opt.option_group_name}: {opt.option_name}
                  {opt.additional_price > 0 && ` (+${formatCurrency(opt.additional_price)})`}
                </p>
              ))}
              {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
              <p className="text-sm font-semibold text-orange-500 mt-1">{formatCurrency(item.line_total)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition">
                <Minus size={12} />
              </button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition">
                <Plus size={12} />
              </button>
              <button onClick={() => removeItem(item.id)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-400 transition ml-1">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-100 pt-4 space-y-1 mb-4">
        <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(sub)}</span></div>
        <div className="flex justify-between text-sm text-gray-600"><span>Tax (8.875%)</span><span>{formatCurrency(tax)}</span></div>
        <div className="flex justify-between font-bold text-gray-900 text-base mt-2 pt-2 border-t border-gray-100">
          <span>Total</span><span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Button onClick={onCheckout} className="w-full" size="lg">
        Checkout · {formatCurrency(total)}
      </Button>
    </div>
  )
}
