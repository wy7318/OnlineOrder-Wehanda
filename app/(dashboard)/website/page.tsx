'use client'

import { useEffect, useState, useRef } from 'react'
import { Globe, Palette, Image as ImageIcon, FileText, Eye, Save, Loader2, Plus, X, Check, Upload, Layout, Sparkles, Lock } from 'lucide-react'

type TemplateId = 'modern' | 'bold' | 'minimal' | 'classic' | 'noir' | 'organic' | 'electric' | 'zen'

interface WebsiteSettings {
  hero_headline?: string
  hero_subheadline?: string
  about_title?: string
  about_body?: string
  accent_color?: string
  gallery_urls?: string[]
  seo_meta_description?: string
  seo_keywords?: string
  show_gallery?: boolean
  show_hours_on_home?: boolean
  show_map_link?: boolean
  google_analytics_id?: string
  template?: TemplateId
}

interface RestaurantInfo {
  name: string
  slug: string
  hasRevenueBoost: boolean
}

const ACCENT_PRESETS = [
  '#037FFC', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#0891b2', '#64748b',
]

const TEMPLATES: {
  id: TemplateId
  name: string
  description: string
  preview: React.ReactNode
}[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Full-bleed hero, clean cards, photo-forward',
    preview: (
      <div className="w-full h-full bg-gray-800 rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 bg-gradient-to-br from-gray-700 to-gray-900 flex items-end p-2">
          <div className="space-y-1">
            <div className="h-2 bg-white/80 rounded w-16" />
            <div className="h-1.5 bg-white/40 rounded w-12" />
          </div>
        </div>
        <div className="bg-white p-2 grid grid-cols-2 gap-1">
          <div className="h-6 bg-gray-100 rounded" />
          <div className="h-6 bg-gray-100 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Dark theme, split hero, high contrast',
    preview: (
      <div className="w-full h-full bg-[#0f0f0f] rounded-lg overflow-hidden flex">
        <div className="flex-1 p-2 flex flex-col justify-center space-y-1">
          <div className="h-3 bg-white rounded w-14" />
          <div className="h-1.5 bg-white/30 rounded w-10" />
          <div className="h-4 bg-white/10 rounded w-8 mt-1" />
        </div>
        <div className="w-1/3 bg-gray-700" />
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Airy, editorial, light & spacious',
    preview: (
      <div className="w-full h-full bg-stone-50 rounded-lg overflow-hidden flex">
        <div className="flex-1 p-2 flex flex-col justify-center space-y-1.5">
          <div className="h-3 bg-gray-800 rounded w-14" />
          <div className="h-1.5 bg-gray-300 rounded w-10" />
          <div className="space-y-0.5 pt-1">
            <div className="h-1 bg-gray-200 rounded w-full" />
            <div className="h-1 bg-gray-200 rounded w-3/4" />
            <div className="h-1 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
        <div className="w-2/5 bg-stone-200 rounded-l-xl m-1.5" />
      </div>
    ),
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Warm & traditional, fine dining feel',
    preview: (
      <div className="w-full h-full bg-amber-900 rounded-lg overflow-hidden flex flex-col items-center justify-center p-2 space-y-1">
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-px bg-amber-600" />
          <div className="w-1 h-1 bg-amber-400 rounded-full" />
          <div className="flex-1 h-px bg-amber-600" />
        </div>
        <div className="h-2.5 bg-white/80 rounded w-12" />
        <div className="h-1.5 bg-white/40 rounded w-9" />
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-px bg-amber-600" />
          <div className="w-1 h-1 bg-amber-400 rounded-full" />
          <div className="flex-1 h-px bg-amber-600" />
        </div>
      </div>
    ),
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Cinematic dark editorial, italic serif drama',
    preview: (
      <div className="w-full h-full bg-[#0c0c0c] rounded-lg overflow-hidden flex flex-col items-center justify-center p-3 space-y-2">
        <div className="w-8 h-px bg-white/20" />
        <div className="h-3 bg-white/70 rounded-sm w-16" style={{ fontStyle: 'italic' }} />
        <div className="h-1.5 bg-white/20 rounded w-10" />
        <div className="w-8 h-px bg-white/20" />
        <div className="mt-1 grid grid-cols-2 gap-1 w-full">
          <div className="h-5 rounded" style={{ background: 'rgba(240,237,232,0.06)', border: '1px solid rgba(240,237,232,0.07)' }} />
          <div className="h-5 rounded" style={{ background: 'rgba(240,237,232,0.06)', border: '1px solid rgba(240,237,232,0.07)' }} />
        </div>
      </div>
    ),
  },
  {
    id: 'organic',
    name: 'Organic',
    description: 'Warm earthy tones, artisanal & nature-first',
    preview: (
      <div className="w-full h-full bg-[#faf7f2] rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 bg-[#f0e8dc] flex items-center justify-center p-2">
          <div className="space-y-1.5 w-full">
            <div className="h-1 bg-[#a8967e] rounded w-10" />
            <div className="h-2.5 bg-[#1a1612] rounded w-full opacity-80" />
            <div className="h-1.5 bg-[#c4b5a0] rounded w-12" />
          </div>
        </div>
        <div className="p-1.5 grid grid-cols-3 gap-1">
          <div className="h-5 bg-white rounded-xl border border-[#e8e0d4]" />
          <div className="h-5 bg-white rounded-xl border border-[#e8e0d4]" />
          <div className="h-5 bg-white rounded-xl border border-[#e8e0d4]" />
        </div>
      </div>
    ),
  },
  {
    id: 'electric',
    name: 'Electric',
    description: 'Bold street energy, oversized typography',
    preview: (
      <div className="w-full h-full bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 bg-[#0a0a0a] relative flex items-end p-2">
          <div className="space-y-0.5">
            <div className="h-4 bg-white rounded-sm w-20 opacity-90" />
            <div className="h-1.5 rounded-full w-10" style={{ background: '#037FFC' }} />
          </div>
        </div>
        <div className="border-b-2 border-[#0a0a0a] px-1.5 py-1 flex gap-2">
          <div className="h-1.5 bg-gray-200 rounded w-8" />
          <div className="h-1.5 bg-gray-200 rounded w-8" />
        </div>
        <div className="p-1.5 space-y-1">
          <div className="flex gap-1.5 items-center border-b border-gray-100 pb-1">
            <div className="h-6 w-8 bg-gray-100 rounded" />
            <div className="flex-1 h-2 bg-gray-800 rounded opacity-70" />
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="h-6 w-8 bg-gray-100 rounded" />
            <div className="flex-1 h-2 bg-gray-800 rounded opacity-70" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'zen',
    name: 'Zen',
    description: 'Japanese minimalism, extreme restraint',
    preview: (
      <div className="w-full h-full bg-[#f9f8f7] rounded-lg overflow-hidden flex flex-col items-center justify-center p-3 gap-2">
        <div className="h-1 bg-gray-200 rounded w-8" />
        <div className="h-3 bg-[#1c1c1c] rounded-sm w-20 opacity-60" />
        <div className="w-px h-4 bg-gray-300" />
        <div className="w-full space-y-1.5 border-t border-gray-200 pt-2">
          <div className="flex justify-between items-center">
            <div className="h-1.5 bg-gray-300 rounded w-12" />
            <div className="h-1.5 bg-gray-200 rounded w-6" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-1.5 bg-gray-300 rounded w-16" />
            <div className="h-1.5 bg-gray-200 rounded w-6" />
          </div>
        </div>
      </div>
    ),
  },
]

export default function WebsitePage() {
  const [settings, setSettings] = useState<WebsiteSettings>({})
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newGalleryUrl, setNewGalleryUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    Promise.all([
      fetch('/api/website-settings').then(r => r.json()),
      fetch('/api/restaurant/current').then(r => r.json()),
    ]).then(([ws, rest]) => {
      setSettings(ws ?? {})
      if (rest?.name) setRestaurant({
        name: rest.name,
        slug: rest.slug,
        hasRevenueBoost: rest.restaurant_licenses?.feature_revenue_boost ?? false,
      })
    }).finally(() => setLoading(false))
  }, [])

  function update(patch: Partial<WebsiteSettings>) {
    setSettings(s => ({ ...s, ...patch }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/website-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function generateContent() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/website-content', { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()
      update({
        hero_headline: data.hero_headline ?? settings.hero_headline,
        hero_subheadline: data.hero_subheadline ?? settings.hero_subheadline,
        about_title: data.about_title ?? settings.about_title,
        about_body: data.about_body ?? settings.about_body,
        seo_meta_description: data.seo_meta_description ?? settings.seo_meta_description,
        seo_keywords: data.seo_keywords ?? settings.seo_keywords,
      })
    } finally {
      setGenerating(false)
    }
  }

  function addGalleryUrl() {
    const url = newGalleryUrl.trim()
    if (!url) return
    update({ gallery_urls: [...(settings.gallery_urls ?? []), url] })
    setNewGalleryUrl('')
  }

  function removeGalleryUrl(i: number) {
    update({ gallery_urls: (settings.gallery_urls ?? []).filter((_, idx) => idx !== i) })
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/website-settings/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        update({ gallery_urls: [...(settings.gallery_urls ?? []), json.url] })
      }
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )

  const previewUrl = restaurant ? `/restaurant/${restaurant.slug}` : null

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-900">Website</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize your public restaurant site — template, design, content, and SEO.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              <Eye size={15} /> Preview
            </a>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* AI Generate banner — Revenue Boost gated */}
      {restaurant?.hasRevenueBoost ? (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={17} className="text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">AI Website Generator</p>
              <p className="text-xs text-gray-500 mt-0.5">Instantly writes your Hero, About, and SEO sections based on your menu, location, and customer data. Optimized for Google local search.</p>
            </div>
          </div>
          <button
            onClick={generateContent}
            disabled={generating}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={16} className="text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">AI Website Generator <span className="ml-1 text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Revenue Boost</span></p>
            <p className="text-xs text-gray-500 mt-0.5">Upgrade to Revenue Boost to auto-generate SEO-optimized website content based on your menu and location.</p>
          </div>
        </div>
      )}

      {/* Template selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Layout size={17} className="text-brand-500" />
          <h2 className="font-bold text-gray-900">Template</h2>
        </div>
        <p className="text-xs text-gray-400 -mt-2">Choose a design layout for your restaurant&apos;s website. Each template has a distinct visual style.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TEMPLATES.map(t => {
            const isSelected = (settings.template ?? 'modern') === t.id
            return (
              <button key={t.id} onClick={() => update({ template: t.id })}
                className={`group text-left rounded-xl border-2 overflow-hidden transition-all ${isSelected ? 'border-brand-500 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                <div className="h-24 p-2 bg-gray-50">
                  {t.preview}
                </div>
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-gray-900">{t.name}</p>
                    {isSelected && <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">{t.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Hero section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={17} className="text-brand-500" />
            <h2 className="font-bold text-gray-900">Hero Section</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Shown on your home page above the fold. Leave blank to use your restaurant name and description.</p>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Headline</label>
            <input
              value={settings.hero_headline ?? ''}
              onChange={e => update({ hero_headline: e.target.value })}
              placeholder={`e.g. "Authentic Japanese cuisine in the heart of Austin"`}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Subheadline</label>
            <textarea
              value={settings.hero_subheadline ?? ''}
              onChange={e => update({ hero_subheadline: e.target.value })}
              placeholder="A short tagline or welcome message shown below the headline"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none transition"
            />
          </div>
        </div>

        {/* Design */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={17} className="text-brand-500" />
            <h2 className="font-bold text-gray-900">Brand Color</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Used for buttons, highlights, and accents across your website.</p>

          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map(color => (
              <button key={color} onClick={() => update({ accent_color: color })}
                className="w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110"
                style={{
                  background: color,
                  borderColor: settings.accent_color === color ? '#111' : 'transparent',
                  boxShadow: settings.accent_color === color ? '0 0 0 2px white, 0 0 0 4px #111' : 'none',
                }}
                title={color}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Custom</label>
            <div className="flex items-center gap-2 flex-1">
              <input type="color"
                value={settings.accent_color ?? '#037FFC'}
                onChange={e => update({ accent_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                value={settings.accent_color ?? '#037FFC'}
                onChange={e => update({ accent_color: e.target.value })}
                placeholder="#037FFC"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-400 transition"
              />
            </div>
          </div>

          {/* Feature toggles */}
          <div className="pt-2 space-y-3 border-t border-gray-100">
            {([
              { key: 'show_hours_on_home', label: 'Show hours on home page' },
              { key: 'show_gallery', label: 'Show gallery section' },
              { key: 'show_map_link', label: 'Show "Get directions" link' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="relative shrink-0">
                  <input type="checkbox" className="sr-only peer"
                    checked={settings[key] ?? true}
                    onChange={e => update({ [key]: e.target.checked })} />
                  <div className="w-11 h-6 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* About section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={17} className="text-brand-500" />
            <h2 className="font-bold text-gray-900">About Section</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Shown on the home page and About page. Tell your restaurant&apos;s story.</p>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Section title</label>
            <input
              value={settings.about_title ?? ''}
              onChange={e => update({ about_title: e.target.value })}
              placeholder={`e.g. "Our Story"`}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">About text</label>
            <textarea
              value={settings.about_body ?? ''}
              onChange={e => update({ about_body: e.target.value })}
              placeholder="Share your restaurant's history, philosophy, or what makes you unique…"
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-y transition"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon size={17} className="text-brand-500" />
            <h2 className="font-bold text-gray-900">Gallery</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Upload or link photos to showcase your food, space, or team.</p>

          {/* Thumbnails */}
          {(settings.gallery_urls ?? []).length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {(settings.gallery_urls ?? []).map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeGalleryUrl(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handlePhotoUpload(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition disabled:opacity-60"
            >
              {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingPhoto ? 'Uploading…' : 'Upload a photo'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-1.5">JPEG, PNG, WebP, GIF — max 5 MB</p>
          </div>

          {/* URL fallback */}
          <div className="flex gap-2">
            <input
              value={newGalleryUrl}
              onChange={e => setNewGalleryUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addGalleryUrl() }}
              placeholder="Or paste an image URL…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition"
            />
            <button onClick={addGalleryUrl}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold transition hover:bg-gray-700">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={17} className="text-brand-500" />
            <h2 className="font-bold text-gray-900">SEO</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Helps search engines understand and rank your restaurant page.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Meta description <span className="font-normal normal-case">(shown in Google results)</span>
              </label>
              <textarea
                value={settings.seo_meta_description ?? ''}
                onChange={e => update({ seo_meta_description: e.target.value })}
                placeholder={`e.g. "Best ramen in Austin. Fresh noodles, rich broths, authentic flavors."`}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none transition"
              />
              <p className={`text-xs mt-1 ${(settings.seo_meta_description?.length ?? 0) > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                {settings.seo_meta_description?.length ?? 0}/160 chars
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Keywords <span className="font-normal normal-case">(comma separated)</span>
              </label>
              <textarea
                value={settings.seo_keywords ?? ''}
                onChange={e => update({ seo_keywords: e.target.value })}
                placeholder="ramen Austin, Japanese noodles, online ordering, best ramen Texas"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Google Analytics ID <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              value={settings.google_analytics_id ?? ''}
              onChange={e => update({ google_analytics_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className="w-full sm:max-w-xs border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-400 transition"
            />
          </div>
        </div>
      </div>

      {/* Save footer */}
      <div className="flex justify-end pb-4">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-bold transition">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'All changes saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
