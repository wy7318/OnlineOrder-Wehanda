'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, Users, Store, Plus, RefreshCw, LogOut,
  ChevronRight, ToggleLeft, ToggleRight, Trash2, UserPlus,
  Building2, CheckCircle2, XCircle, ExternalLink, CreditCard,
  FlaskConical, Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Restaurant {
  id: string
  name: string
  slug: string
  is_active: boolean
  owner_user_id: string
  owner_email: string | null
  address: string | null
  created_at: string
}

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  restaurants: { id: string; name: string }[]
}

type Tab = 'restaurants' | 'users' | 'payments'

interface PaymentRow {
  id: string
  name: string
  slug: string
  payment_settings: {
    stripe_enabled: boolean
    stripe_mode: 'live' | 'test'
    stripe_account_id: string | null
    connected_at: string | null
  } | null
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('restaurants')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [togglingModeId, setTogglingModeId] = useState<string | null>(null)

  // Modals
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showChangeOwner, setShowChangeOwner] = useState<Restaurant | null>(null)

  // Create restaurant form
  const [crName, setCrName] = useState('')
  const [crOwner, setCrOwner] = useState('')
  const [crAddress, setCrAddress] = useState('')
  const [crSubmitting, setCrSubmitting] = useState(false)
  const [crError, setCrError] = useState('')

  // Create user form
  const [cuEmail, setCuEmail] = useState('')
  const [cuPassword, setCuPassword] = useState('')
  const [cuSubmitting, setCuSubmitting] = useState(false)
  const [cuError, setCuError] = useState('')

  // Change owner form
  const [coOwner, setCoOwner] = useState('')
  const [coSubmitting, setCoSubmitting] = useState(false)

  // Per-row loading
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [rRes, uRes, pRes] = await Promise.all([
      fetch('/api/admin/restaurants'),
      fetch('/api/admin/users'),
      fetch('/api/admin/stripe/restaurants'),
    ])
    if (rRes.ok) setRestaurants(await rRes.json())
    if (uRes.ok) setUsers(await uRes.json())
    if (pRes.ok) setPaymentRows(await pRes.json())
    setLoading(false)
  }, [])

  async function handleToggleStripeMode(row: PaymentRow) {
    if (!row.payment_settings) return
    const newMode = row.payment_settings.stripe_mode === 'test' ? 'live' : 'test'
    setTogglingModeId(row.id)
    const res = await fetch('/api/admin/stripe/test-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: row.id, mode: newMode }),
    })
    if (res.ok) {
      setPaymentRows(prev => prev.map(r =>
        r.id === row.id && r.payment_settings
          ? { ...r, payment_settings: { ...r.payment_settings, stripe_mode: newMode } }
          : r
      ))
    }
    setTogglingModeId(null)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setAdminEmail(user.email ?? '')
    })
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleActive(r: Restaurant) {
    setTogglingId(r.id)
    await fetch(`/api/admin/restaurants/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !r.is_active }),
    })
    setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x))
    setTogglingId(null)
  }

  async function handleDelete(r: Restaurant) {
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return
    setDeletingId(r.id)
    await fetch(`/api/admin/restaurants/${r.id}`, { method: 'DELETE' })
    setRestaurants(prev => prev.filter(x => x.id !== r.id))
    setDeletingId(null)
  }

  async function handleEnterDashboard(r: Restaurant) {
    window.location.href = `/api/restaurant/select?id=${r.id}`
  }

  async function handleCreateRestaurant(e: React.FormEvent) {
    e.preventDefault()
    setCrSubmitting(true)
    setCrError('')
    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: crName, owner_user_id: crOwner, address: crAddress || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setCrError(data.error ?? 'Failed'); setCrSubmitting(false); return }
    setShowCreateRestaurant(false)
    setCrName(''); setCrOwner(''); setCrAddress('')
    setCrSubmitting(false)
    loadData()
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCuSubmitting(true)
    setCuError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cuEmail, password: cuPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setCuError(data.error ?? 'Failed'); setCuSubmitting(false); return }
    setShowCreateUser(false)
    setCuEmail(''); setCuPassword('')
    setCuSubmitting(false)
    loadData()
  }

  async function handleChangeOwner(e: React.FormEvent) {
    e.preventDefault()
    if (!showChangeOwner) return
    setCoSubmitting(true)
    await fetch(`/api/admin/restaurants/${showChangeOwner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_user_id: coOwner }),
    })
    setCoSubmitting(false)
    setShowChangeOwner(null)
    setCoOwner('')
    loadData()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900">Wehanda</span>
              <span className="ml-2 text-[10px] font-semibold bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Platform Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{adminEmail}</span>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition">
              <Building2 size={14} /> My Dashboard
            </Link>
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title + actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage all restaurants and users on the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition">
              <RefreshCw size={15} />
            </button>
            {tab === 'restaurants' && (
              <button
                onClick={() => setShowCreateRestaurant(true)}
                className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
              >
                <Plus size={15} /> New Restaurant
              </button>
            )}
            {tab === 'users' && (
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
              >
                <UserPlus size={15} /> New User
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {([
            { id: 'restaurants', label: 'Restaurants', icon: Store },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'payments', label: 'Payments', icon: CreditCard },
          ] as { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'restaurants' ? (
          <RestaurantsTable
            restaurants={restaurants}
            togglingId={togglingId}
            deletingId={deletingId}
            onToggle={handleToggleActive}
            onDelete={handleDelete}
            onEnter={handleEnterDashboard}
            onChangeOwner={(r) => { setShowChangeOwner(r); setCoOwner(r.owner_user_id) }}
          />
        ) : tab === 'users' ? (
          <UsersTable users={users} />
        ) : (
          <PaymentsTable
            rows={paymentRows}
            togglingModeId={togglingModeId}
            onToggleMode={handleToggleStripeMode}
          />
        )}
      </div>

      {/* Create Restaurant Modal */}
      {showCreateRestaurant && (
        <Modal title="Create Restaurant" onClose={() => setShowCreateRestaurant(false)}>
          <form onSubmit={handleCreateRestaurant} className="space-y-4">
            <Field label="Restaurant Name" required>
              <input
                className="input"
                placeholder="e.g. The Golden Fork"
                value={crName}
                onChange={e => setCrName(e.target.value)}
                required
              />
            </Field>
            <Field label="Owner (User ID or email)" required>
              <select
                className="input"
                value={crOwner}
                onChange={e => setCrOwner(e.target.value)}
                required
              >
                <option value="">Select a user…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </Field>
            <Field label="Address (optional)">
              <input
                className="input"
                placeholder="123 Main St, City"
                value={crAddress}
                onChange={e => setCrAddress(e.target.value)}
              />
            </Field>
            {crError && <p className="text-sm text-red-500">{crError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateRestaurant(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={crSubmitting} className="btn-primary">
                {crSubmitting ? 'Creating…' : 'Create Restaurant'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <Modal title="Create User Account" onClose={() => setShowCreateUser(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <Field label="Email Address" required>
              <input
                className="input"
                type="email"
                placeholder="owner@restaurant.com"
                value={cuEmail}
                onChange={e => setCuEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" required>
              <input
                className="input"
                type="password"
                placeholder="Min. 8 characters"
                value={cuPassword}
                onChange={e => setCuPassword(e.target.value)}
                minLength={8}
                required
              />
            </Field>
            <p className="text-xs text-gray-400">The account will be created with email confirmed. Share credentials with the owner.</p>
            {cuError && <p className="text-sm text-red-500">{cuError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={cuSubmitting} className="btn-primary">
                {cuSubmitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Owner Modal */}
      {showChangeOwner && (
        <Modal title={`Change Owner — ${showChangeOwner.name}`} onClose={() => { setShowChangeOwner(null); setCoOwner('') }}>
          <form onSubmit={handleChangeOwner} className="space-y-4">
            <Field label="New Owner" required>
              <select
                className="input"
                value={coOwner}
                onChange={e => setCoOwner(e.target.value)}
                required
              >
                <option value="">Select a user…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowChangeOwner(null); setCoOwner('') }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={coSubmitting} className="btn-primary">
                {coSubmitting ? 'Saving…' : 'Save Owner'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
          transition: border-color 0.15s;
        }
        .input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .btn-primary {
          background: #f97316;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.5rem 1.25rem;
          border-radius: 0.75rem;
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #ea6c0a; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          background: white;
          border: 1px solid #e5e7eb;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1.25rem;
          border-radius: 0.75rem;
          transition: background 0.15s;
        }
        .btn-secondary:hover { background: #f9fafb; }
      `}</style>
    </div>
  )
}

function RestaurantsTable({
  restaurants, togglingId, deletingId,
  onToggle, onDelete, onEnter, onChangeOwner
}: {
  restaurants: Restaurant[]
  togglingId: string | null
  deletingId: string | null
  onToggle: (r: Restaurant) => void
  onDelete: (r: Restaurant) => void
  onEnter: (r: Restaurant) => void
  onChangeOwner: (r: Restaurant) => void
}) {
  if (restaurants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
        <Store size={32} className="mx-auto mb-3 opacity-30" />
        <p>No restaurants yet. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Restaurant', 'Owner', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {restaurants.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{r.name}</div>
                  <div className="text-xs text-gray-400 font-mono">/restaurant/{r.slug}</div>
                  {r.address && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{r.address}</div>}
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-gray-700">{r.owner_email ?? '—'}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{r.owner_user_id.slice(0, 8)}…</div>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => onToggle(r)}
                    disabled={togglingId === r.id}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                      r.is_active
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {r.is_active
                      ? <><ToggleRight size={13} /> Active</>
                      : <><ToggleLeft size={13} /> Inactive</>
                    }
                  </button>
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => onEnter(r)}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <ChevronRight size={12} /> Enter
                    </button>
                    <Link
                      href={`/restaurant/${r.slug}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <ExternalLink size={12} /> View
                    </Link>
                    <button
                      onClick={() => onChangeOwner(r)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Users size={12} /> Owner
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      disabled={deletingId === r.id}
                      className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsersTable({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
        <Users size={32} className="mx-auto mb-3 opacity-30" />
        <p>No users found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['User', 'Last Sign In', 'Restaurants', 'Status'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{u.email}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{u.id.slice(0, 12)}…</div>
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : <span className="text-gray-300">Never</span>
                  }
                </td>
                <td className="px-5 py-4">
                  {u.restaurants.length === 0 ? (
                    <span className="text-xs text-gray-300">None assigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.restaurants.map(r => (
                        <span key={r.id} className="text-[11px] bg-brand-50 text-brand-600 font-medium px-2 py-0.5 rounded-full">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  {u.restaurants.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 size={12} /> Active owner
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <XCircle size={12} /> No restaurants
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentsTable({
  rows, togglingModeId, onToggleMode,
}: {
  rows: PaymentRow[]
  togglingModeId: string | null
  onToggleMode: (r: PaymentRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
        <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
        <p>No restaurants found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-start gap-3">
        <FlaskConical size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Test Mode Toggle — Admin Only</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Switching a restaurant to <strong>Test</strong> mode makes their checkout use Stripe test keys.
            Use card <strong>4242 4242 4242 4242</strong> with any future date and CVC.
            This toggle is only visible to platform admins.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Restaurant', 'Stripe Status', 'Keys', 'Mode (Test/Live)', 'Portal'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => {
                const ps = r.payment_settings
                const isTest = ps?.stripe_mode === 'test'
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-400 font-mono">/restaurant/{r.slug}</div>
                    </td>
                    <td className="px-5 py-4">
                      {ps?.stripe_enabled ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                          <CheckCircle2 size={12} /> Enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full w-fit">
                          <XCircle size={12} /> Not set up
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {ps?.stripe_account_id
                        ? <span className="font-mono text-gray-600">{ps.stripe_account_id.slice(0, 14)}…</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      {ps?.stripe_enabled ? (
                        <button
                          onClick={() => onToggleMode(r)}
                          disabled={togglingModeId === r.id}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition disabled:opacity-50 ${
                            isTest
                              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {isTest ? <FlaskConical size={12} /> : <Globe size={12} />}
                          {togglingModeId === r.id ? 'Switching…' : isTest ? 'Test mode' : 'Live mode'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/restaurant/${r.slug}`}
                        target="_blank"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition w-fit"
                      >
                        <ExternalLink size={12} /> View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <h2 className="text-base font-bold text-gray-900 mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
