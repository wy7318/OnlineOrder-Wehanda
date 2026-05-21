'use client'

import { useState } from 'react'
import { User, Loader2 } from 'lucide-react'
import type { CustomerProfile } from '@/lib/types'

interface Props {
  email: string
  onSaved: (profile: CustomerProfile) => void
}

export default function CustomerProfileModal({ email, onSaved }: Props) {
  const [form, setForm] = useState({ display_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim() || !form.phone.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/customer/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      const profile: CustomerProfile = await res.json()
      onSaved(profile)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save profile')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* No backdrop click-to-close — profile completion is required */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={24} className="text-brand-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Complete your profile</h2>
        <p className="text-sm text-gray-500 text-center mb-5">Signed in as {email}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            autoFocus
            placeholder="Full Name *"
            value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
          />
          <input
            required
            type="tel"
            placeholder="Phone Number *"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
