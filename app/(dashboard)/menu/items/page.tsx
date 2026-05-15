'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/dashboard/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import type { Category, MenuItem, Subcategory, Tag } from '@/lib/types'
import Image from 'next/image'

export default function MenuItemsPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '', subcategory_id: '',
    image_url: '', is_available: true, display_order: 0,
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_user_id', user.id).single()
    if (!r) return
    setRestaurantId(r.id)

    const [{ data: its }, { data: cats }, { data: subs }, { data: tgs }, { data: itemTags }] = await Promise.all([
      supabase.from('menu_items').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('categories').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('subcategories').select('*').eq('restaurant_id', r.id),
      supabase.from('tags').select('*').eq('restaurant_id', r.id),
      supabase.from('menu_item_tags').select('*').eq('restaurant_id', r.id),
    ])

    setCategories(cats ?? [])
    setSubcategories(subs ?? [])
    setTags(tgs ?? [])
    setItems((its ?? []).map(item => ({
      ...item,
      tags: (itemTags ?? [])
        .filter(t => t.menu_item_id === item.id)
        .map(t => tgs?.find(tg => tg.id === t.tag_id))
        .filter(Boolean) as Tag[],
    })))
  }

  function openNew() {
    setEditing(null)
    setSelectedTags([])
    setImageFile(null)
    setForm({ name: '', description: '', price: '', category_id: '', subcategory_id: '', image_url: '', is_available: true, display_order: items.length })
    setModalOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setSelectedTags((item.tags ?? []).map(t => t.id))
    setImageFile(null)
    setForm({
      name: item.name, description: item.description ?? '', price: String(item.price),
      category_id: item.category_id ?? '', subcategory_id: item.subcategory_id ?? '',
      image_url: item.image_url ?? '', is_available: item.is_available, display_order: item.display_order,
    })
    setModalOpen(true)
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !restaurantId) return null
    const ext = imageFile.name.split('.').pop()
    const path = `${restaurantId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, imageFile, { upsert: true })
    if (error) { toast('Image upload failed: ' + error.message, 'error'); return null }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveItem() {
    if (!restaurantId || !form.name.trim()) { toast('Name is required', 'error'); return }
    if (!form.price || isNaN(Number(form.price))) { toast('Valid price required', 'error'); return }
    setLoading(true)

    let imageUrl = form.image_url
    if (imageFile) {
      const uploaded = await uploadImage()
      if (uploaded) imageUrl = uploaded
    }

    const payload = {
      name: form.name, description: form.description || null,
      price: Number(form.price), category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null, image_url: imageUrl || null,
      is_available: form.is_available, display_order: form.display_order,
      restaurant_id: restaurantId,
    }

    let itemId = editing?.id
    if (editing) {
      await supabase.from('menu_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      const { data } = await supabase.from('menu_items').insert(payload).select().single()
      itemId = data?.id
    }

    // Sync tags
    if (itemId) {
      await supabase.from('menu_item_tags').delete().eq('menu_item_id', itemId)
      if (selectedTags.length) {
        await supabase.from('menu_item_tags').insert(
          selectedTags.map(tag_id => ({ menu_item_id: itemId!, tag_id, restaurant_id: restaurantId }))
        )
      }
    }

    toast('Menu item saved!', 'success')
    setModalOpen(false)
    loadData()
    setLoading(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this menu item?')) return
    await supabase.from('menu_item_tags').delete().eq('menu_item_id', id)
    await supabase.from('option_groups').delete().eq('menu_item_id', id)
    await supabase.from('menu_items').delete().eq('id', id)
    toast('Deleted', 'success')
    loadData()
  }

  const filteredSubs = subcategories.filter(s => s.category_id === form.category_id)

  const categoryOptions = [{ value: '', label: '-- No Category --' }, ...categories.map(c => ({ value: c.id, label: c.name }))]
  const subOptions = [{ value: '', label: '-- No Subcategory --' }, ...filteredSubs.map(s => ({ value: s.id, label: s.name }))]

  return (
    <>
      <Header title="Menu Items" subtitle="Manage all your restaurant's menu items" actions={
        <Button onClick={openNew}><Plus size={16} /> Add Item</Button>
      } />

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="text-lg font-medium text-gray-600 mb-2">No menu items yet</p>
          <Button onClick={openNew} className="mt-2"><Plus size={16} /> Add First Item</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
              <div className="relative h-44 bg-gray-100">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <ImageIcon size={36} />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(item)} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50">
                    <Pencil size={14} className="text-gray-600" />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                  <span className="font-bold text-orange-500 text-sm shrink-0">{formatCurrency(item.price)}</span>
                </div>
                {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>}
                <div className="flex flex-wrap gap-1">
                  <Badge variant={item.is_available ? 'success' : 'danger'} className="text-xs">
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                  {(item.tags ?? []).map(t => (
                    <Badge key={t.id} className="text-xs" style={{ backgroundColor: t.color + '20', color: t.color }}>
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Menu Item' : 'New Menu Item'} size="lg">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Item Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <Input label="Price ($) *" type="number" step="0.01" min="0" value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <Input label="Display Order" type="number" min="0" value={form.display_order}
            onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
          <Select label="Category" options={categoryOptions} value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value, subcategory_id: '' }))} />
          <Select label="Subcategory" options={subOptions} value={form.subcategory_id}
            onChange={e => setForm(f => ({ ...f, subcategory_id: e.target.value }))} />

          {/* Image Upload */}
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Item Image</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 file:transition" />
            {form.image_url && !imageFile && (
              <p className="text-xs text-gray-400 mt-1">Current: <a href={form.image_url} target="_blank" className="text-orange-500 underline">view image</a></p>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button key={tag.id} type="button"
                    onClick={() => setSelectedTags(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedTags.includes(tag.id) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
                    style={selectedTags.includes(tag.id) ? {} : { borderColor: tag.color + '60', color: tag.color }}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_available}
                onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
              Available for ordering
            </label>
          </div>

          <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveItem} loading={loading}>Save Item</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
