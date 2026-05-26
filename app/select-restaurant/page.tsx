'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, LogOut, ArrowRight, MapPin, Store } from 'lucide-react'

type LicenseStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

interface Restaurant {
  id: string
  name: string
  slug: string
  is_active: boolean
  logo_url: string | null
  address: string | null
  created_at: string
  license_status: LicenseStatus
  trial_ends_at: string | null
}

export default function SelectRestaurantPage() {
  const router = useRouter()
  const supabase = createClient()

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')

      const res = await fetch('/api/restaurants')
      if (!res.ok) { setLoading(false); return }

      const data: Restaurant[] = await res.json()
      setRestaurants(data)

      if (data.length === 0) {
        // No restaurants yet — go create one
        router.push('/setup?new=1')
        return
      }

      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(id: string) {
    setSelecting(id)
    window.location.href = `/api/restaurant/select?id=${id}`
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading your restaurants…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Wehanda</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={26} className="text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your Restaurants</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Select a restaurant to open its dashboard</p>
        </div>

        {/* Restaurant cards */}
        {restaurants.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            {restaurants.map(r => {
              const trialExpired = r.license_status === 'trial' && !!r.trial_ends_at && new Date(r.trial_ends_at) < new Date()
              const isBlocked = r.license_status === 'suspended' || r.license_status === 'cancelled' || trialExpired
              const statusBadge: Record<LicenseStatus, { label: string; cls: string }> = {
                active:    { label: 'Active',    cls: 'bg-green-100 text-green-700' },
                trial:     { label: 'Trial',     cls: 'bg-purple-100 text-purple-700' },
                suspended: { label: 'Suspended', cls: 'bg-amber-100 text-amber-700' },
                cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
              }
              const badge = r.is_active ? statusBadge[r.license_status] : { label: 'Inactive', cls: 'bg-gray-100 text-gray-400' }

              return (
                <button
                  key={r.id}
                  onClick={() => !isBlocked && handleSelect(r.id)}
                  disabled={selecting !== null || isBlocked}
                  className={`bg-white rounded-2xl border shadow-sm p-5 text-left transition-all group ${
                    isBlocked
                      ? 'border-gray-100 opacity-60 cursor-not-allowed'
                      : 'border-gray-100 hover:border-brand-300 hover:shadow-md disabled:opacity-60 disabled:cursor-wait'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                      {r.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logo_url} alt={r.name} className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-brand-500" />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Name + address */}
                  <h3 className="font-bold text-gray-900 text-base mb-1">{r.name}</h3>
                  {r.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                      <MapPin size={10} className="shrink-0" />
                      <span className="truncate">{r.address}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-gray-300 truncate">/restaurant/{r.slug}</p>

                  {/* CTA */}
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    {isBlocked ? (
                      <span className="text-sm font-semibold text-gray-400">Contact support</span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-brand-500 group-hover:text-brand-600 transition">
                          {selecting === r.id ? 'Opening…' : 'Open Dashboard'}
                        </span>
                        <ArrowRight size={16} className="text-brand-400 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
