'use client'

import { useState } from 'react'
import { X, Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  restaurantSlug: string
  onClose: () => void
}

export default function CustomerAuthModal({ restaurantSlug, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Persist preference for the portal to read after the OTP redirect
    try {
      sessionStorage.setItem(`wehanda_mkt_optin_${restaurantSlug}`, String(marketingOptIn))
    } catch {}

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`/restaurant/${restaurantSlug}`)}`

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
          <X size={20} />
        </button>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-brand-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-5 text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-5">Save your info and see your order history</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Marketing opt-in */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={marketingOptIn}
                    onChange={e => setMarketingOptIn(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-brand-500 peer-checked:bg-brand-500 transition-colors flex items-center justify-center">
                    {marketingOptIn && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  I agree to receive exclusive offers and promotions. You can opt out at any time.
                </p>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send magic link'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
              We&apos;ll email you a one-time link — no password required
            </p>
          </>
        )}
      </div>
    </div>
  )
}
