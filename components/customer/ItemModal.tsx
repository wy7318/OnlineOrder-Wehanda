'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingBag, Check } from 'lucide-react'
import Image from 'next/image'
import type { MenuItem, Option, OptionGroup, CartOption } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/helpers'

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
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter(id => id !== optionId) }
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
        errs[group.id] = `Please select at least ${group.min_select} option${group.min_select > 1 ? 's' : ''}`
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
        if (opt) cartOptions.push({ option_group_id: group.id, option_group_name: group.name, option_id: opt.id, option_name: opt.name, additional_price: opt.additional_price })
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Hero image (close button overlaid on image) */}
        {item.image_url ? (
          <div className="relative h-52 sm:h-60 rounded-t-3xl sm:rounded-t-2xl overflow-hidden shrink-0">
            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 bg-white/95 rounded-full flex items-center justify-center shadow-md hover:bg-white transition"
            >
              <X size={16} className="text-gray-700" />
            </button>
          </div>
        ) : (
          /* No image — close button sits in its own row so it never overlaps price */
          <div className="flex justify-end px-4 pt-4 shrink-0">
            <button
              onClick={onClose}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
            >
              <X size={16} className="text-gray-700" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={item.image_url ? 'p-6' : 'px-6 pt-3 pb-6'}>
            {/* Title + price */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight flex-1">{item.name}</h2>
              <span className="font-extrabold text-brand-500 text-xl shrink-0">{formatCurrency(item.price)}</span>
            </div>
            {item.description && <p className="text-gray-500 text-sm leading-relaxed mb-5">{item.description}</p>}
            {!item.description && <div className="mb-5" />}

            {/* Option Groups */}
            {item.option_groups.map(group => {
              const isSingle = group.max_select === 1
              const activeOptions = (group.options ?? []).filter(o => o.is_active)
              const selected = selections[group.id] ?? []

              return (
                <div key={group.id} className="mb-6">
                  {/* Group header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">{group.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        group.is_required ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {group.is_required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    {group.max_select > 1 && (
                      <span className="text-xs text-gray-400">Pick up to {group.max_select}</span>
                    )}
                  </div>
                  {errors[group.id] && (
                    <p className="text-xs text-red-500 mb-2 font-medium">{errors[group.id]}</p>
                  )}

                  {/* Single-select: pill grid */}
                  {isSingle ? (
                    <div className="flex flex-wrap gap-2">
                      {activeOptions.map(opt => {
                        const isSelected = selected.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.max_select)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                              isSelected
                                ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                                : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50'
                            }`}
                          >
                            {isSelected && <Check size={13} />}
                            {opt.name}
                            {opt.additional_price > 0 && (
                              <span className={`text-xs font-bold ${isSelected ? 'text-white/80' : 'text-green-600'}`}>
                                +{formatCurrency(opt.additional_price)}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    /* Multi-select: card rows */
                    <div className="space-y-2">
                      {activeOptions.map(opt => {
                        const isSelected = selected.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group.id, opt.id, group.max_select)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left ${
                              isSelected ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                              isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-800">{opt.name}</span>
                            {opt.additional_price > 0 && (
                              <span className="text-sm text-green-600 font-bold">+{formatCurrency(opt.additional_price)}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Special instructions */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Special Instructions</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="No onions, extra sauce, allergies…"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none transition"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-brand-500 transition rounded-lg hover:bg-white"
              >
                <Minus size={15} />
              </button>
              <span className="w-8 text-center font-extrabold text-gray-900 text-sm">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-brand-500 transition rounded-lg hover:bg-white"
              >
                <Plus size={15} />
              </button>
            </div>
            <span className="flex-1 text-right font-extrabold text-gray-900 text-lg">{formatCurrency(lineTotal)}</span>
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold py-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md shadow-brand-200/60"
          >
            <ShoppingBag size={17} /> Add to Cart · {formatCurrency(lineTotal)}
          </button>
        </div>
      </div>
    </div>
  )
}
