'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, X, ShoppingBag, Sparkles } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/lib/utils/helpers'
import Image from 'next/image'
import type { UpsellItem } from '@/app/api/upsell/route'

interface CartProps {
  onCheckout: () => void
  isOpen?: boolean
  taxRate: number
  restaurantId?: string
  onUpsellAdd?: (menuItemId: string) => void
  accent?: string
}

export default function Cart({ onCheckout, taxRate, restaurantId, onUpsellAdd, accent = '#037FFC' }: CartProps) {
  const { items, updateQuantity, removeItem, subtotal, addItem } = useCartStore()
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([])

  const sub = subtotal()
  const tax = Math.round(sub * taxRate * 100) / 100
  const total = sub + tax
  const taxPctLabel = parseFloat((taxRate * 100).toFixed(3))

  // Stable key of cart item IDs — drives upsell refetch when cart changes
  const cartItemIds = items.map(i => i.menu_item_id).filter(Boolean).join(',')

  useEffect(() => {
    if (!restaurantId || !cartItemIds) {
      setUpsellItems([])
      return
    }
    let active = true
    fetch(`/api/upsell?restaurant_id=${restaurantId}&item_ids=${cartItemIds}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: UpsellItem[]) => { if (active) setUpsellItems(data) })
      .catch(() => {})
    return () => { active = false }
  }, [restaurantId, cartItemIds])

  // Items already in cart shouldn't appear as suggestions (guard for race conditions)
  const cartIdSet = new Set(items.map(i => i.menu_item_id))
  const visibleUpsell = upsellItems.filter(u => !cartIdSet.has(u.id))

  function handleAddUpsell(item: UpsellItem) {
    if (item.has_required_options) {
      // Has required options — open ItemModal so customer can configure
      onUpsellAdd?.(item.id)
    } else {
      // Simple item — add directly and flag as upsell-sourced
      addItem({
        restaurantId: restaurantId!,
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        quantity: 1,
        notes: '',
        selected_options: [],
        added_from_upsell: true,
      })
      setUpsellItems(prev => prev.filter(u => u.id !== item.id))
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: accent + '18' }}>
          <ShoppingBag size={24} style={{ color: accent }} />
        </div>
        <p className="font-bold text-gray-700 text-sm mb-1">Your cart is empty</p>
        <p className="text-xs text-gray-400">Add items from the menu to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Cart items */}
      <div className="space-y-2 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
            {item.image_url && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                <Image src={item.image_url} alt={item.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                {item.added_from_upsell && (
                  <span className="shrink-0 text-[9px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                    suggested
                  </span>
                )}
              </div>
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
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:opacity-70 transition rounded"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:opacity-70 transition rounded"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="font-bold text-sm" style={{ color: accent }}>{formatCurrency(item.line_total)}</span>
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

      {/* Upsell suggestions */}
      {visibleUpsell.length > 0 && (
        <div className="mb-4 border border-amber-100 bg-amber-50 rounded-2xl p-3">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1 mb-2.5">
            <Sparkles size={11} />
            Customers also ordered
          </p>
          <div className="space-y-2">
            {visibleUpsell.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 bg-white rounded-xl border border-amber-100 p-2"
              >
                {item.image_url ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-100 shrink-0 flex items-center justify-center">
                    <ShoppingBag size={14} className="text-amber-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                </div>
                <button
                  onClick={() => handleAddUpsell(item)}
                  className="shrink-0 w-7 h-7 text-white rounded-lg flex items-center justify-center hover:opacity-80 active:scale-95 transition"
                  style={{ background: accent }}
                  aria-label={`Add ${item.name}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-sm hover:opacity-90"
        style={{ background: accent }}
      >
        Checkout · {formatCurrency(total)}
      </button>
    </div>
  )
}
