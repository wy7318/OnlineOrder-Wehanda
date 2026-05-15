'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import {
  Search, Download, ChevronUp, ChevronDown, ChevronsUpDown,
  Filter, X, Users, MailCheck, Ban, Plus,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'
import type { CustomerWithStats, AcquisitionSource } from '@/lib/types'

const ACQUISITION_LABELS: Record<AcquisitionSource, string> = {
  organic: 'Organic', google_ad: 'Google Ad', instagram_ad: 'Instagram',
  facebook_ad: 'Facebook', referral: 'Referral', qr_code: 'QR Code',
  walk_in: 'Walk-in', loyalty_signup: 'Loyalty', other: 'Other',
}

const ACQUISITION_OPTIONS = Object.entries(ACQUISITION_LABELS).map(([value, label]) => ({ value, label }))

const PER_PAGE_OPTIONS = [
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
]

type SortField = 'name' | 'created_at' | 'last_order_at' | 'total_orders' | 'lifetime_value' | 'avg_order_value'

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: 'asc' | 'desc' }) {
  if (field !== current) return <ChevronsUpDown size={12} className="text-gray-300" />
  return dir === 'asc' ? <ChevronUp size={12} className="text-orange-500" /> : <ChevronDown size={12} className="text-orange-500" />
}

function initials(c: CustomerWithStats) {
  const n = c.first_name ? `${c.first_name} ${c.last_name ?? ''}` : c.name
  return n.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function displayName(c: CustomerWithStats) {
  return c.first_name ? `${c.first_name} ${c.last_name ?? ''}`.trim() : c.name
}

export default function CustomersPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [acqSources, setAcqSources] = useState<string[]>([])
  const [mktOptIn, setMktOptIn] = useState<'all' | 'true' | 'false'>('all')
  const [minOrders, setMinOrders] = useState('')
  const [maxOrders, setMaxOrders] = useState('')
  const [lastOrderFrom, setLastOrderFrom] = useState('')
  const [lastOrderTo, setLastOrderTo] = useState('')

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort,
      order: sortDir,
    })
    if (search.trim()) p.set('q', search.trim())
    acqSources.forEach(s => p.append('acquisition_source[]', s))
    if (mktOptIn !== 'all') p.set('marketing_opt_in', mktOptIn)
    if (minOrders) p.set('min_orders', minOrders)
    if (maxOrders) p.set('max_orders', maxOrders)
    if (lastOrderFrom) p.set('last_order_from', lastOrderFrom)
    if (lastOrderTo) p.set('last_order_to', lastOrderTo)
    return p
  }, [page, perPage, sort, sortDir, search, acqSources, mktOptIn, minOrders, maxOrders, lastOrderFrom, lastOrderTo])

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/customers?${buildParams()}`)
    if (res.ok) {
      const json = await res.json()
      setCustomers(json.data ?? [])
      setTotal(json.total ?? 0)
    }
    setLoading(false)
  }, [buildParams])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  function handleSearchChange(v: string) {
    setSearch(v)
    setPage(1)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => loadCustomers(), 400)
  }

  function handleSort(field: SortField) {
    if (sort === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  function toggleAcqSource(src: string) {
    setAcqSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src])
    setPage(1)
  }

  function clearFilters() {
    setAcqSources([])
    setMktOptIn('all')
    setMinOrders('')
    setMaxOrders('')
    setLastOrderFrom('')
    setLastOrderTo('')
    setPage(1)
  }

  const activeFilterCount = acqSources.length + (mktOptIn !== 'all' ? 1 : 0) +
    (minOrders || maxOrders ? 1 : 0) + (lastOrderFrom || lastOrderTo ? 1 : 0)

  async function handleExport() {
    setExporting(true)
    const params = buildParams()
    const res = await fetch(`/api/customers/export?${params}`)
    if (res.status === 429) {
      toast('Rate limit: wait 1 minute between exports', 'error')
    } else if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      toast('Export failed', 'error')
    }
    setExporting(false)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <>
      <Header
        title="Customers"
        subtitle={`${total.toLocaleString()} total customer${total !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Search + Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-orange-400"
          />
        </div>

        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition',
            filtersOpen || activeFilterCount > 0
              ? 'border-orange-400 bg-orange-50 text-orange-600'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <Select
          options={PER_PAGE_OPTIONS}
          value={String(perPage)}
          onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1) }}
          className="sm:w-36"
        />
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Filters</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
                <X size={12} /> Clear all
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Acquisition source */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Acquisition Source</p>
              <div className="flex flex-wrap gap-1.5">
                {ACQUISITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleAcqSource(opt.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition',
                      acqSources.includes(opt.value)
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Marketing opt-in */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Marketing Opt-In</p>
              <div className="flex gap-2">
                {(['all', 'true', 'false'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setMktOptIn(v); setPage(1) }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                      mktOptIn === v ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {v === 'all' ? 'All' : v === 'true' ? 'Opted In' : 'Opted Out'}
                  </button>
                ))}
              </div>
            </div>

            {/* Order count range */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Order Count</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" placeholder="Min"
                  value={minOrders}
                  onChange={e => { setMinOrders(e.target.value); setPage(1) }}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="number" min="0" placeholder="Max"
                  value={maxOrders}
                  onChange={e => { setMaxOrders(e.target.value); setPage(1) }}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            {/* Last order date range */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Last Order Date</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={lastOrderFrom}
                  onChange={e => { setLastOrderFrom(e.target.value); setPage(1) }}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="date"
                  value={lastOrderTo}
                  onChange={e => { setLastOrderTo(e.target.value); setPage(1) }}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No customers found</p>
            <p className="text-sm mt-1">Customers appear here after placing their first order</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700">
                      Customer <SortIcon field="name" current={sort} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700">
                      Joined <SortIcon field="created_at" current={sort} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('last_order_at')} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700">
                      Last Order <SortIcon field="last_order_at" current={sort} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('total_orders')} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700">
                      Orders <SortIcon field="total_orders" current={sort} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('lifetime_value')} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700">
                      LTV <SortIcon field="lifetime_value" current={sort} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('avg_order_value')} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700">
                      AOV <SortIcon field="avg_order_value" current={sort} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Mkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    className={cn(
                      'hover:bg-gray-50 transition cursor-pointer',
                      c.is_blocked && 'opacity-50'
                    )}
                    onClick={() => window.location.href = `/customers/${c.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(c)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {displayName(c)}
                            {c.is_blocked && <Ban size={12} className="text-red-400" />}
                          </div>
                          <div className="text-xs text-gray-400">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs text-gray-500"
                        title={new Date(c.created_at).toLocaleString()}
                      >
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="text-xs">
                        {ACQUISITION_LABELS[c.acquisition_source] ?? c.acquisition_source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.last_order_at
                        ? new Date(c.last_order_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.total_orders}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(c.lifetime_value)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(c.avg_order_value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{tag}</span>
                        ))}
                        {(c.tags ?? []).length > 3 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-md">+{c.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.marketing_opt_in
                        ? <MailCheck size={14} className="text-green-500 mx-auto" />
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <p>
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i))
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={cn(
                    'w-8 h-8 rounded-lg border text-xs transition',
                    pg === page ? 'border-orange-500 bg-orange-50 text-orange-600 font-semibold' : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {pg}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
