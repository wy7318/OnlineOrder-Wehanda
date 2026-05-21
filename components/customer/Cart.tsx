'use client'

import { Plus, Minus, X, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/lib/utils/helpers'
import Image from 'next/image'

interface CartProps {
  onCheckout: () => void
  isOpen?: boolean
  taxRate: number
}

export default function Cart({ onCheckout, taxRate }: CartProps) {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore()
  const sub = subtotal()
  const tax = Math.round(sub * taxRate * 100) / 100
  const total = sub + tax
  const taxPctLabel = parseFloat((taxRate * 100).toFixed(3))

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-3">
          <ShoppingBag size={24} className="text-orange-300" />
        </div>
        <p className="font-bold text-gray-700 text-sm mb-1">Your cart is empty</p>
        <p className="text-xs text-gray-400">Add items from the menu to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-2 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
            {item.image_url && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                <Image src={item.image_url} alt={item.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
              {item.selected_options.map((opt, i) => (
                <p key={i} className="text-xs text-gray-500 mt-0.5">
                  {opt.option_group_name}: {opt.option_name}
                  {opt.additional_price > 0 && ` (+${formatCurrency(opt.additional_price)})`}
                </p>
              ))}
              {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-orange-500 transition rounded"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-orange-500 transition rounded"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="font-bold text-orange-500 text-sm">{formatCurrency(item.line_total)}</span>
              </div>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-300 hover:text-red-400 transition shrink-0 p-0.5 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-100 pt-3 space-y-1.5 mb-4">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span><span>{formatCurrency(sub)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tax ({taxPctLabel}%)</span><span>{formatCurrency(tax)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-gray-900 pt-1.5 border-t border-gray-100 mt-1">
          <span>Total</span><span>{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-orange-200 text-sm"
      >
        Checkout · {formatCurrency(total)}
      </button>
    </div>
  )
}
