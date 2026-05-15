'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import type { MenuItem, Option, OptionGroup, CartOption } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/helpers'
import Button from '@/components/ui/Button'

interface ItemModalProps {
  item: MenuItem & { option_groups: (OptionGroup & { options: Option[] })[] }
  onClose: () => void
  onAddToCart: (item: MenuItem, qty: number, options: CartOption[], notes: string) => void
}

export default function ItemModal({ item, onClose, onAddToCart }: ItemModalProps) {
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelections(prev => {
      const current = prev[groupId] ?? []
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] }
      if (current.length >= maxSelect) return prev
      return { ...prev, [groupId]: [...current, optionId] }
    })
    setErrors(prev => ({ ...prev, [groupId]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const group of item.option_groups) {
      const selected = selections[group.id] ?? []
      if (group.is_required && selected.length < group.min_select) {
        errs[group.id] = `Please select at least ${group.min_select} option(s)`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleAdd() {
    if (!validate()) return
    const cartOptions: CartOption[] = []
    for (const group of item.option_groups) {
      const selected = selections[group.id] ?? []
      for (const optId of selected) {
        const opt = group.options.find(o => o.id === optId)
        if (opt) {
          cartOptions.push({
            option_group_id: group.id,
            option_group_name: group.name,
            option_id: opt.id,
            option_name: opt.name,
            additional_price: opt.additional_price,
          })
        }
      }
    }
    onAddToCart(item, qty, cartOptions, notes)
    onClose()
  }

  const optionsTotal = Object.values(selections).flat().reduce((total, optId) => {
    for (const g of item.option_groups) {
      const opt = g.options.find(o => o.id === optId)
      if (opt) return total + opt.additional_price
    }
    return total
  }, 0)

  const lineTotal = (item.price + optionsTotal) * qty

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Image */}
        {item.image_url && (
          <div className="relative h-56 rounded-t-3xl sm:rounded-t-2xl overflow-hidden shrink-0">
            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
          </div>
        )}

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition">
          <X size={18} className="text-gray-700" />
        </button>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{item.name}</h2>
          {item.description && <p className="text-gray-500 text-sm mb-4">{item.description}</p>}
          <p className="text-orange-500 font-semibold text-lg mb-6">{formatCurrency(item.price)}</p>

          {/* Option Groups */}
          {item.option_groups.map(group => (
            <div key={group.id} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{group.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${group.is_required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {group.is_required ? 'Required' : 'Optional'}
                  {group.max_select > 1 && ` · up to ${group.max_select}`}
                </span>
              </div>
              {errors[group.id] && <p className="text-xs text-red-500 mb-2">{errors[group.id]}</p>}
              <div className="space-y-2">
                {(group.options ?? []).filter(o => o.is_active).map(opt => {
                  const selected = (selections[group.id] ?? []).includes(opt.id)
                  return (
                    <button key={opt.id} onClick={() => toggleOption(group.id, opt.id, group.max_select)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${selected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="flex-1 text-sm text-gray-800">{opt.name}</span>
                      {opt.additional_price > 0 && (
                        <span className="text-sm text-green-600 font-medium">+{formatCurrency(opt.additional_price)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Special Instructions (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. No onions, extra sauce…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 transition">
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-semibold text-gray-900">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 transition">
                <Plus size={16} />
              </button>
            </div>
            <span className="flex-1 text-right font-bold text-gray-900 text-lg">{formatCurrency(lineTotal)}</span>
          </div>
          <Button onClick={handleAdd} className="w-full" size="lg">
            <ShoppingBag size={18} /> Add to Cart · {formatCurrency(lineTotal)}
          </Button>
        </div>
      </div>
    </div>
  )
}
