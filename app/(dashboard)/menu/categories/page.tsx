'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/dashboard/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Category, Subcategory } from '@/lib/types'

export default function CategoriesPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [categories, setCategories] = useState<(Category & { subcategories: Subcategory[] })[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', display_order: 0, is_active: true })
  const [subForm, setSubForm] = useState({ name: '', display_order: 0, is_active: true })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_user_id', user.id).single()
    if (!r) return
    setRestaurantId(r.id)

    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', r.id).order('display_order')
    const { data: subs } = await supabase.from('subcategories').select('*').eq('restaurant_id', r.id).order('display_order')

    setCategories((cats ?? []).map(c => ({
      ...c,
      subcategories: (subs ?? []).filter(s => s.category_id === c.id),
    })))
  }

  function openNew() { setEditing(null); setForm({ name: '', description: '', display_order: categories.length, is_active: true }); setModalOpen(true) }
  function openEdit(cat: Category) { setEditing(cat); setForm({ name: cat.name, description: cat.description ?? '', display_order: cat.display_order, is_active: cat.is_active }); setModalOpen(true) }
  function openNewSub(catId: string) { setSelectedCatId(catId); setEditingSub(null); setSubForm({ name: '', display_order: 0, is_active: true }); setSubModalOpen(true) }
  function openEditSub(sub: Subcategory) { setSelectedCatId(sub.category_id); setEditingSub(sub); setSubForm({ name: sub.name, display_order: sub.display_order, is_active: sub.is_active }); setSubModalOpen(true) }

  async function saveCategory() {
    if (!restaurantId || !form.name.trim()) { toast('Name is required', 'error'); return }
    setLoading(true)
    if (editing) {
      await supabase.from('categories').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('categories').insert({ ...form, restaurant_id: restaurantId })
    }
    toast('Saved!', 'success')
    setModalOpen(false)
    loadData()
    setLoading(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category and all its subcategories?')) return
    await supabase.from('subcategories').delete().eq('category_id', id)
    await supabase.from('categories').delete().eq('id', id)
    toast('Deleted', 'success')
    loadData()
  }

  async function saveSubcategory() {
    if (!restaurantId || !selectedCatId || !subForm.name.trim()) { toast('Name is required', 'error'); return }
    setLoading(true)
    if (editingSub) {
      await supabase.from('subcategories').update({ ...subForm, updated_at: new Date().toISOString() }).eq('id', editingSub.id)
    } else {
      await supabase.from('subcategories').insert({ ...subForm, restaurant_id: restaurantId, category_id: selectedCatId })
    }
    toast('Saved!', 'success')
    setSubModalOpen(false)
    loadData()
    setLoading(false)
  }

  async function deleteSub(id: string) {
    if (!confirm('Delete this subcategory?')) return
    await supabase.from('subcategories').delete().eq('id', id)
    toast('Deleted', 'success')
    loadData()
  }

  return (
    <>
      <Header title="Categories" subtitle="Organize your menu structure" actions={
        <Button onClick={openNew} size="md"><Plus size={16} /> Add Category</Button>
      } />

      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📂</div>
          <p className="text-lg font-medium text-gray-600 mb-2">No categories yet</p>
          <p className="text-sm mb-6">Create your first category to start organizing your menu</p>
          <Button onClick={openNew}><Plus size={16} /> Create First Category</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => setExpanded(e => { const n = new Set(e); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n })}
                  className="text-gray-400 hover:text-gray-600">
                  {expanded.has(cat.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{cat.name}</span>
                    <Badge variant={cat.is_active ? 'success' : 'default'}>{cat.is_active ? 'Active' : 'Inactive'}</Badge>
                    <span className="text-xs text-gray-400">{cat.subcategories.length} subcategory</span>
                  </div>
                  {cat.description && <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteCategory(cat.id)}><Trash2 size={14} className="text-red-400" /></Button>
                  <Button variant="outline" size="sm" onClick={() => openNewSub(cat.id)}><Plus size={14} /> Sub</Button>
                </div>
              </div>

              {expanded.has(cat.id) && cat.subcategories.length > 0 && (
                <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 space-y-2">
                  {cat.subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3 pl-8 py-2">
                      <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
                      <Badge variant={sub.is_active ? 'success' : 'default'}>{sub.is_active ? 'Active' : 'Inactive'}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => openEditSub(sub)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteSub(sub.id)}><Trash2 size={13} className="text-red-400" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Display Order" type="number" value={form.display_order}
            onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCategory} loading={loading}>Save Category</Button>
          </div>
        </div>
      </Modal>

      <Modal open={subModalOpen} onClose={() => setSubModalOpen(false)} title={editingSub ? 'Edit Subcategory' : 'New Subcategory'}>
        <div className="space-y-4">
          <Input label="Name *" value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Display Order" type="number" value={subForm.display_order}
            onChange={e => setSubForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subForm.is_active}
            onChange={e => setSubForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setSubModalOpen(false)}>Cancel</Button>
            <Button onClick={saveSubcategory} loading={loading}>Save Subcategory</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
