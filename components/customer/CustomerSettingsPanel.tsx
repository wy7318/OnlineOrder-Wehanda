'use client'

import { useState } from 'react'
import { X, Settings, Loader2, Check } from 'lucide-react'
import type { CustomerProfile } from '@/lib/types'

interface Props {
  profile: CustomerProfile
  email: string
  onSaved: (profile: CustomerProfile) => void
  onClose: () => void
}

export default function CustomerSettingsPanel({ profile, email, onSaved, onClose }: Props) {
  const [form, setForm] = useState({ display_name: profile.display_name, phone: profile.phone })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim() || !form.phone.trim()) return
    setLoading(true)
    setError('')
    setSaved(false)

    const res = await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: form.display_name, phone: form.phone }),
    })

    if (res.ok) {
      const updated: CustomerProfile = await res.json()
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Settings size={18} className="text-brand-500" /> Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Name</label>
              <input
                required
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Full Name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Phone</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone Number"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Email is tied to your sign-in and cannot be changed here.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : saved
                  ? <><Check size={16} /> Saved!</>
                  : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
