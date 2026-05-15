'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartOption } from '@/lib/types'

interface CartState {
  restaurantId: string | null
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id' | 'line_total'> & { restaurantId: string }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  subtotal: () => number
  itemCount: () => number
}

function calcLineTotal(price: number, options: CartOption[], qty: number) {
  const optionsTotal = options.reduce((s, o) => s + o.additional_price, 0)
  return (price + optionsTotal) * qty
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      items: [],

      addItem: ({ restaurantId, ...item }) => {
        set(state => {
          // Reset cart if switching restaurants
          if (state.restaurantId && state.restaurantId !== restaurantId) {
            const id = crypto.randomUUID()
            return {
              restaurantId,
              items: [{
                ...item,
                id,
                line_total: calcLineTotal(item.price, item.selected_options, item.quantity),
              }],
            }
          }
          const id = crypto.randomUUID()
          return {
            restaurantId,
            items: [
              ...state.items,
              {
                ...item,
                id,
                line_total: calcLineTotal(item.price, item.selected_options, item.quantity),
              },
            ],
          }
        })
      },

      removeItem: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? { ...i, quantity, line_total: calcLineTotal(i.price, i.selected_options, quantity) }
              : i
          ).filter(i => i.quantity > 0),
        })),

      clearCart: () => set({ items: [], restaurantId: null }),

      subtotal: () => get().items.reduce((s, i) => s + i.line_total, 0),

      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'restaurant-cart' }
  )
)
