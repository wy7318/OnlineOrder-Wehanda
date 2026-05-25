'use client'

import { useState } from 'react'
import { X, CreditCard, CheckCircle2, Shield, Loader2, LogOut, ExternalLink, Zap } from 'lucide-react'

export interface StripeSettings {
  id?: string
  restaurant_id: string
  stripe_enabled: boolean
  stripe_account_id: string | null
  stripe_mode: 'live' | 'test'
  connected_at: string | null
}

interface Props {
  restaurantId: string
  existing: StripeSettings | null
  onSaved: (settings: StripeSettings) => void
  onClose: () => void
}

export default function StripeSetupWizard({ restaurantId, existing, onSaved, onClose }: Props) {
  const [disconnecting, setDisconnecting] = useState(false)
  const isConnected = !!(existing?.stripe_enabled && existing.stripe_account_id)

  async function handleDisconnect() {
    if (!confirm('Disconnect Stripe? Customers will no longer be able to pay by card.')) return
    setDisconnecting(true)
    const res = await fetch('/api/stripe/connect/disconnect', { method: 'POST' })
    setDisconnecting(false)
    if (res.ok) {
      onSaved({
        restaurant_id: restaurantId,
        stripe_enabled: false,
        stripe_account_id: null,
        stripe_mode: existing?.stripe_mode ?? 'live',
        connected_at: null,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <CreditCard size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">Online Payments</p>
              <p className="text-xs text-gray-400">Powered by Stripe</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">

          {isConnected ? (
            /* ── Already connected ── */
            <>
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800">Stripe connected</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Customers can pay by card at checkout.
                    {existing?.connected_at && (
                      <> Connected {new Date(existing.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Account ID</span>
                  <span className="font-mono text-gray-700 text-xs">{existing?.stripe_account_id?.slice(0, 12)}…</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Mode</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    existing?.stripe_mode === 'test'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {existing?.stripe_mode === 'test' ? 'Test mode (admin)' : 'Live'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                To change which Stripe account is connected, disconnect first then reconnect.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold transition disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                  {disconnecting ? 'Disconnecting…' : 'Disconnect Stripe'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            /* ── Not yet connected ── */
            <>
              <p className="text-sm text-gray-600">
                Connect your Stripe account so customers can pay by card at checkout.
                If you don&apos;t have a Stripe account yet, you&apos;ll be able to create one during setup — it only takes a few minutes.
              </p>

              <div className="space-y-2.5">
                {[
                  { icon: Zap, text: 'One-click setup — no API keys needed' },
                  { icon: Shield, text: 'Stripe handles all security & fraud protection' },
                  { icon: CreditCard, text: 'Funds go directly to your Stripe account' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 bg-indigo-50 rounded-xl px-3.5 py-2.5">
                    <Icon size={15} className="text-indigo-500 shrink-0" />
                    <p className="text-sm text-indigo-800 font-medium">{text}</p>
                  </div>
                ))}
              </div>

              <a
                href="/api/stripe/connect/authorize"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-lg shadow-indigo-200/50"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden>
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                Connect with Stripe
                <ExternalLink size={13} className="opacity-70" />
              </a>

              <p className="text-center text-xs text-gray-400">
                You&apos;ll be redirected to Stripe to authorize. Takes ~1 minute.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
