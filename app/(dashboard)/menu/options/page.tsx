'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/dashboard/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import type { Option, OptionGroup } from '@/lib/types'

interface SimpleMenuItem { id: string; name: string }

export default function OptionsPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<SimpleMenuItem[]>([])
  const [groups, setGroups] = useState<(OptionGroup & { options: Option[] })[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [groupModal, setGroupModal] = useState(false)
  const [optionModal, setOptionModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null)
  const [editingOption, setEditingOption] = useState<Option | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const [groupForm, setGroupForm] = useState({ menu_item_id: '', name: '', is_required: false, min_select: 0, max_select: 1, display_order: 0 })
  const [optionForm, setOptionForm] = useState({ name: '', additional_price: '', is_active: true, display_order: 0 })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_user_id', user.id).single()
    if (!r) return
    setRestaurantId(r.id)

    const [{ data: items }, { data: grps }, { data: opts }] = await Promise.all([
      supabase.from('menu_items').select('id, name').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('option_groups').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('options').select('*').eq('restaurant_id', r.id).order('display_order'),
    ])

    setMenuItems(items ?? [])
    setGroups((grps ?? []).map(g => ({ ...g, options: (opts ?? []).filter(o => o.option_group_id === g.id) })))
  }

  function openNewGroup() {
    setEditingGroup(null)
    setGroupForm({ menu_item_id: '', name: '', is_required: false, min_select: 0, max_select: 1, display_order: 0 })
    setGroupModal(true)
  }

  function openEditGroup(g: OptionGroup) {
    setEditingGroup(g)
    setGroupForm({ menu_item_id: g.menu_item_id, name: g.name, is_required: g.is_required, min_select: g.min_select, max_select: g.max_select, display_order: g.display_order })
    setGroupModal(true)
  }

  async function saveGroup() {
    if (!restaurantId || !groupForm.name.trim() || !groupForm.menu_item_id) { toast('Name and item required', 'error'); return }
    setLoading(true)
    const payload = { ...groupForm, restaurant_id: restaurantId }
    if (editingGroup) {
      await supabase.from('option_groups').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingGroup.id)
    } else {
      await supabase.from('option_groups').insert(payload)
    }
    toast('Saved!', 'success')
    setGroupModal(false)
    loadData()
    setLoading(false)
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete this option group and all its options?')) return
    await supabase.from('options').delete().eq('option_group_id', id)
    await supabase.from('option_groups').delete().eq('id', id)
    toast('Deleted', 'success')
    loadData()
  }

  function openNewOption(groupId: string) {
    setSelectedGroupId(groupId)
    setEditingOption(null)
    setOptionForm({ name: '', additional_price: '0', is_active: true, display_order: 0 })
    setOptionModal(true)
  }

  function openEditOption(opt: Option) {
    setSelectedGroupId(opt.option_group_id)
    setEditingOption(opt)
    setOptionForm({ name: opt.name, additional_price: String(opt.additional_price), is_active: opt.is_active, display_order: opt.display_order })
    setOptionModal(true)
  }

  async function saveOption() {
    if (!restaurantId || !selectedGroupId || !optionForm.name.trim()) { toast('Name is required', 'error'); return }
    setLoading(true)
    const payload = { ...optionForm, additional_price: Number(optionForm.additional_price), option_group_id: selectedGroupId, restaurant_id: restaurantId }
    if (editingOption) {
      await supabase.from('options').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingOption.id)
    } else {
      await supabase.from('options').insert(payload)
    }
    toast('Saved!', 'success')
    setOptionModal(false)
    loadData()
    setLoading(false)
  }

  async function deleteOption(id: string) {
    if (!confirm('Delete this option?')) return
    await supabase.from('options').delete().eq('id', id)
    toast('Deleted', 'success')
    loadData()
  }

  const itemOptions = [{ value: '', label: '-- Select Menu Item --' }, ...menuItems.map(i => ({ value: i.id, label: i.name }))]

  return (
    <>
      <Header title="Option Groups" subtitle="Configure item modifiers and add-ons" actions={
        <Button onClick={openNewGroup}><Plus size={16} /> Add Option Group</Button>
      } />

      {groups.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎛️</div>
          <p className="text-lg font-medium text-gray-600 mb-2">No option groups yet</p>
          <p className="text-sm mb-4">Add groups like "Protein Choice", "Spice Level", or "Add-ons"</p>
          <Button onClick={openNewGroup}><Plus size={16} /> Add First Group</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const item = menuItems.find(i => i.id === g.menu_item_id)
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setExpanded(e => { const n = new Set(e); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}
                    className="text-gray-400 hover:text-gray-600">
                    {expanded.has(g.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{g.name}</span>
                      <Badge variant={g.is_required ? 'danger' : 'default'}>{g.is_required ? 'Required' : 'Optional'}</Badge>
                      <Badge variant="info">Select {g.min_select}–{g.max_select}</Badge>
                      <span className="text-xs text-gray-400">{g.options.length} options</span>
                    </div>
                    {item && <p className="text-xs text-gray-400 mt-0.5">For: {item.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditGroup(g)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteGroup(g.id)}><Trash2 size={14} className="text-red-400" /></Button>
                    <Button variant="outline" size="sm" onClick={() => openNewOption(g.id)}><Plus size={14} /> Option</Button>
                  </div>
                </div>

                {expanded.has(g.id) && (
                  <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 space-y-2">
                    {g.options.length === 0 ? (
                      <p className="text-sm text-gray-400 pl-8">No options yet. Add one!</p>
                    ) : g.options.map(opt => (
                      <div key={opt.id} className="flex items-center gap-3 pl-8">
                        <span className="flex-1 text-sm text-gray-700">{opt.name}</span>
                        {opt.additional_price > 0 && <span className="text-sm text-green-600 font-medium">+{formatCurrency(opt.additional_price)}</span>}
                        <Badge variant={opt.is_active ? 'success' : 'default'}>{opt.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => openEditOption(opt)}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteOption(opt.id)}><Trash2 size={13} className="text-red-400" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={groupModal} onClose={() => setGroupModal(false)} title={editingGroup ? 'Edit Option Group' : 'New Option Group'}>
        <div className="space-y-4">
          <Select label="Menu Item *" options={itemOptions} value={groupForm.menu_item_id}
            onChange={e => setGroupForm(f => ({ ...f, menu_item_id: e.target.value }))} />
          <Input label="Group Name *" placeholder="e.g. Protein Choice, Spice Level" value={groupForm.name}
            onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min Selection" type="number" min="0" value={groupForm.min_select}
              onChange={e => setGroupForm(f => ({ ...f, min_select: Number(e.target.value) }))} />
            <Input label="Max Selection" type="number" min="1" value={groupForm.max_select}
              onChange={e => setGroupForm(f => ({ ...f, max_select: Number(e.target.value) }))} />
          </div>
          <Input label="Display Order" type="number" value={groupForm.display_order}
            onChange={e => setGroupForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={groupForm.is_required}
              onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))} />
            Required (customer must select)
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setGroupModal(false)}>Cancel</Button>
            <Button onClick={saveGroup} loading={loading}>Save Group</Button>
          </div>
        </div>
      </Modal>

      <Modal open={optionModal} onClose={() => setOptionModal(false)} title={editingOption ? 'Edit Option' : 'New Option'}>
        <div className="space-y-4">
          <Input label="Option Name *" placeholder="e.g. Chicken, Extra Spicy" value={optionForm.name}
            onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Additional Price ($)" type="number" step="0.01" min="0" value={optionForm.additional_price}
            onChange={e => setOptionForm(f => ({ ...f, additional_price: e.target.value }))} />
          <Input label="Display Order" type="number" value={optionForm.display_order}
            onChange={e => setOptionForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={optionForm.is_active}
              onChange={e => setOptionForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setOptionModal(false)}>Cancel</Button>
            <Button onClick={saveOption} loading={loading}>Save Option</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
