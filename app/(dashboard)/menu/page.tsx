'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  ImageIcon, X, Tag, ToggleLeft, ToggleRight,
  UtensilsCrossed, SlidersHorizontal, Check,
  Download, Upload, FileDown, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, rectSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCurrency } from '@/lib/utils/helpers'
import type { Category, Subcategory, MenuItem, Tag as TagType, OptionGroup, Option } from '@/lib/types'

type CatWithSubs = Category & { subcategories: Subcategory[] }
type ItemWithTags = MenuItem & { tags: TagType[] }
type GroupWithOptions = OptionGroup & { options: Option[] }

const PRESET_COLORS = ['#f97316','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6','#f59e0b','#6366f1','#64748b']
const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white'
const BTN_PRIMARY = 'flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50'
const BTN_GHOST = 'text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="shrink-0">
      {checked ? <ToggleRight size={22} className="text-brand-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function SmallModal({ title, onClose, children, size = 'sm' }: { title: string; onClose: () => void; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const maxW = size === 'lg' ? 'max-w-xl' : size === 'md' ? 'max-w-md' : 'max-w-sm'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${maxW} p-5 z-10 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

/* ── Shared availability section (used by both item drawer and cat/sub modal) ── */
function AvailabilitySection({
  orderTypes, onOrderTypes,
  happyEnabled, onHappyEnabled,
  happyStart, onHappyStart,
  happyEnd, onHappyEnd,
  happyDays, onHappyDays,
}: {
  orderTypes: string[]
  onOrderTypes: (v: string[]) => void
  happyEnabled: boolean
  onHappyEnabled: (v: boolean) => void
  happyStart: string
  onHappyStart: (v: string) => void
  happyEnd: string
  onHappyEnd: (v: string) => void
  happyDays: number[]
  onHappyDays: (v: number[]) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">Order Type Restrictions</p>
          <p className="text-[11px] text-gray-400">Leave all unchecked to allow any order type</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { value: 'pickup', emoji: '🏃', label: 'Pickup' },
            { value: 'dine_in', emoji: '🍽️', label: 'Dine In' },
            { value: 'delivery', emoji: '🚗', label: 'Delivery' },
          ] as const).map(({ value, emoji, label }) => {
            const sel = orderTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => onOrderTypes(sel ? orderTypes.filter(x => x !== value) : [...orderTypes, value])}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${
                  sel ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span>{emoji}</span> {label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">Happy Hour</p>
            <p className="text-xs text-gray-400">Only show during specific hours</p>
          </div>
          <Toggle checked={happyEnabled} onChange={onHappyEnabled} />
        </div>
        {happyEnabled && (
          <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Active Days</p>
              <div className="flex gap-1.5 flex-wrap">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                  const sel = happyDays.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onHappyDays(sel ? happyDays.filter(d => d !== i) : [...happyDays, i])}
                      className={`w-10 py-1 rounded-lg text-xs font-bold transition ${
                        sel ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">Start Time</p>
                <input type="time" className={INPUT} value={happyStart} onChange={e => onHappyStart(e.target.value)} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">End Time</p>
                <input type="time" className={INPUT} value={happyEnd} onChange={e => onHappyEnd(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Sortable row/card components (module-level so hooks are stable) ── */

function SortableCatRow({
  cat, filterKey, setFilterKey, expandedCats, onToggleExpand,
  items, openCatModal, deleteCat, onSubDragEnd,
}: {
  cat: CatWithSubs
  filterKey: string
  setFilterKey: (k: string) => void
  expandedCats: Set<string>
  onToggleExpand: (id: string) => void
  items: ItemWithTags[]
  openCatModal: (type: 'cat' | 'sub', editing?: Category | Subcategory, parentId?: string) => void
  deleteCat: (id: string, type: 'cat' | 'sub') => void
  onSubDragEnd: (catId: string, event: DragEndEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
  const subSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`mb-0.5 ${isDragging ? 'opacity-40' : ''}`}>
      <div className={`flex items-center gap-1 px-2 py-1.5 rounded-xl group cursor-pointer transition ${filterKey === cat.id ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
        <span {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 shrink-0 cursor-grab active:cursor-grabbing touch-none">
          <GripVertical size={11} />
        </span>
        <button onClick={() => onToggleExpand(cat.id)} className="text-gray-300 hover:text-gray-500 shrink-0 w-4">
          {cat.subcategories.length > 0 ? (expandedCats.has(cat.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
        </button>
        <button onClick={() => setFilterKey(cat.id)} className={`flex-1 text-left text-sm truncate font-medium ${filterKey === cat.id ? 'text-brand-600' : 'text-gray-700'}`}>
          {cat.name}
        </button>
        {(cat.available_order_types?.length || cat.happy_hour_enabled) && (
          <span title="Has availability restrictions" className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        )}
        <span className="text-[10px] text-gray-400">{items.filter(i => i.category_id === cat.id).length}</span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 transition-opacity">
          <button onClick={() => openCatModal('sub', undefined, cat.id)} className="p-0.5 text-gray-300 hover:text-brand-500" title="Add subcategory"><Plus size={11} /></button>
          <button onClick={() => openCatModal('cat', cat)} className="p-0.5 text-gray-300 hover:text-gray-600" title="Edit"><Pencil size={11} /></button>
          <button onClick={() => deleteCat(cat.id, 'cat')} className="p-0.5 text-gray-300 hover:text-red-500" title="Delete"><Trash2 size={11} /></button>
        </div>
      </div>
      {expandedCats.has(cat.id) && cat.subcategories.length > 0 && (
        <DndContext sensors={subSensors} collisionDetection={closestCenter} onDragEnd={e => onSubDragEnd(cat.id, e)}>
          <SortableContext items={cat.subcategories.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {cat.subcategories.map(sub => (
              <SortableSubRow key={sub.id} sub={sub} filterKey={filterKey} setFilterKey={setFilterKey} openCatModal={openCatModal} deleteCat={deleteCat} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableSubRow({
  sub, filterKey, setFilterKey, openCatModal, deleteCat,
}: {
  sub: Subcategory
  filterKey: string
  setFilterKey: (k: string) => void
  openCatModal: (type: 'cat' | 'sub', editing?: Category | Subcategory, parentId?: string) => void
  deleteCat: (id: string, type: 'cat' | 'sub') => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 pl-6 pr-2 py-1 rounded-xl group cursor-pointer transition ml-1 ${isDragging ? 'opacity-40' : ''} ${filterKey === `sub:${sub.id}` ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
    >
      <span {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical size={10} />
      </span>
      <button onClick={() => setFilterKey(`sub:${sub.id}`)} className={`flex-1 text-left text-xs truncate ${filterKey === `sub:${sub.id}` ? 'text-brand-600 font-semibold' : 'text-gray-500'}`}>
        {sub.name}
      </button>
      {(sub.available_order_types?.length || sub.happy_hour_enabled) && (
        <span title="Has availability restrictions" className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
      )}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
        <button onClick={() => openCatModal('sub', sub)} className="p-0.5 text-gray-300 hover:text-gray-600"><Pencil size={10} /></button>
        <button onClick={() => deleteCat(sub.id, 'sub')} className="p-0.5 text-gray-300 hover:text-red-500"><Trash2 size={10} /></button>
      </div>
    </div>
  )
}

function SortableItemCard({
  item, openEdit, deleteItem, quickToggle,
}: {
  item: ItemWithTags
  openEdit: (item: ItemWithTags) => void
  deleteItem: (id: string) => void
  quickToggle: (item: ItemWithTags) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group flex flex-col"
    >
      <div className="relative h-40 bg-gray-100 shrink-0">
        {item.image_url
          ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
          : <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={28} /></div>
        }
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button {...attributes} {...listeners} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50 cursor-grab active:cursor-grabbing touch-none">
            <GripVertical size={12} className="text-gray-400" />
          </button>
          <button onClick={() => openEdit(item)} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center hover:bg-brand-50 transition">
            <Pencil size={12} className="text-gray-600" />
          </button>
          <button onClick={() => deleteItem(item.id)} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center hover:bg-red-50 transition">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</h3>
          <span className="font-bold text-brand-500 text-sm shrink-0">{formatCurrency(item.price)}</span>
        </div>
        {item.description && <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(t => (
              <span key={t.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '20', color: t.color }}>{t.name}</span>
            ))}
          </div>
        )}
        {(item.available_order_types?.length || item.happy_hour_enabled) && (
          <div className="flex flex-wrap gap-1">
            {!!item.available_order_types?.length && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                {item.available_order_types.map(t => t === 'dine_in' ? 'Dine-in' : t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')} only
              </span>
            )}
            {item.happy_hour_enabled && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                Happy Hour
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className={`text-xs font-medium ${item.is_available ? 'text-green-600' : 'text-gray-400'}`}>
            {item.is_available ? 'Available' : 'Unavailable'}
          </span>
          <Toggle checked={item.is_available} onChange={() => quickToggle(item)} />
        </div>
      </div>
    </div>
  )
}

function SortableMobileItemRow({
  item, openEdit, quickToggle,
}: {
  item: ItemWithTags
  openEdit: (item: ItemWithTags) => void
  quickToggle: (item: ItemWithTags) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 transition-colors"
    >
      <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative">
        {item.image_url
          ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
          : <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={18} /></div>
        }
      </div>
      <button onClick={() => openEdit(item)} className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-semibold truncate leading-tight ${!item.is_available ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-sm font-bold text-brand-500">{formatCurrency(item.price)}</span>
          {item.tags.slice(0, 2).map(t => (
            <span key={t.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + '20', color: t.color }}>{t.name}</span>
          ))}
        </div>
        {(item.available_order_types?.length || item.happy_hour_enabled) && (
          <p className="text-[10px] text-amber-600 mt-0.5 font-medium">Has availability restrictions</p>
        )}
      </button>
      <Toggle checked={item.is_available} onChange={() => quickToggle(item)} />
      <span
        {...attributes}
        {...listeners}
        className="text-gray-300 shrink-0 p-1 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={18} />
      </span>
    </div>
  )
}

export default function MenuBuilderPage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CatWithSubs[]>([])
  const [items, setItems] = useState<ItemWithTags[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [filterKey, setFilterKey] = useState<string>('all')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  // Ordering
  const [dirtyOrder, setDirtyOrder] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Mobile category management sheet
  const [mobileCatSheetOpen, setMobileCatSheetOpen] = useState(false)

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'details' | 'options'>('details')
  const [editingItem, setEditingItem] = useState<ItemWithTags | null>(null)
  const [optionGroups, setOptionGroups] = useState<GroupWithOptions[]>([])
  const [savingItem, setSavingItem] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', category_id: '', subcategory_id: '', image_url: '', is_available: true,
    available_order_types: [] as string[],
    happy_hour_enabled: false,
    happy_hour_start: '16:00',
    happy_hour_end: '18:00',
    happy_hour_days: [] as number[],
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Category modal
  const [catModal, setCatModal] = useState<{ type: 'cat' | 'sub'; editing?: Category | Subcategory; parentId?: string } | null>(null)
  const [catForm, setCatForm] = useState({
    name: '', description: '', is_active: true,
    available_order_types: [] as string[],
    happy_hour_enabled: false,
    happy_hour_start: '16:00',
    happy_hour_end: '18:00',
    happy_hour_days: [] as number[],
  })
  const [savingCat, setSavingCat] = useState(false)

  // Tag modal
  const [tagModal, setTagModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#f97316')
  const [savingTag, setSavingTag] = useState(false)

  // CSV import/export
  type ImportPreviewRow = {
    _id: string; name: string; description: string; price: string
    category: string; subcategory: string; is_available: boolean; tags: string
  }
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[] | null>(null)
  const [confirmingImport, setConfirmingImport] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  // Option group modal
  type OptionRow = { name: string; additional_price: string; is_active: boolean }
  const [groupModal, setGroupModal] = useState<{ editing?: GroupWithOptions } | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', is_required: false, min_select: 0, max_select: 1 })
  const [groupOptionRows, setGroupOptionRows] = useState<OptionRow[]>([{ name: '', additional_price: '0', is_active: true }])
  const [savingGroup, setSavingGroup] = useState(false)

  // Option modal
  const [optionModal, setOptionModal] = useState<{ groupId: string; editing?: Option } | null>(null)
  const [optionForm, setOptionForm] = useState({ name: '', additional_price: '0', is_active: true })
  const [savingOption, setSavingOption] = useState(false)

  /* ── data loading ── */
  const loadAll = useCallback(async () => {
    const res = await fetch('/api/restaurant/current')
    if (!res.ok) return
    const r = await res.json()
    if (!r?.id) return
    setRestaurantId(r.id)

    const [{ data: cats }, { data: subs }, { data: its }, { data: tgs }, { data: itemTags }] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('subcategories').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', r.id).order('display_order'),
      supabase.from('tags').select('*').eq('restaurant_id', r.id).order('name'),
      supabase.from('menu_item_tags').select('*').eq('restaurant_id', r.id),
    ])

    setTags(tgs ?? [])
    setCategories((cats ?? []).map(c => ({ ...c, subcategories: (subs ?? []).filter(s => s.category_id === c.id) })))
    setItems((its ?? []).map(item => ({
      ...item,
      tags: (itemTags ?? []).filter(t => t.menu_item_id === item.id)
        .map(t => (tgs ?? []).find(tg => tg.id === t.tag_id)).filter(Boolean) as TagType[],
    })))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptionGroups = useCallback(async (itemId: string, rid: string) => {
    const [{ data: grps }, { data: opts }] = await Promise.all([
      supabase.from('option_groups').select('*').eq('menu_item_id', itemId).order('display_order'),
      supabase.from('options').select('*').eq('restaurant_id', rid).order('display_order'),
    ])
    setOptionGroups((grps ?? []).map(g => ({ ...g, options: (opts ?? []).filter(o => o.option_group_id === g.id) })))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll() }, [loadAll])

  /* ── derived ── */
  const filteredItems = filterKey === 'all' ? items
    : filterKey.startsWith('sub:') ? items.filter(i => i.subcategory_id === filterKey.slice(4))
    : items.filter(i => i.category_id === filterKey)

  const filterLabel = filterKey === 'all' ? 'All Items'
    : filterKey.startsWith('sub:')
      ? categories.flatMap(c => c.subcategories).find(s => s.id === filterKey.slice(4))?.name ?? 'Subcategory'
      : categories.find(c => c.id === filterKey)?.name ?? 'Category'

  const filteredSubs = categories.find(c => c.id === itemForm.category_id)?.subcategories ?? []

  /* ── drawer ── */
  function openNew() {
    setEditingItem(null); setImageFile(null); setImagePreview(''); setSelectedTagIds([])
    setOptionGroups([]); setDrawerTab('details'); setExpandedGroups(new Set())
    const preCat = filterKey === 'all' || filterKey.startsWith('sub:') ? '' : filterKey
    setItemForm({ name: '', description: '', price: '', category_id: preCat, subcategory_id: '', image_url: '', is_available: true, available_order_types: [], happy_hour_enabled: false, happy_hour_start: '16:00', happy_hour_end: '18:00', happy_hour_days: [] })
    setDrawerOpen(true)
  }

  function openEdit(item: ItemWithTags) {
    setEditingItem(item); setImageFile(null); setImagePreview(''); setSelectedTagIds((item.tags ?? []).map(t => t.id))
    setDrawerTab('details'); setExpandedGroups(new Set())
    setItemForm({
      name: item.name, description: item.description ?? '', price: String(item.price),
      category_id: item.category_id ?? '', subcategory_id: item.subcategory_id ?? '',
      image_url: item.image_url ?? '', is_available: item.is_available,
      available_order_types: (item.available_order_types ?? []) as string[],
      happy_hour_enabled: item.happy_hour_enabled ?? false,
      happy_hour_start: item.happy_hour_start?.slice(0, 5) ?? '16:00',
      happy_hour_end: item.happy_hour_end?.slice(0, 5) ?? '18:00',
      happy_hour_days: (item.happy_hour_days ?? []) as number[],
    })
    setOptionGroups([])
    setDrawerOpen(true)
    if (restaurantId) loadOptionGroups(item.id, restaurantId)
  }

  function closeDrawer() { setDrawerOpen(false); setEditingItem(null) }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !restaurantId) return null
    const ext = imageFile.name.split('.').pop()
    const path = `${restaurantId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, imageFile, { upsert: true })
    if (error) { toast('Image upload failed', 'error'); return null }
    return supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl
  }

  async function saveItem() {
    if (!restaurantId || !itemForm.name.trim()) { toast('Name is required', 'error'); return }
    if (!itemForm.price || isNaN(Number(itemForm.price))) { toast('Valid price required', 'error'); return }
    setSavingItem(true)
    let imageUrl = itemForm.image_url
    if (imageFile) { const u = await uploadImage(); if (u) imageUrl = u }

    const payload = {
      name: itemForm.name, description: itemForm.description || null, price: Number(itemForm.price),
      category_id: itemForm.category_id || null, subcategory_id: itemForm.subcategory_id || null,
      image_url: imageUrl || null, is_available: itemForm.is_available, restaurant_id: restaurantId,
      available_order_types: itemForm.available_order_types.length ? itemForm.available_order_types : null,
      happy_hour_enabled: itemForm.happy_hour_enabled,
      happy_hour_start: itemForm.happy_hour_enabled && itemForm.happy_hour_start ? itemForm.happy_hour_start : null,
      happy_hour_end: itemForm.happy_hour_enabled && itemForm.happy_hour_end ? itemForm.happy_hour_end : null,
      happy_hour_days: itemForm.happy_hour_enabled && itemForm.happy_hour_days.length ? itemForm.happy_hour_days : null,
    }

    let itemId = editingItem?.id
    if (editingItem) {
      await supabase.from('menu_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingItem.id)
    } else {
      const { data } = await supabase.from('menu_items').insert({ ...payload, display_order: items.length }).select().single()
      itemId = data?.id
    }

    if (itemId) {
      await supabase.from('menu_item_tags').delete().eq('menu_item_id', itemId)
      if (selectedTagIds.length) {
        await supabase.from('menu_item_tags').insert(selectedTagIds.map(tag_id => ({ menu_item_id: itemId!, tag_id, restaurant_id: restaurantId })))
      }
    }

    toast('Saved!', 'success')
    setSavingItem(false)
    loadAll()

    if (!editingItem && itemId) {
      // After creating, switch to options tab
      const saved = { ...payload, id: itemId, display_order: items.length, created_at: '', updated_at: '', tags: [] } as unknown as ItemWithTags
      setEditingItem(saved)
      setDrawerTab('options')
      loadOptionGroups(itemId, restaurantId)
    }
  }

  async function quickToggle(item: ItemWithTags) {
    await supabase.from('menu_items').update({ is_available: !item.is_available, updated_at: new Date().toISOString() }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item and all its options?')) return
    await supabase.from('menu_item_tags').delete().eq('menu_item_id', id)
    await supabase.from('option_groups').delete().eq('menu_item_id', id)
    await supabase.from('menu_items').delete().eq('id', id)
    toast('Deleted', 'success')
    if (editingItem?.id === id) closeDrawer()
    loadAll()
  }

  /* ── category CRUD ── */
  function openCatModal(type: 'cat' | 'sub', editing?: Category | Subcategory, parentId?: string) {
    setCatModal({ type, editing, parentId })
    setCatForm({
      name: editing?.name ?? '',
      description: (editing && 'description' in editing ? (editing as Category).description : '') ?? '',
      is_active: editing?.is_active ?? true,
      available_order_types: (editing?.available_order_types ?? []) as string[],
      happy_hour_enabled: editing?.happy_hour_enabled ?? false,
      happy_hour_start: editing?.happy_hour_start?.slice(0, 5) ?? '16:00',
      happy_hour_end: editing?.happy_hour_end?.slice(0, 5) ?? '18:00',
      happy_hour_days: (editing?.happy_hour_days ?? []) as number[],
    })
  }

  async function saveCat() {
    if (!restaurantId || !catForm.name.trim()) { toast('Name is required', 'error'); return }
    setSavingCat(true)
    const availPayload = {
      available_order_types: catForm.available_order_types.length ? catForm.available_order_types : null,
      happy_hour_enabled: catForm.happy_hour_enabled,
      happy_hour_start: catForm.happy_hour_enabled && catForm.happy_hour_start ? catForm.happy_hour_start : null,
      happy_hour_end: catForm.happy_hour_enabled && catForm.happy_hour_end ? catForm.happy_hour_end : null,
      happy_hour_days: catForm.happy_hour_enabled && catForm.happy_hour_days.length ? catForm.happy_hour_days : null,
    }
    if (catModal?.type === 'cat') {
      const p = { name: catForm.name, description: catForm.description || null, is_active: catForm.is_active, restaurant_id: restaurantId, ...availPayload }
      if (catModal.editing) await supabase.from('categories').update({ ...p, updated_at: new Date().toISOString() }).eq('id', catModal.editing.id)
      else await supabase.from('categories').insert({ ...p, display_order: categories.length })
    } else {
      const p = { name: catForm.name, is_active: catForm.is_active, restaurant_id: restaurantId, category_id: catModal?.editing ? (catModal.editing as Subcategory).category_id : catModal?.parentId!, ...availPayload }
      if (catModal?.editing) await supabase.from('subcategories').update({ ...p, updated_at: new Date().toISOString() }).eq('id', catModal.editing.id)
      else await supabase.from('subcategories').insert({ ...p, display_order: 0 })
    }
    toast('Saved!', 'success'); setSavingCat(false); setCatModal(null); loadAll()
  }

  async function deleteCat(id: string, type: 'cat' | 'sub') {
    if (!confirm(type === 'cat' ? 'Delete category and all its subcategories?' : 'Delete subcategory?')) return
    if (type === 'cat') { await supabase.from('subcategories').delete().eq('category_id', id); await supabase.from('categories').delete().eq('id', id); if (filterKey === id) setFilterKey('all') }
    else { await supabase.from('subcategories').delete().eq('id', id); if (filterKey === `sub:${id}`) setFilterKey('all') }
    toast('Deleted', 'success'); loadAll()
  }

  /* ── tag CRUD ── */
  async function saveTag() {
    if (!restaurantId || !newTagName.trim()) return
    setSavingTag(true)
    await supabase.from('tags').insert({ name: newTagName.trim(), color: newTagColor, restaurant_id: restaurantId })
    setNewTagName(''); setSavingTag(false); toast('Tag created', 'success'); loadAll()
  }

  async function deleteTag(id: string) {
    await supabase.from('menu_item_tags').delete().eq('tag_id', id)
    await supabase.from('tags').delete().eq('id', id)
    toast('Deleted', 'success'); loadAll()
  }

  /* ── option group CRUD ── */
  async function saveGroup() {
    if (!restaurantId || !editingItem?.id || !groupForm.name.trim()) { toast('Name required', 'error'); return }
    setSavingGroup(true)
    const p = { ...groupForm, menu_item_id: editingItem.id, restaurant_id: restaurantId }
    if (groupModal?.editing) {
      await supabase.from('option_groups').update({ ...p, updated_at: new Date().toISOString() }).eq('id', groupModal.editing.id)
    } else {
      const { data } = await supabase.from('option_groups').insert({ ...p, display_order: optionGroups.length }).select().single()
      const groupId = data?.id
      const validRows = groupOptionRows.filter(r => r.name.trim())
      if (groupId && validRows.length) {
        await supabase.from('options').insert(
          validRows.map((r, i) => ({
            name: r.name.trim(),
            additional_price: Number(r.additional_price) || 0,
            is_active: r.is_active,
            option_group_id: groupId,
            restaurant_id: restaurantId,
            display_order: i,
          }))
        )
      }
    }
    toast('Saved!', 'success'); setSavingGroup(false); setGroupModal(null); loadOptionGroups(editingItem.id, restaurantId!)
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete this option group and all its options?')) return
    await supabase.from('options').delete().eq('option_group_id', id)
    await supabase.from('option_groups').delete().eq('id', id)
    toast('Deleted', 'success'); if (editingItem && restaurantId) loadOptionGroups(editingItem.id, restaurantId)
  }

  /* ── option CRUD ── */
  async function saveOption() {
    if (!restaurantId || !optionModal?.groupId || !optionForm.name.trim()) { toast('Name required', 'error'); return }
    setSavingOption(true)
    const p = { name: optionForm.name, additional_price: Number(optionForm.additional_price), is_active: optionForm.is_active, option_group_id: optionModal.groupId, restaurant_id: restaurantId }
    if (optionModal.editing) await supabase.from('options').update({ ...p, updated_at: new Date().toISOString() }).eq('id', optionModal.editing.id)
    else await supabase.from('options').insert({ ...p, display_order: 0 })
    toast('Saved!', 'success'); setSavingOption(false); setOptionModal(null); if (editingItem && restaurantId) loadOptionGroups(editingItem.id, restaurantId)
  }

  async function deleteOption(id: string) {
    await supabase.from('options').delete().eq('id', id)
    if (editingItem && restaurantId) loadOptionGroups(editingItem.id, restaurantId)
  }

  async function toggleOptionActive(opt: Option) {
    await supabase.from('options').update({ is_active: !opt.is_active, updated_at: new Date().toISOString() }).eq('id', opt.id)
    if (editingItem && restaurantId) loadOptionGroups(editingItem.id, restaurantId)
  }

  /* ── ordering ── */
  function handleCatDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setCategories(prev => {
      const oldIdx = prev.findIndex(c => c.id === active.id)
      const newIdx = prev.findIndex(c => c.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
    setDirtyOrder(true)
  }

  function handleSubDragEnd(catId: string, { active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setCategories(prev => prev.map(c => {
      if (c.id !== catId) return c
      const oldIdx = c.subcategories.findIndex(s => s.id === active.id)
      const newIdx = c.subcategories.findIndex(s => s.id === over.id)
      return { ...c, subcategories: arrayMove(c.subcategories, oldIdx, newIdx) }
    }))
    setDirtyOrder(true)
  }

  function handleItemDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
    setDirtyOrder(true)
  }

  async function saveOrder() {
    if (!restaurantId) return
    setSavingOrder(true)
    try {
      await Promise.all([
        ...categories.map((cat, i) =>
          supabase.from('categories').update({ display_order: i }).eq('id', cat.id)
        ),
        ...categories.flatMap(cat =>
          cat.subcategories.map((sub, i) =>
            supabase.from('subcategories').update({ display_order: i }).eq('id', sub.id)
          )
        ),
        ...items.map((item, i) =>
          supabase.from('menu_items').update({ display_order: i }).eq('id', item.id)
        ),
      ])
      setDirtyOrder(false)
      toast('Order saved!', 'success')
    } catch {
      toast('Failed to save order', 'error')
    }
    setSavingOrder(false)
  }

  /* ── CSV helpers ── */
  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current); current = ''
      } else current += char
    }
    result.push(current)
    return result
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadTemplate() {
    const headers = ['name', 'description', 'price', 'category', 'subcategory', 'is_available', 'tags']
    const examples = [
      ['Spicy Tuna Roll', 'Fresh tuna with spicy mayo and cucumber', '14.99', 'Rolls', '', 'true', 'Popular|Spicy'],
      ['California Roll', 'Crab, avocado and cucumber', '12.99', 'Rolls', 'Specialty', 'true', 'Bestseller'],
      ['Edamame', 'Steamed salted soybeans', '5.99', 'Appetizers', '', 'true', 'Vegetarian'],
      ['Miso Soup', 'Traditional Japanese miso soup', '3.99', 'Soups', '', 'true', ''],
      ['Chocolate Lava Cake', 'Warm cake with molten center', '7.99', 'Desserts', '', 'false', 'Chef Special'],
    ]
    const csv = [headers, ...examples]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadCSV(csv, 'menu_template.csv')
  }

  function exportMenu() {
    if (items.length === 0) { toast('No items to export', 'error'); return }
    const headers = ['name', 'description', 'price', 'category', 'subcategory', 'is_available', 'tags']
    const rows = items.map(item => {
      const catName = categories.find(c => c.id === item.category_id)?.name ?? ''
      const subName = categories.flatMap(c => c.subcategories).find(s => s.id === item.subcategory_id)?.name ?? ''
      const tagNames = item.tags.map(t => t.name).join('|')
      return [item.name, item.description ?? '', String(item.price), catName, subName, String(item.is_available), tagNames]
    })
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadCSV(csv, `menu_${new Date().toISOString().slice(0, 10)}.csv`)
    toast(`Exported ${items.length} items`, 'success')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !restaurantId) return
    setImporting(true)

    try {
      const raw = await file.text()
      const text = raw.replace(/^﻿/, '') // strip Excel BOM
      const lines = text.trim().split(/\r?\n/)
      if (lines.length < 2) { toast('CSV has no data rows', 'error'); return }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
      const col = (n: string) => headers.indexOf(n)
      const nameCol = col('name'), priceCol = col('price'), descCol = col('description')
      const catCol = col('category'), subCol = col('subcategory'), availCol = col('is_available'), tagsCol = col('tags')

      if (nameCol === -1 || priceCol === -1) {
        toast('CSV must have "name" and "price" columns', 'error'); return
      }

      const rows: ImportPreviewRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const row = parseCSVLine(line)
        const get = (idx: number) => (idx >= 0 ? (row[idx] ?? '').trim() : '')
        rows.push({
          _id: `${Date.now()}-${i}`,
          name: get(nameCol),
          description: get(descCol),
          price: get(priceCol),
          category: get(catCol),
          subcategory: get(subCol),
          is_available: get(availCol).toLowerCase() !== 'false',
          tags: get(tagsCol),
        })
      }

      if (rows.length === 0) { toast('No data rows found in CSV', 'error'); return }
      setImportPreview(rows)
    } catch (err) {
      toast(`Failed to read CSV: ${err instanceof Error ? err.message : 'unknown error'}`, 'error')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  function isValidRow(row: ImportPreviewRow): boolean {
    const p = parseFloat(row.price)
    return !!row.name.trim() && !isNaN(p) && p >= 0
  }

  function updatePreviewRow(id: string, field: keyof ImportPreviewRow, value: string | boolean) {
    setImportPreview(prev => prev ? prev.map(r => r._id === id ? { ...r, [field]: value } : r) : prev)
  }

  function deletePreviewRow(id: string) {
    setImportPreview(prev => {
      if (!prev) return prev
      const next = prev.filter(r => r._id !== id)
      return next.length === 0 ? null : next
    })
  }

  async function confirmImport() {
    if (!importPreview || !restaurantId) return
    const validRows = importPreview.filter(isValidRow)
    if (validRows.length === 0) { toast('No valid rows to import', 'error'); return }

    setConfirmingImport(true)
    setImportProgress(0)

    const catMap = new Map<string, string>()
    const subMap = new Map<string, string>()
    const tagMap = new Map<string, string>()
    for (const cat of categories) {
      catMap.set(cat.name.toLowerCase(), cat.id)
      for (const sub of cat.subcategories) subMap.set(`${cat.id}::${sub.name.toLowerCase()}`, sub.id)
    }
    for (const tag of tags) tagMap.set(tag.name.toLowerCase(), tag.id)

    let created = 0, skipped = 0
    const total = validRows.length

    for (let i = 0; i < total; i++) {
      const row = validRows[i]
      const price = parseFloat(row.price)

      let categoryId: string | null = null
      const catName = row.category.trim()
      if (catName) {
        const key = catName.toLowerCase()
        if (catMap.has(key)) {
          categoryId = catMap.get(key)!
        } else {
          const { data } = await supabase.from('categories').insert({
            name: catName, restaurant_id: restaurantId, is_active: true, display_order: catMap.size,
          }).select().single()
          if (data) { catMap.set(key, data.id); categoryId = data.id }
        }
      }

      let subcategoryId: string | null = null
      const subName = row.subcategory.trim()
      if (subName && categoryId) {
        const key = `${categoryId}::${subName.toLowerCase()}`
        if (subMap.has(key)) {
          subcategoryId = subMap.get(key)!
        } else {
          const { data } = await supabase.from('subcategories').insert({
            name: subName, category_id: categoryId, restaurant_id: restaurantId, is_active: true, display_order: 0,
          }).select().single()
          if (data) { subMap.set(key, data.id); subcategoryId = data.id }
        }
      }

      const tagIds: string[] = []
      if (row.tags.trim()) {
        for (const raw of row.tags.split('|')) {
          const t = raw.trim()
          if (!t) continue
          const key = t.toLowerCase()
          if (tagMap.has(key)) {
            tagIds.push(tagMap.get(key)!)
          } else {
            const { data } = await supabase.from('tags').insert({
              name: t, color: '#f97316', restaurant_id: restaurantId,
            }).select().single()
            if (data) { tagMap.set(key, data.id); tagIds.push(data.id) }
          }
        }
      }

      const { data: newItem } = await supabase.from('menu_items').insert({
        name: row.name.trim(), description: row.description.trim() || null, price,
        category_id: categoryId, subcategory_id: subcategoryId,
        is_available: row.is_available, restaurant_id: restaurantId, display_order: items.length + created,
      }).select().single()

      if (newItem) {
        if (tagIds.length) {
          await supabase.from('menu_item_tags').insert(
            tagIds.map(tag_id => ({ menu_item_id: newItem.id, tag_id, restaurant_id: restaurantId! }))
          )
        }
        created++
      } else {
        skipped++
      }

      setImportProgress(Math.round(((i + 1) / total) * 100))
    }

    await loadAll()
    toast(
      `Imported ${created} item${created !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped}` : ''}`,
      created > 0 ? 'success' : 'error'
    )
    setConfirmingImport(false)
    setImportProgress(0)
    setImportPreview(null)
  }

  /* ── render ── */
  return (
    <div className="flex flex-col -mx-4 lg:flex-row lg:-mx-8 lg:-my-8 lg:h-screen">

      {/* ── Mobile: horizontal category pill strip ───────────────── */}
      <div className="lg:hidden overflow-x-auto border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ width: 'max-content', minWidth: '100%' }}>
          {/* All pill */}
          <button
            onClick={() => setFilterKey('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap ${filterKey === 'all' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All{items.length > 0 ? ` (${items.length})` : ''}
          </button>

          {categories.flatMap(cat => {
            const count = items.filter(i => i.category_id === cat.id).length
            const catActive = filterKey === cat.id
            return [
              /* ── Category separator + pill ── */
              <div key={cat.id} className="flex items-center gap-1 shrink-0">
                <span className="w-px h-5 bg-gray-200 shrink-0" />
                <button
                  onClick={() => setFilterKey(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap ${catActive ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {cat.name}{count > 0 ? ` (${count})` : ''}
                </button>
              </div>,
              /* ── Subcategory pills — visually nested ── */
              ...cat.subcategories.map(sub => {
                const subActive = filterKey === `sub:${sub.id}`
                return (
                  <button
                    key={`sub:${sub.id}`}
                    onClick={() => setFilterKey(`sub:${sub.id}`)}
                    className={`shrink-0 flex items-center gap-1 pl-2 pr-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap border ${subActive ? 'bg-brand-100 text-brand-700 border-brand-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className={`text-[10px] ${subActive ? 'text-brand-400' : 'text-gray-300'}`}>↳</span>
                    {sub.name}
                  </button>
                )
              }),
            ]
          })}
        </div>
      </div>

      {/* ── Desktop: Left Category Panel ──────────────────────────── */}
      <div className="hidden lg:flex w-56 shrink-0 bg-white border-r border-gray-100 flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Menu Builder</h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <button
            onClick={() => setFilterKey('all')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition mb-1 ${filterKey === 'all' ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <UtensilsCrossed size={14} />
            <span className="flex-1 text-left">All Items</span>
            <span className="text-xs text-gray-400">{items.length}</span>
          </button>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {categories.map(cat => (
                <SortableCatRow
                  key={cat.id}
                  cat={cat}
                  filterKey={filterKey}
                  setFilterKey={setFilterKey}
                  expandedCats={expandedCats}
                  onToggleExpand={id => setExpandedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
                  items={items}
                  openCatModal={openCatModal}
                  deleteCat={deleteCat}
                  onSubDragEnd={handleSubDragEnd}
                />
              ))}
            </SortableContext>
          </DndContext>
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 space-y-1 shrink-0">
          <button onClick={() => openCatModal('cat')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-brand-500 transition border border-dashed border-gray-200 hover:border-brand-300">
            <Plus size={12} /> Add Category
          </button>
          <button onClick={() => setTagModal(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-brand-500 transition">
            <Tag size={12} /> Manage Tags
          </button>
        </div>
      </div>

      {/* ── Right: Item content area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:overflow-hidden bg-gray-50">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-white border-b border-gray-100 shrink-0 gap-3">
          <div>
            <h1 className="text-base lg:text-lg font-bold text-gray-900">{filterLabel}</h1>
            <p className="text-xs lg:text-sm text-gray-400">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Desktop: full toolbar */}
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadTemplate}
              title="Download CSV template"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-brand-500 hover:border-brand-300 transition"
            >
              <FileDown size={14} /> Template
            </button>
            <label
              title="Import items from CSV"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-xl transition cursor-pointer ${
                importing
                  ? 'text-brand-500 border-brand-300 bg-brand-50'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-brand-500 hover:border-brand-300'
              }`}
            >
              <Upload size={14} />
              {importing ? 'Importing…' : 'Import'}
              <input type="file" accept=".csv" className="hidden" disabled={importing} onChange={handleImport} />
            </label>
            <button onClick={exportMenu} disabled={items.length === 0} title="Export menu to CSV" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-brand-500 hover:border-brand-300 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={14} /> Export
            </button>
            <div className="w-px h-6 bg-gray-200" />
            <button onClick={openNew} className={BTN_PRIMARY}><Plus size={14} /> New Item</button>
          </div>
          {/* Mobile: categories sheet + tags */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileCatSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl active:bg-gray-50 transition"
            >
              <UtensilsCrossed size={14} /> Categories
            </button>
            <button onClick={() => setTagModal(true)} className="p-2 text-gray-500 border border-gray-200 rounded-xl active:bg-gray-50 transition">
              <Tag size={16} />
            </button>
          </div>
        </div>

        {/* Save Order banner */}
        {dirtyOrder && (
          <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 bg-amber-50 border-b border-amber-100 shrink-0">
            <div className="flex items-center gap-2 text-amber-700">
              <GripVertical size={14} />
              <span className="text-sm font-medium">
                <span className="hidden lg:inline">Order changed — save to apply on customer portal</span>
                <span className="lg:hidden">Order changed</span>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDirtyOrder(false); loadAll() }}
                disabled={savingOrder}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition disabled:opacity-40"
              >
                Discard
              </button>
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition disabled:opacity-50"
              >
                {savingOrder ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </div>
        )}

        {/* Item content */}
        <div className="flex-1 lg:overflow-y-auto p-4 lg:p-6">

          {/* Mobile: sortable list with touch drag */}
          <div className="lg:hidden space-y-2 pb-4">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <UtensilsCrossed size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">No items here yet</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {filteredItems.map(item => (
                    <SortableMobileItemRow key={item.id} item={item} openEdit={openEdit} quickToggle={quickToggle} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Desktop: DnD card grid */}
          <div className="hidden lg:block">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <UtensilsCrossed size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500 mb-1">No items here yet</p>
                <button onClick={openNew} className={BTN_PRIMARY + ' mt-3'}><Plus size={14} /> Add First Item</button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                <SortableContext items={filteredItems.map(i => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredItems.map(item => (
                      <SortableItemCard
                        key={item.id}
                        item={item}
                        openEdit={openEdit}
                        deleteItem={deleteItem}
                        quickToggle={quickToggle}
                      />
                    ))}
                    <button onClick={openNew} className="min-h-[220px] border-2 border-dashed border-gray-200 hover:border-brand-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-brand-500 transition group">
                      <Plus size={24} className="group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Add Item</span>
                    </button>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile FAB — add new item ─────────────────────────────── */}
      <button
        onClick={openNew}
        className="lg:hidden fixed right-4 z-40 w-14 h-14 bg-brand-500 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* ── Item Drawer — bottom sheet on mobile, right panel on desktop ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end lg:flex-row lg:justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative w-full lg:max-w-lg bg-white shadow-2xl flex flex-col z-10 max-h-[92vh] lg:max-h-none rounded-t-3xl lg:rounded-none animate-slide-up lg:[animation:none]">

            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">{editingItem ? 'Edit Item' : 'New Item'}</h2>
                {editingItem && <p className="text-xs text-gray-400 mt-0.5">{editingItem.name}</p>}
              </div>
              <button onClick={closeDrawer} className={BTN_GHOST}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 shrink-0">
              {(['details', 'options'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'options' && !editingItem) { toast('Save the item first to add options', 'info'); return }
                    setDrawerTab(tab)
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition flex items-center gap-1.5 ${drawerTab === tab ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100'} ${tab === 'options' && !editingItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {tab === 'details' ? <UtensilsCrossed size={13} /> : <SlidersHorizontal size={13} />}
                  {tab}
                  {tab === 'options' && optionGroups.length > 0 && (
                    <span className="bg-white/30 text-xs font-bold px-1.5 rounded-full">{optionGroups.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {drawerTab === 'details' ? (
                <>
                  <Field label="Item Name *">
                    <input className={INPUT} value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Classic Burger" autoFocus />
                  </Field>
                  <Field label="Description">
                    <textarea className={INPUT + ' resize-none'} rows={3} value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the item…" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price ($) *">
                      <input className={INPUT} type="number" min="0" step="0.01" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                    </Field>
                    <Field label="Category">
                      <select className={INPUT} value={itemForm.category_id} onChange={e => setItemForm(f => ({ ...f, category_id: e.target.value, subcategory_id: '' }))}>
                        <option value="">None</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  {filteredSubs.length > 0 && (
                    <Field label="Subcategory">
                      <select className={INPUT} value={itemForm.subcategory_id} onChange={e => setItemForm(f => ({ ...f, subcategory_id: e.target.value }))}>
                        <option value="">None</option>
                        {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                  )}

                  <Field label="Image">
                    <div className="space-y-2">
                      {(imagePreview || itemForm.image_url) && (
                        <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100">
                          <Image src={imagePreview || itemForm.image_url} alt="preview" fill className="object-cover" />
                          <button onClick={() => { setImageFile(null); setImagePreview(''); setItemForm(f => ({ ...f, image_url: '' })) }}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <input type="file" accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0] ?? null
                          setImageFile(file)
                          setImagePreview(file ? URL.createObjectURL(file) : '')
                        }}
                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100 file:transition file:text-xs" />
                    </div>
                  </Field>

                  {tags.length > 0 && (
                    <Field label="Tags">
                      <div className="flex flex-wrap gap-2">
                        {tags.map(t => {
                          const sel = selectedTagIds.includes(t.id)
                          return (
                            <button key={t.id} type="button"
                              onClick={() => setSelectedTagIds(prev => sel ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${sel ? 'text-white' : 'bg-white'}`}
                              style={sel ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color + '60', color: t.color }}
                            >
                              {sel && <Check size={10} />}{t.name}
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                  )}

                  <div className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Available for ordering</p>
                      <p className="text-xs text-gray-400">Show this item to customers</p>
                    </div>
                    <Toggle checked={itemForm.is_available} onChange={v => setItemForm(f => ({ ...f, is_available: v }))} />
                  </div>

                  <AvailabilitySection
                    orderTypes={itemForm.available_order_types}
                    onOrderTypes={v => setItemForm(f => ({ ...f, available_order_types: v }))}
                    happyEnabled={itemForm.happy_hour_enabled}
                    onHappyEnabled={v => setItemForm(f => ({ ...f, happy_hour_enabled: v }))}
                    happyStart={itemForm.happy_hour_start}
                    onHappyStart={v => setItemForm(f => ({ ...f, happy_hour_start: v }))}
                    happyEnd={itemForm.happy_hour_end}
                    onHappyEnd={v => setItemForm(f => ({ ...f, happy_hour_end: v }))}
                    happyDays={itemForm.happy_hour_days}
                    onHappyDays={v => setItemForm(f => ({ ...f, happy_hour_days: v }))}
                  />
                </>
              ) : (
                /* Options tab */
                <div className="space-y-3">
                  {optionGroups.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <SlidersHorizontal size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No option groups yet</p>
                      <p className="text-xs mt-1 text-gray-400">Add groups like "Size", "Protein", or "Add-ons"</p>
                    </div>
                  ) : optionGroups.map(g => (
                    <div key={g.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                        <button onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}
                          className="text-gray-400 hover:text-gray-600 shrink-0">
                          {expandedGroups.has(g.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{g.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${g.is_required ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {g.is_required ? 'Required' : 'Optional'}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{g.min_select}–{g.max_select}</span>
                        <button onClick={() => { setGroupModal({ editing: g }); setGroupForm({ name: g.name, is_required: g.is_required, min_select: g.min_select, max_select: g.max_select }) }}
                          className={BTN_GHOST}><Pencil size={12} /></button>
                        <button onClick={() => deleteGroup(g.id)} className={BTN_GHOST}><Trash2 size={12} className="text-red-400" /></button>
                      </div>
                      {expandedGroups.has(g.id) && (
                        <div className="divide-y divide-gray-50">
                          {g.options.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">No options yet</p>}
                          {g.options.map(opt => (
                            <div key={opt.id} className="flex items-center gap-2 px-4 py-2.5">
                              <span className={`flex-1 text-sm ${opt.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{opt.name}</span>
                              {opt.additional_price > 0 && <span className="text-xs text-green-600 font-semibold">+{formatCurrency(opt.additional_price)}</span>}
                              <button onClick={() => toggleOptionActive(opt)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${opt.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {opt.is_active ? 'On' : 'Off'}
                              </button>
                              <button onClick={() => { setOptionModal({ groupId: g.id, editing: opt }); setOptionForm({ name: opt.name, additional_price: String(opt.additional_price), is_active: opt.is_active }) }}
                                className={BTN_GHOST}><Pencil size={11} /></button>
                              <button onClick={() => deleteOption(opt.id)} className={BTN_GHOST}><Trash2 size={11} className="text-red-400" /></button>
                            </div>
                          ))}
                          <div className="px-4 py-2">
                            <button onClick={() => { setOptionModal({ groupId: g.id }); setOptionForm({ name: '', additional_price: '0', is_active: true }) }}
                              className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium">
                              <Plus size={12} /> Add Option
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => { setGroupModal({}); setGroupForm({ name: '', is_required: false, min_select: 0, max_select: 1 }); setGroupOptionRows([{ name: '', additional_price: '0', is_active: true }]) }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 hover:border-brand-300 text-gray-400 hover:text-brand-500 rounded-2xl transition text-sm font-medium">
                    <Plus size={14} /> Add Option Group
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {drawerTab === 'details' && (
              <div
                className="px-6 border-t border-gray-100 flex items-center gap-3 shrink-0 bg-white"
                style={{ paddingTop: '1rem', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}
              >
                {editingItem && (
                  <button onClick={() => deleteItem(editingItem.id)} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={closeDrawer} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={saveItem} disabled={savingItem} className={BTN_PRIMARY}>
                    {savingItem ? 'Saving…' : editingItem ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile: Categories management bottom sheet ───────────── */}
      {mobileCatSheetOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setMobileCatSheetOpen(false)}
          />
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col"
            style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900">Categories</h3>
              <button onClick={() => setMobileCatSheetOpen(false)} className={BTN_GHOST}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-3">
              <button
                onClick={() => { setFilterKey('all'); setMobileCatSheetOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition mb-1 ${filterKey === 'all' ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 active:bg-gray-50'}`}
              >
                <UtensilsCrossed size={14} />
                <span className="flex-1 text-left">All Items</span>
                <span className="text-xs text-gray-400">{items.length}</span>
              </button>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
                <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {categories.map(cat => (
                    <SortableCatRow
                      key={cat.id}
                      cat={cat}
                      filterKey={filterKey}
                      setFilterKey={k => { setFilterKey(k); setMobileCatSheetOpen(false) }}
                      expandedCats={expandedCats}
                      onToggleExpand={id => setExpandedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
                      items={items}
                      openCatModal={openCatModal}
                      deleteCat={deleteCat}
                      onSubDragEnd={handleSubDragEnd}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                onClick={() => { setMobileCatSheetOpen(false); openCatModal('cat') }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-dashed border-gray-200 active:bg-gray-50 transition"
              >
                <Plus size={14} /> Add Category
              </button>
              <button
                onClick={() => { setMobileCatSheetOpen(false); setTagModal(true) }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 active:bg-gray-50 transition"
              >
                <Tag size={14} /> Tags
              </button>
            </div>
          </div>
        </>
      )}

      {/* Category / Subcategory Modal */}
      {catModal && (
        <SmallModal title={catModal.editing ? `Edit ${catModal.type === 'cat' ? 'Category' : 'Subcategory'}` : `New ${catModal.type === 'cat' ? 'Category' : 'Subcategory'}`} onClose={() => setCatModal(null)} size="md">
          <div className="space-y-3">
            <Field label="Name *"><input className={INPUT} value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} autoFocus /></Field>
            {catModal.type === 'cat' && <Field label="Description"><input className={INPUT} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} /></Field>}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="catActive" checked={catForm.is_active} onChange={e => setCatForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="catActive" className="text-sm text-gray-600">Active</label>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Availability</p>
              <AvailabilitySection
                orderTypes={catForm.available_order_types}
                onOrderTypes={v => setCatForm(f => ({ ...f, available_order_types: v }))}
                happyEnabled={catForm.happy_hour_enabled}
                onHappyEnabled={v => setCatForm(f => ({ ...f, happy_hour_enabled: v }))}
                happyStart={catForm.happy_hour_start}
                onHappyStart={v => setCatForm(f => ({ ...f, happy_hour_start: v }))}
                happyEnd={catForm.happy_hour_end}
                onHappyEnd={v => setCatForm(f => ({ ...f, happy_hour_end: v }))}
                happyDays={catForm.happy_hour_days}
                onHappyDays={v => setCatForm(f => ({ ...f, happy_hour_days: v }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCatModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={saveCat} disabled={savingCat} className={BTN_PRIMARY}>{savingCat ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </SmallModal>
      )}

      {/* Option Group Modal */}
      {groupModal && (
        <SmallModal title={groupModal.editing ? 'Edit Option Group' : 'New Option Group'} onClose={() => setGroupModal(null)} size="lg">
          <div className="space-y-4">
            <Field label="Group Name *">
              <input className={INPUT} value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Protein Choice, Spice Level" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min Selection">
                <input className={INPUT} type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm(f => ({ ...f, min_select: Number(e.target.value) }))} />
              </Field>
              <Field label="Max Selection">
                <input className={INPUT} type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm(f => ({ ...f, max_select: Number(e.target.value) }))} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="grpReq" checked={groupForm.is_required} onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))} />
              <label htmlFor="grpReq" className="text-sm text-gray-600">Required — customer must choose</label>
            </div>

            {/* Inline options (new group only) */}
            {!groupModal.editing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500">Options</label>
                  <button
                    type="button"
                    onClick={() => setGroupOptionRows(prev => [...prev, { name: '', additional_price: '0', is_active: true }])}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>
                <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  <div className="grid grid-cols-[1fr_100px_32px_24px] gap-2 px-3 py-1.5 bg-gray-50">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Name</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">+Price ($)</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">On</span>
                    <span />
                  </div>
                  {groupOptionRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_32px_24px] gap-2 items-center px-3 py-2">
                      <input
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400 bg-white"
                        placeholder={`Option ${i + 1}`}
                        value={row.name}
                        onChange={e => setGroupOptionRows(prev => prev.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                      />
                      <input
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400 bg-white w-full"
                        type="number" min="0" step="0.01"
                        value={row.additional_price}
                        onChange={e => setGroupOptionRows(prev => prev.map((r, j) => j === i ? { ...r, additional_price: e.target.value } : r))}
                      />
                      <div className="flex justify-center">
                        <Toggle checked={row.is_active} onChange={v => setGroupOptionRows(prev => prev.map((r, j) => j === i ? { ...r, is_active: v } : r))} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setGroupOptionRows(prev => prev.length === 1 ? [{ name: '', additional_price: '0', is_active: true }] : prev.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-400 transition flex justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400">Blank rows are ignored on save.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setGroupModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={saveGroup} disabled={savingGroup} className={BTN_PRIMARY}>{savingGroup ? 'Saving…' : groupModal.editing ? 'Save Changes' : 'Create Group'}</button>
            </div>
          </div>
        </SmallModal>
      )}

      {/* Option Modal */}
      {optionModal && (
        <SmallModal title={optionModal.editing ? 'Edit Option' : 'New Option'} onClose={() => setOptionModal(null)}>
          <div className="space-y-3">
            <Field label="Option Name *"><input className={INPUT} value={optionForm.name} onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Large, Extra Spicy" autoFocus /></Field>
            <Field label="Additional Price ($)"><input className={INPUT} type="number" min="0" step="0.01" value={optionForm.additional_price} onChange={e => setOptionForm(f => ({ ...f, additional_price: e.target.value }))} /></Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="optActive" checked={optionForm.is_active} onChange={e => setOptionForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="optActive" className="text-sm text-gray-600">Active</label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOptionModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={saveOption} disabled={savingOption} className={BTN_PRIMARY}>{savingOption ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </SmallModal>
      )}

      {/* Tag Modal */}
      {tagModal && (
        <SmallModal title="Manage Tags" onClose={() => setTagModal(false)}>
          <div className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tags.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No tags yet</p>
                : tags.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="flex-1 text-sm text-gray-700">{t.name}</span>
                    <button onClick={() => deleteTag(t.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={13} /></button>
                  </div>
                ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">New Tag</p>
              <input className={INPUT} value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Tag name" onKeyDown={e => e.key === 'Enter' && saveTag()} />
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${newTagColor === c ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={saveTag} disabled={savingTag || !newTagName.trim()} className={BTN_PRIMARY + ' w-full justify-center'}>
                <Plus size={13} /> {savingTag ? 'Creating…' : 'Create Tag'}
              </button>
            </div>
          </div>
        </SmallModal>
      )}

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!confirmingImport) setImportPreview(null) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col z-10">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Import Preview</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {importPreview.filter(isValidRow).length} of {importPreview.length} rows valid — edit any cell before importing
                </p>
              </div>
              {!confirmingImport && (
                <button onClick={() => setImportPreview(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Datalists for autocomplete */}
            <datalist id="import-cat-list">
              {categories.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
            <datalist id="import-sub-list">
              {categories.flatMap(c => c.subcategories).map(s => <option key={s.id} value={s.name} />)}
            </datalist>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse" style={{ minWidth: 920 }}>
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide min-w-[140px]">Name *</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide min-w-[160px]">Description</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20">Price *</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide min-w-[110px]">Category</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide min-w-[110px]">Subcategory</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">Avail.</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide min-w-[120px]">Tags (|‑separated)</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importPreview.map((row, idx) => {
                    const valid = isValidRow(row)
                    const CELL = 'w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-400 focus:outline-none px-1 py-0.5 text-sm transition'
                    return (
                      <tr key={row._id} className={valid ? 'hover:bg-gray-50/40' : 'bg-red-50'}>
                        <td className="px-3 py-2 text-xs text-gray-400 select-none">{idx + 1}</td>
                        <td className="px-2 py-1.5">
                          <input
                            className={CELL + (!row.name.trim() ? ' placeholder-red-400' : '')}
                            value={row.name}
                            placeholder="Required"
                            onChange={e => updatePreviewRow(row._id, 'name', e.target.value)}
                            disabled={confirmingImport}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={CELL}
                            value={row.description}
                            onChange={e => updatePreviewRow(row._id, 'description', e.target.value)}
                            disabled={confirmingImport}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={CELL + (isNaN(parseFloat(row.price)) || parseFloat(row.price) < 0 ? ' text-red-500' : '')}
                            type="number" min="0" step="0.01"
                            value={row.price}
                            onChange={e => updatePreviewRow(row._id, 'price', e.target.value)}
                            disabled={confirmingImport}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={CELL}
                            value={row.category}
                            list="import-cat-list"
                            onChange={e => updatePreviewRow(row._id, 'category', e.target.value)}
                            disabled={confirmingImport}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={CELL}
                            value={row.subcategory}
                            list="import-sub-list"
                            onChange={e => updatePreviewRow(row._id, 'subcategory', e.target.value)}
                            disabled={confirmingImport}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Toggle checked={row.is_available} onChange={v => updatePreviewRow(row._id, 'is_available', v)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={CELL}
                            value={row.tags}
                            placeholder="Tag1|Tag2"
                            onChange={e => updatePreviewRow(row._id, 'tags', e.target.value)}
                            disabled={confirmingImport}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => deletePreviewRow(row._id)}
                            disabled={confirmingImport}
                            className="text-gray-300 hover:text-red-400 transition disabled:opacity-30"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Progress bar */}
            {confirmingImport && (
              <div className="px-6 py-2 shrink-0 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Importing items…</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-200" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-2xl">
              <p className="text-xs">
                {importPreview.filter(r => !isValidRow(r)).length > 0 && (
                  <span className="text-red-500 font-medium">
                    {importPreview.filter(r => !isValidRow(r)).length} invalid row{importPreview.filter(r => !isValidRow(r)).length !== 1 ? 's' : ''} will be skipped
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportPreview(null)}
                  disabled={confirmingImport}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  disabled={confirmingImport || importPreview.filter(isValidRow).length === 0}
                  className={BTN_PRIMARY}
                >
                  {confirmingImport
                    ? `Importing… ${importProgress}%`
                    : `Import ${importPreview.filter(isValidRow).length} item${importPreview.filter(isValidRow).length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
