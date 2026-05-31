'use client'
import { useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Zap, Users, Globe, Settings,
  ShoppingBag, DollarSign, TrendingUp, Clock, ArrowUpRight, ArrowDownRight,
  Check, X, ChevronRight, Loader2, Mail, Eye, BarChart2, Flame,
} from 'lucide-react'
import {
  INITIAL_ORDERS, DEMO_CUSTOMERS, DEMO_CAMPAIGNS, CANNED_AI_WEBSITE, CANNED_AI_EMAILS,
  HOURLY_REVENUE, HOURLY_LABELS, type DemoOrder, type OrderStatus,
} from './demoData'

type Section = 'dashboard' | 'orders' | 'boost' | 'customers' | 'website' | 'analytics'

function fmt(n: number) { return `$${n.toFixed(2)}` }

const STATUS_NEXT: Record<OrderStatus, { label: string; next: OrderStatus | 'done' }> = {
  new:       { label: 'Accept Order',   next: 'accepted' },
  accepted:  { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready',     next: 'ready' },
  ready:     { label: 'Complete ✓',     next: 'done' },
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: 'bg-blue-50 border-blue-200 text-blue-700',
  accepted: 'bg-amber-50 border-amber-200 text-amber-700',
  preparing: 'bg-brand-50 border-brand-200 text-brand-700',
  ready: 'bg-green-50 border-green-200 text-green-700',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready',
}

// ── Sections ─────────────────────────────────────────────────────────────────

function DashboardSection() {
  const kpis = [
    { icon: DollarSign, label: 'Revenue Today', value: '$1,247', trend: '+18%', up: true },
    { icon: ShoppingBag, label: 'Orders Today', value: '23', trend: '+5 vs yesterday', up: true },
    { icon: TrendingUp, label: 'Avg Order Value', value: '$54.20', trend: '+$3.40', up: true },
    { icon: Clock, label: 'Avg Prep Time', value: '18 min', trend: '-2 min', up: true },
  ]

  return (
    <div className="p-5 sm:p-7 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Good afternoon, Sakura Kitchen 👋</h1>
          <p className="text-sm text-gray-500">Here's how today is going.</p>
        </div>
        <div className="flex gap-2">
          {(['Today', 'Yesterday', 'This Week'] as const).map((p, i) => (
            <button key={p} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${i === 0 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
            <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
              <k.icon size={16} className="text-brand-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{k.label}</p>
              <p className="text-xl font-bold text-gray-900">{k.value}</p>
            </div>
            <p className={`text-xs flex items-center gap-0.5 font-medium ${k.up ? 'text-green-600' : 'text-red-500'}`}>
              {k.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{k.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-800 text-sm">Revenue by Hour</p>
          <p className="text-xs text-gray-400">Today vs Yesterday</p>
        </div>
        <div className="flex items-end gap-1 h-20">
          {HOURLY_REVENUE.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full bg-brand-400 rounded-t-sm" style={{ height: `${h}%`, opacity: 0.7 + (i / 60) }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {[0, 3, 6, 9, 11].map(i => (
            <span key={i} className="text-[9px] text-gray-400">{HOURLY_LABELS[i]}</span>
          ))}
        </div>
      </div>

      {/* Two-column: top items + channel breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
            <Flame size={14} className="text-amber-500" /> Top Items Today
          </p>
          {[
            { name: 'Dragon Roll', qty: 12 },
            { name: 'Tonkotsu Ramen', qty: 9 },
            { name: 'Salmon Sashimi', qty: 7 },
          ].map(item => (
            <div key={item.name} className="mb-2.5">
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>{item.name}</span><span>{item.qty}×</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(item.qty / 12) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="font-semibold text-gray-800 text-sm mb-3">Order Channels</p>
          {[
            { label: 'Pickup', count: 14, pct: 61, color: 'bg-blue-400' },
            { label: 'Dine In', count: 6, pct: 26, color: 'bg-teal-400' },
            { label: 'Delivery', count: 3, pct: 13, color: 'bg-brand-400' },
          ].map(c => (
            <div key={c.label} className="mb-2.5">
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>{c.label}</span><span>{c.count} orders · {c.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OrdersSection() {
  const [orders, setOrders] = useState<DemoOrder[]>(INITIAL_ORDERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function advance(id: string) {
    const order = orders.find(o => o.id === id)!
    const { next } = STATUS_NEXT[order.status]
    if (next === 'done') {
      setOrders(prev => prev.filter(o => o.id !== id))
      showToast(`${order.orderNumber} completed ✓`)
      setSelectedId(null)
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next as OrderStatus } : o))
      showToast(`${order.orderNumber} → ${STATUS_LABEL[next as OrderStatus]}`)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const cols: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready']

  return (
    <div className="p-5 sm:p-7 overflow-y-auto h-full relative">
      {toast && (
        <div className="absolute top-4 right-4 z-10 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Live Order Queue</h1>
          <p className="text-sm text-gray-500">Click an order to accept or advance its status.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse block" />Live
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cols.map(status => {
          const colOrders = orders.filter(o => o.status === status)
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{STATUS_LABEL[status]}</p>
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{colOrders.length}</span>
              </div>
              <div className="space-y-2">
                {colOrders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}
                    className={`w-full text-left rounded-xl border p-3 transition cursor-pointer ${STATUS_COLOR[o.status]} ${selectedId === o.id ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
                  >
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>{o.orderNumber}</span>
                      <span className="font-normal text-gray-500">{o.minsAgo === 0 ? 'now' : `${o.minsAgo}m`}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-1">{o.customer} · {o.type}</p>
                    <p className="text-[10px] text-gray-700 leading-tight truncate">{o.items}</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{fmt(o.total)}</p>

                    {selectedId === o.id && (
                      <button
                        onClick={e => { e.stopPropagation(); advance(o.id) }}
                        className="mt-2 w-full bg-gray-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-brand-600 transition"
                      >
                        {STATUS_NEXT[o.status].label}
                      </button>
                    )}
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-300">No orders</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RevenueBoostSection() {
  const [previewCampaign, setPreviewCampaign] = useState<string | null>(null)

  const preview = previewCampaign ? CANNED_AI_EMAILS[previewCampaign] : null
  const totalRevenue = DEMO_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0)
  const totalSent = DEMO_CAMPAIGNS.reduce((s, c) => s + c.sent, 0)
  const totalClicked = DEMO_CAMPAIGNS.reduce((s, c) => s + c.clicked, 0)

  return (
    <div className="p-5 sm:p-7 overflow-y-auto h-full">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">Revenue Boost</h1>
        <p className="text-sm text-gray-500">AI campaigns running automatically for your restaurant.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Emails Sent', value: totalSent, color: 'text-brand-500' },
          { label: 'Clicks', value: totalClicked, color: 'text-blue-600' },
          { label: 'Revenue', value: `$${totalRevenue}`, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {DEMO_CAMPAIGNS.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{c.sent} sent · {c.clicked} clicked{c.revenue > 0 ? ` · $${c.revenue} attributed` : ''}</p>
              </div>
              <button
                onClick={() => setPreviewCampaign(c.id)}
                className="flex items-center gap-1.5 text-brand-500 hover:text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-50 transition"
              >
                <Eye size={13} /> Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Email preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Email Preview</p>
                <h3 className="font-bold text-gray-900 text-sm">{preview.subject}</h3>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 bg-gray-50">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-brand-500 px-5 py-4">
                  <p className="font-bold text-white">Sakura Kitchen</p>
                  <p className="text-white/60 text-xs">A message just for you</p>
                </div>
                <div className="p-5">
                  <p className="font-semibold text-gray-900 mb-3">Hi Sarah 👋</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5">{preview.body}</p>
                  <div className="bg-brand-500 rounded-xl px-5 py-3 text-center">
                    <span className="text-white font-bold text-sm">Order Now →</span>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">Sent by <strong>Sakura Kitchen</strong> via Wehanda</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3 italic">
                Demo mode — AI personalizes each email per recipient in production.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomersSection() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="p-5 sm:p-7 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">AI-scored segments update daily.</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          {DEMO_CUSTOMERS.length} customers
        </div>
      </div>

      <div className="space-y-2">
        {DEMO_CUSTOMERS.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.badgeClass}`}>{c.badge}</span>
                </div>
                <p className="text-xs text-gray-400">{c.orders} orders · {c.pts.toLocaleString()} pts · Last: {c.last}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{c.spent}</p>
                <p className="text-[10px] text-gray-400">lifetime</p>
              </div>
            </button>
            {expanded === c.id && (
              <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-base font-black text-gray-900">{c.orders}</p>
                    <p className="text-[10px] text-gray-400">Orders</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-base font-black text-gray-900">{c.pts.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">Points</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${c.risk > 60 ? 'bg-red-50' : c.risk > 30 ? 'bg-amber-50' : 'bg-green-50'}`}>
                    <p className={`text-base font-black ${c.risk > 60 ? 'text-red-600' : c.risk > 30 ? 'text-amber-600' : 'text-green-600'}`}>{c.risk}%</p>
                    <p className="text-[10px] text-gray-400">Churn Risk</p>
                  </div>
                </div>
                <button className="w-full text-brand-500 border border-brand-200 hover:bg-brand-50 text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1.5">
                  <Mail size={12} /> Send Win-Back Campaign
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function WebsiteSection() {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [fields, setFields] = useState({
    hero_headline: '',
    hero_subheadline: '',
    about_title: '',
    about_body: '',
    seo_meta_description: '',
    seo_keywords: '',
  })

  function generate() {
    setGenerating(true)
    setTimeout(() => {
      setFields(CANNED_AI_WEBSITE)
      setGenerating(false)
      setGenerated(true)
    }, 2000)
  }

  return (
    <div className="p-5 sm:p-7 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Website Content</h1>
          <p className="text-sm text-gray-500">AI writes SEO-optimized copy based on your menu and customers.</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
        >
          {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><span>✨</span> Generate with AI</>}
        </button>
      </div>

      {generated && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-green-700">
          <Check size={15} /> AI content generated · Demo mode — same output each time
        </div>
      )}

      <div className="space-y-4">
        {[
          { key: 'hero_headline', label: 'Hero Headline', rows: 1 },
          { key: 'hero_subheadline', label: 'Hero Subheadline', rows: 2 },
          { key: 'about_title', label: 'About Title', rows: 1 },
          { key: 'about_body', label: 'About Body', rows: 4 },
          { key: 'seo_meta_description', label: 'SEO Meta Description', rows: 2 },
          { key: 'seo_keywords', label: 'SEO Keywords', rows: 2 },
        ].map(f => (
          <div key={f.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">{f.label}</label>
            <textarea
              rows={f.rows}
              value={fields[f.key as keyof typeof fields]}
              onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={generating ? 'Generating…' : 'Click "Generate with AI" to fill automatically'}
              className="w-full text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none placeholder-gray-300"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl text-sm transition">
          Save Changes
        </button>
        <button className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
          Preview Website
        </button>
      </div>
    </div>
  )
}

function AnalyticsSection() {
  const weeks = ['Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 29']
  const weeklyRevenue = [4820, 5340, 4980, 6210, 5890]
  const max = Math.max(...weeklyRevenue)

  return (
    <div className="p-5 sm:p-7 overflow-y-auto h-full">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">30-day performance overview.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Revenue', value: '$27,240', sub: 'Last 30 days', color: 'text-brand-500' },
          { label: 'Total Orders', value: '512', sub: '17/day avg', color: 'text-blue-600' },
          { label: 'New Customers', value: '68', sub: 'vs 54 prior month', color: 'text-green-600' },
          { label: 'Repeat Rate', value: '62%', sub: 'High loyalty', color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">{s.label}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="font-semibold text-gray-800 text-sm mb-4">Weekly Revenue</p>
        <div className="flex items-end gap-4 h-28">
          {weeklyRevenue.map((r, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <p className="text-[9px] text-gray-400 font-medium">${(r / 1000).toFixed(1)}k</p>
              <div className="w-full bg-brand-400 rounded-t-lg" style={{ height: `${(r / max) * 100}%`, opacity: 0.6 + (i / 10) }} />
              <p className="text-[9px] text-gray-400">{weeks[i]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
          <BarChart2 size={14} className="text-brand-500" /> Revenue Boost ROI
        </p>
        {[
          { label: 'Win-Back campaigns', revenue: 127, sent: 8 },
          { label: 'Cart Recovery', revenue: 84, sent: 6 },
          { label: 'Quiet Day Boost', revenue: 46, sent: 2 },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{r.label}</p>
              <p className="text-xs text-gray-400">{r.sent} campaigns sent</p>
            </div>
            <p className="font-bold text-green-600">${r.revenue} earned</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'boost', label: 'Revenue Boost', icon: Zap },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
]

export default function OwnerDemo() {
  const [section, setSection] = useState<Section>('dashboard')

  return (
    <div className="flex h-full min-h-[600px] bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 shrink-0 flex flex-col hidden sm:flex">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
              <ShoppingBag size={13} className="text-white" />
            </div>
            <span className="font-bold text-white">Wehanda</span>
          </div>
        </div>
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="bg-gray-800 rounded-xl px-3 py-2">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Managing</p>
            <p className="text-sm font-semibold text-white truncate">Sakura Kitchen</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                section === item.id ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-gray-800">
          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <Settings size={16} /> Restaurant Setup
          </button>
        </div>
      </aside>

      {/* Mobile section tabs */}
      <div className="sm:hidden absolute top-[60px] inset-x-0 z-10 bg-white border-b border-gray-100 px-3 py-2 flex gap-1.5 overflow-x-auto">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              section === item.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <item.icon size={12} />{item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {section === 'dashboard' && <DashboardSection />}
        {section === 'orders' && <OrdersSection />}
        {section === 'boost' && <RevenueBoostSection />}
        {section === 'customers' && <CustomersSection />}
        {section === 'website' && <WebsiteSection />}
        {section === 'analytics' && <AnalyticsSection />}
      </div>
    </div>
  )
}
