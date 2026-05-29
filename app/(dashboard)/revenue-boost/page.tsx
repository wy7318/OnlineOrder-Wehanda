'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Zap, ShoppingCart, AlertTriangle, Gift, TrendingDown,
  Mail, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  Eye, BarChart2, Loader2, TrendingUp, MousePointerClick,
  ShoppingBag, DollarSign,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

// ── Types ────────────────────────────────────────────────────────────────────

interface CartRecoveryItem {
  cart_id: string
  customer_id: string
  customer_name: string
  email: string | null
  phone: string | null
  item_count: number
  items: { name: string; quantity: number }[]
  hours_ago: number
  recently_messaged: boolean
}

interface WinBackItem {
  customer_id: string
  customer_name: string
  email: string | null
  churn_risk_score: number
  segment_ai_label: string | null
  last_seen_at: string | null
  days_since_seen: number | null
  recently_messaged: boolean
}

interface NudgeCustomer {
  id: string
  name: string
  email: string | null
  phone: string | null
  loyalty_points_balance: number
  points_needed: number
  pct_of_threshold: number
  is_redeemable: boolean
  nudge_reason: 'has_redeemable_points' | 'close_to_threshold'
}

interface MenuInsightItem {
  id: string
  name: string
  price: number
  view_count: number
  order_count: number
  conversion_rate: number
  ai_tip: string | null
}

interface OpportunitiesData {
  restaurant_name: string
  cart_recovery: CartRecoveryItem[]
  win_back: WinBackItem[]
}

interface NudgeData {
  enabled: boolean
  eligible_count: number
  eligible_customers: NudgeCustomer[]
}

interface MenuInsightsData {
  has_data: boolean
  items: MenuInsightItem[]
  window_days: number
}

interface CampaignResult {
  label: string
  campaign_type: string
  sent: number
  clicks: number
  orders: number
  revenue: number
  last_run: string
}

interface CampaignResultsData {
  campaigns: CampaignResult[]
  totals: { sent: number; orders: number; revenue: number }
  window_days: number
}

type SendState = 'idle' | 'sending' | 'sent' | 'failed' | 'already_sent'
type ResultWindow = '7' | '30' | '90'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className ?? ''}`} />
}

function SendButton({
  state,
  onClick,
  disabled,
}: {
  state: SendState
  onClick: () => void
  disabled?: boolean
}) {
  if (state === 'sending') {
    return (
      <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium">
        <Loader2 size={12} className="animate-spin" />
        Sending…
      </button>
    )
  }
  if (state === 'sent' || state === 'already_sent') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium">
        <CheckCircle size={12} />
        {state === 'already_sent' ? 'Sent recently' : 'Sent!'}
      </span>
    )
  }
  if (state === 'failed') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition"
      >
        <XCircle size={12} />
        Retry
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Mail size={12} />
      Send email now
    </button>
  )
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-400' : 'bg-yellow-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-8 shrink-0">{score}%</span>
    </div>
  )
}

const SEGMENT_LABELS: Record<string, string> = {
  at_risk: 'At Risk', hibernating: 'Hibernating', lost: 'Lost',
  needs_attention: 'Needs Attention', one_time: 'One-time',
}

const CAMPAIGN_EMOJI: Record<string, string> = {
  birthday: '🎂',
  after_order: '🍽️',
  new_item_launch: '✨',
  quiet_day: '☕',
  milestone: '🎉',
  win_back: '💙',
  cart_recovery: '🛒',
  loyalty_nudge: '⭐',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RevenueBoostPage() {
  const [opData, setOpData] = useState<OpportunitiesData | null>(null)
  const [opLoading, setOpLoading] = useState(true)

  const [nudgeData, setNudgeData] = useState<NudgeData | null>(null)
  const [nudgeLoading, setNudgeLoading] = useState(true)

  const [menuData, setMenuData] = useState<MenuInsightsData | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)

  const [resultsData, setResultsData] = useState<CampaignResultsData | null>(null)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [resultWindow, setResultWindow] = useState<ResultWindow>('30')
  const [resultsExpanded, setResultsExpanded] = useState(true)

  // Send state maps: customer_id → SendState
  const [cartStates, setCartStates] = useState<Record<string, SendState>>({})
  const [winBackStates, setWinBackStates] = useState<Record<string, SendState>>({})
  const [nudgeStates, setNudgeStates] = useState<Record<string, SendState>>({})

  // Collapsed sections
  const [cartExpanded, setCartExpanded] = useState(true)
  const [winBackExpanded, setWinBackExpanded] = useState(true)
  const [nudgeExpanded, setNudgeExpanded] = useState(true)

  const loadOpportunities = useCallback(async () => {
    setOpLoading(true)
    try {
      const res = await fetch('/api/ai/opportunities')
      if (res.ok) {
        const data: OpportunitiesData = await res.json()
        setOpData(data)
        const cs: Record<string, SendState> = {}
        for (const c of data.cart_recovery) if (c.recently_messaged) cs[c.customer_id] = 'already_sent'
        setCartStates(cs)
        const ws: Record<string, SendState> = {}
        for (const c of data.win_back) if (c.recently_messaged) ws[c.customer_id] = 'already_sent'
        setWinBackStates(ws)
      }
    } finally { setOpLoading(false) }
  }, [])

  const loadNudge = useCallback(async () => {
    setNudgeLoading(true)
    try {
      const res = await fetch('/api/analytics/loyalty-nudge')
      if (res.ok) setNudgeData(await res.json())
    } finally { setNudgeLoading(false) }
  }, [])

  const loadMenuInsights = useCallback(async () => {
    setMenuLoading(true)
    try {
      const res = await fetch('/api/ai/menu-insights')
      if (res.ok) setMenuData(await res.json())
    } finally { setMenuLoading(false) }
  }, [])

  const loadResults = useCallback(async (days: ResultWindow) => {
    setResultsLoading(true)
    try {
      const res = await fetch(`/api/ai/campaign-results?days=${days}`)
      if (res.ok) setResultsData(await res.json())
    } finally { setResultsLoading(false) }
  }, [])

  useEffect(() => {
    loadOpportunities()
    loadNudge()
    loadMenuInsights()
    loadResults(resultWindow)
  }, [loadOpportunities, loadNudge, loadMenuInsights, loadResults, resultWindow])

  async function sendCartRecovery(cart_id: string, customer_id: string) {
    setCartStates(s => ({ ...s, [customer_id]: 'sending' }))
    try {
      const res = await fetch('/api/ai/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id, cart_id }),
      })
      const json = await res.json()
      setCartStates(s => ({ ...s, [customer_id]: json.already_sent ? 'already_sent' : res.ok ? 'sent' : 'failed' }))
    } catch {
      setCartStates(s => ({ ...s, [customer_id]: 'failed' }))
    }
  }

  async function sendWinBack(customer_id: string) {
    setWinBackStates(s => ({ ...s, [customer_id]: 'sending' }))
    try {
      const res = await fetch('/api/ai/win-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id }),
      })
      const json = await res.json()
      setWinBackStates(s => ({ ...s, [customer_id]: json.already_sent ? 'already_sent' : res.ok ? 'sent' : 'failed' }))
    } catch {
      setWinBackStates(s => ({ ...s, [customer_id]: 'failed' }))
    }
  }

  async function sendNudge(customer_id: string) {
    setNudgeStates(s => ({ ...s, [customer_id]: 'sending' }))
    try {
      const res = await fetch('/api/ai/loyalty-nudge-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id }),
      })
      const json = await res.json()
      setNudgeStates(s => ({ ...s, [customer_id]: json.already_sent ? 'already_sent' : res.ok ? 'sent' : 'failed' }))
    } catch {
      setNudgeStates(s => ({ ...s, [customer_id]: 'failed' }))
    }
  }

  const totalOpportunities = (opData?.cart_recovery.length ?? 0)
    + (opData?.win_back.length ?? 0)
    + (nudgeData?.eligible_count ?? 0)

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue Boost</h1>
            <p className="text-[13px] text-gray-400">AI emails that bring customers back — sent automatically or on demand</p>
          </div>
          {!opLoading && totalOpportunities > 0 && (
            <span className="ml-auto shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-brand-500 text-white">
              {totalOpportunities} to act on
            </span>
          )}
        </div>
      </div>

      {/* ── What's Working (Campaign Results) ── */}
      <section>
        <button
          className="w-full flex items-center gap-2 mb-4"
          onClick={() => setResultsExpanded(e => !e)}
        >
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={14} className="text-green-600" />
          </div>
          <h2 className="text-base font-bold text-gray-800 flex-1 text-left">What's working</h2>
          <span className="text-[11px] text-gray-400 font-medium">Revenue your AI emails brought in</span>
          {resultsExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {resultsExpanded && (
          <>
            {/* Window tabs */}
            <div className="flex gap-1.5 mb-4">
              {(['7', '30', '90'] as ResultWindow[]).map(d => (
                <button
                  key={d}
                  onClick={() => { setResultWindow(d); loadResults(d) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    resultWindow === d
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {d === '7' ? 'Last 7 days' : d === '30' ? 'Last 30 days' : 'Last 90 days'}
                </button>
              ))}
            </div>

            {resultsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !resultsData?.campaigns.length ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <TrendingUp size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No campaign emails sent yet in this period</p>
                <p className="text-xs text-gray-400 mt-1">Turn on automations in Restaurant Setup, or send emails from the sections below</p>
              </div>
            ) : (
              <>
                {/* Summary totals */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Mail size={12} className="text-gray-400" />
                      <p className="text-[11px] text-gray-400 font-medium">Emails sent</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{resultsData.totals.sent.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <ShoppingBag size={12} className="text-gray-400" />
                      <p className="text-[11px] text-gray-400 font-medium">Orders driven</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{resultsData.totals.orders.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <DollarSign size={12} className="text-gray-400" />
                      <p className="text-[11px] text-gray-400 font-medium">Revenue earned</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(resultsData.totals.revenue)}</p>
                  </div>
                </div>

                {/* Per-campaign breakdown */}
                <div className="space-y-2">
                  {resultsData.campaigns.map(c => (
                    <div key={c.campaign_type} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{CAMPAIGN_EMOJI[c.campaign_type] ?? '📧'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{c.label}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail size={10} />
                              {c.sent.toLocaleString()} sent
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <MousePointerClick size={10} />
                              {c.clicks.toLocaleString()} clicked
                            </span>
                            {c.orders > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <ShoppingBag size={10} />
                                {c.orders} orders
                              </span>
                            )}
                          </div>
                        </div>
                        {c.revenue > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-green-600">{formatCurrency(c.revenue)}</p>
                            <p className="text-[10px] text-gray-400">attributed</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* ── Cart Recovery ── */}
      <section>
        <button
          className="w-full flex items-center gap-2 mb-4"
          onClick={() => setCartExpanded(e => !e)}
        >
          <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
            <ShoppingCart size={14} className="text-orange-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800 flex-1 text-left">Left without ordering</h2>
          {!opLoading && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              {opData?.cart_recovery.length ?? 0} customers
            </span>
          )}
          {cartExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {cartExpanded && (
          opLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : !opData?.cart_recovery.length ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <ShoppingCart size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">Everyone who started an order finished it — nice!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {opData.cart_recovery.map(c => (
                <div key={c.customer_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-semibold text-gray-900">{c.customer_name}</p>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {c.hours_ago < 24 ? `${c.hours_ago}h ago` : `${Math.floor(c.hours_ago / 24)}d ago`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {c.items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
                        {c.item_count > 3 && ` +${c.item_count - 3} more`}
                      </p>
                      {!c.email && (
                        <p className="text-[11px] text-red-400 mt-1">No email saved for this customer</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <SendButton
                        state={cartStates[c.customer_id] ?? 'idle'}
                        onClick={() => sendCartRecovery(c.cart_id, c.customer_id)}
                        disabled={!c.email}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Win-back Campaigns ── */}
      <section>
        <button
          className="w-full flex items-center gap-2 mb-4"
          onClick={() => setWinBackExpanded(e => !e)}
        >
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle size={14} className="text-red-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800 flex-1 text-left">Customers drifting away</h2>
          {!opLoading && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {opData?.win_back.length ?? 0} customers
            </span>
          )}
          {winBackExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {winBackExpanded && (
          opLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : !opData?.win_back.length ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <AlertTriangle size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">Your regulars are all still coming back!</p>
              <p className="text-xs text-gray-400 mt-1">Customers who haven't visited in a long time will show up here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {opData.win_back.map(c => (
                <div key={c.customer_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-semibold text-gray-900">{c.customer_name}</p>
                        {c.segment_ai_label && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                            {SEGMENT_LABELS[c.segment_ai_label] ?? c.segment_ai_label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {c.days_since_seen != null ? `Last seen ${c.days_since_seen} days ago` : 'Last visit unknown'}
                      </p>
                      <div className="mt-2 max-w-[180px]">
                        <p className="text-[10px] text-gray-400 mb-1">Chance of not coming back</p>
                        <RiskBar score={c.churn_risk_score} />
                      </div>
                      {!c.email && (
                        <p className="text-[11px] text-red-400 mt-1">No email saved for this customer</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <SendButton
                        state={winBackStates[c.customer_id] ?? 'idle'}
                        onClick={() => sendWinBack(c.customer_id)}
                        disabled={!c.email}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Loyalty Nudge ── */}
      <section>
        <button
          className="w-full flex items-center gap-2 mb-4"
          onClick={() => setNudgeExpanded(e => !e)}
        >
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <Gift size={14} className="text-amber-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800 flex-1 text-left">Close to a free reward</h2>
          {!nudgeLoading && nudgeData?.enabled && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {nudgeData.eligible_count} customers
            </span>
          )}
          {nudgeExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {nudgeExpanded && (
          nudgeLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !nudgeData?.enabled ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Gift size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">You haven't turned on your loyalty rewards yet</p>
              <p className="text-xs text-gray-400 mt-1">Set it up in Restaurant Setup to start rewarding customers</p>
            </div>
          ) : nudgeData.eligible_count === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Gift size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No one is close to a reward right now</p>
              <p className="text-xs text-gray-400 mt-1">Check back as customers earn more points</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nudgeData.eligible_customers.slice(0, 20).map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-semibold text-gray-900">{c.name || 'Unknown'}</p>
                        {c.is_redeemable ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">READY</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">{c.pct_of_threshold}% to reward</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.loyalty_points_balance.toLocaleString()} pts
                        {!c.is_redeemable && c.points_needed > 0 && ` · ${c.points_needed} more needed`}
                      </p>
                      {!c.email && (
                        <p className="text-[11px] text-red-400 mt-1">No email saved for this customer</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <SendButton
                        state={nudgeStates[c.id] ?? 'idle'}
                        onClick={() => sendNudge(c.id)}
                        disabled={!c.email}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Menu Insights ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <TrendingDown size={14} className="text-blue-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800 flex-1">Menu items people look at but don't order</h2>
          {menuLoading && <Loader2 size={14} className="text-gray-300 animate-spin shrink-0" />}
        </div>

        <p className="text-xs text-gray-400 mb-4 -mt-2">
          Customers are curious about these dishes but something's stopping them — here's what to try
        </p>

        {menuLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : !menuData?.has_data || menuData.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Eye size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Not enough activity yet to show suggestions</p>
            <p className="text-xs text-gray-400 mt-1">
              Once more customers browse your menu, we'll show you which dishes need attention
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuData.items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <BarChart2 size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[15px] font-semibold text-gray-900">{item.name}</p>
                      <span className="text-xs font-medium text-gray-500">{formatCurrency(item.price)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Eye size={10} />
                        {item.view_count} people looked
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.order_count} ordered
                      </span>
                      <span className={`text-xs font-semibold ${item.conversion_rate < 10 ? 'text-red-500' : item.conversion_rate < 20 ? 'text-orange-500' : 'text-green-600'}`}>
                        only {item.conversion_rate}% bought it
                      </span>
                    </div>
                    {item.ai_tip && (
                      <div className="mt-2.5 flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                        <Zap size={12} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-900 leading-relaxed">💡 {item.ai_tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
