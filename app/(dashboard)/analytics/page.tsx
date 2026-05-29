'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Gift, ShoppingBag, ArrowUpRight, ArrowDownRight, Star, Info, Users, AlertTriangle, Target, Bell } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

type Period = 7 | 30 | 90
type NoShowPeriod = 30 | 60 | 90
type RoiPeriod = 90 | 180 | 365

interface ImpactData {
  period_days: number
  upsell: {
    revenue: number
    order_count: number
    total_orders: number
    acceptance_rate: number
    aov_with_upsell: number
    aov_without_upsell: number
    aov_lift: number
    top_items: { name: string; revenue: number; count: number }[]
  }
  loyalty: {
    total_discount_given: number
    redemption_order_count: number
    points_earned: number
    points_redeemed: number
    points_gross_redeemed: number
    points_refunded: number
    active_members: number
    member_aov: number
    guest_aov: number
    member_aov_lift: number
    member_order_count: number
    guest_order_count: number
  }
}

interface NoShowData {
  period_days: number
  total_reservations: number
  total_no_shows: number
  no_show_rate: number
  by_day_of_week: { dow: number; label: string; count: number; no_show_count: number; rate: number }[]
  by_party_size: { party_size: number; count: number; no_show_count: number; rate: number }[]
  by_time_slot: { hour: number; label: string; count: number; no_show_count: number; rate: number }[]
  repeat_offenders: { name: string; phone: string; count: number }[]
  monthly_trend: { month: string; count: number; no_show_count: number; rate: number }[]
}

interface LoyaltyNudgeData {
  enabled: boolean
  program?: { program_name: string; minimum_points_to_redeem: number; points_to_redeem: number }
  eligible_count: number
  eligible_customers: {
    id: string
    name: string
    phone: string
    email: string
    loyalty_points_balance: number
    points_needed: number
    pct_of_threshold: number
    is_redeemable: boolean
    last_seen_at: string | null
    nudge_reason: 'has_redeemable_points' | 'close_to_threshold'
  }[]
}

interface AcquisitionChannel {
  source: string
  label: string
  customer_count: number
  ordering_customers: number
  order_conversion_rate: number
  total_orders: number
  total_revenue: number
  avg_orders_per_customer: number
  avg_ltv: number
  avg_order_value: number
}

interface AcquisitionRoiData {
  period_days: number
  channels: AcquisitionChannel[]
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />
}

interface StatCardProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
  sub?: string
  trend?: { dir: 'up' | 'down'; text: string; good: boolean }
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon size={15} className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-0.5">{label}</p>
        <p className="text-[22px] font-bold leading-tight text-gray-900">{value}</p>
      </div>
      {trend && (
        <p className={`text-xs flex items-center gap-0.5 font-medium ${trend.good ? 'text-green-600' : 'text-red-500'}`}>
          {trend.dir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend.text}
        </p>
      )}
      {sub && !trend && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>(30)
  const [data, setData] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  const [noShowPeriod, setNoShowPeriod] = useState<NoShowPeriod>(90)
  const [noShowData, setNoShowData] = useState<NoShowData | null>(null)
  const [noShowLoading, setNoShowLoading] = useState(true)

  const [nudgeData, setNudgeData] = useState<LoyaltyNudgeData | null>(null)
  const [nudgeLoading, setNudgeLoading] = useState(true)

  const [roiPeriod, setRoiPeriod] = useState<RoiPeriod>(180)
  const [roiData, setRoiData] = useState<AcquisitionRoiData | null>(null)
  const [roiLoading, setRoiLoading] = useState(true)

  const load = useCallback(async (days: Period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/revenue-impact?days=${days}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const loadNoShow = useCallback(async (days: NoShowPeriod) => {
    setNoShowLoading(true)
    try {
      const res = await fetch(`/api/analytics/no-show?days=${days}`)
      if (res.ok) setNoShowData(await res.json())
    } finally {
      setNoShowLoading(false)
    }
  }, [])

  const loadNudge = useCallback(async () => {
    setNudgeLoading(true)
    try {
      const res = await fetch('/api/analytics/loyalty-nudge')
      if (res.ok) setNudgeData(await res.json())
    } finally {
      setNudgeLoading(false)
    }
  }, [])

  const loadRoi = useCallback(async (days: RoiPeriod) => {
    setRoiLoading(true)
    try {
      const res = await fetch(`/api/analytics/acquisition-roi?days=${days}`)
      if (res.ok) setRoiData(await res.json())
    } finally {
      setRoiLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])
  useEffect(() => { loadNoShow(noShowPeriod) }, [noShowPeriod, loadNoShow])
  useEffect(() => { loadNudge() }, [loadNudge])
  useEffect(() => { loadRoi(roiPeriod) }, [roiPeriod, loadRoi])

  const u = data?.upsell
  const l = data?.loyalty

  const upsellAovLiftPct = u && u.aov_without_upsell > 0
    ? Math.round(((u.aov_with_upsell - u.aov_without_upsell) / u.aov_without_upsell) * 100)
    : 0

  const memberAovLiftPct = l && l.guest_aov > 0
    ? Math.round(((l.member_aov - l.guest_aov) / l.guest_aov) * 100)
    : 0

  const redemptionRate = l && l.points_earned > 0
    ? Math.round((l.points_redeemed / l.points_earned) * 100)
    : 0

  const periodLabel = period === 7 ? 'last 7 days' : period === 30 ? 'last 30 days' : 'last 90 days'

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Impact</h1>
          <p className="text-[15px] text-gray-400 mt-0.5">
            How upselling and loyalty grew your revenue
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([7, 30, 90] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {p === 7 ? '7 days' : p === 30 ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Upsell Impact ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingUp size={14} className="text-orange-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Upsell Impact</h2>
          <span className="text-xs text-gray-400">{periodLabel}</span>
        </div>

        {/* Callout insight */}
        {!loading && u && u.total_orders > 0 && (
          <div className="mb-4 flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
            <p className="text-sm text-orange-900">
              {u.order_count > 0 ? (
                <>
                  <strong>{Math.round(u.acceptance_rate * 100)}%</strong> of completed orders included an upsell item.
                  {upsellAovLiftPct > 0 && (
                    <> Those orders averaged <strong>{formatCurrency(u.aov_with_upsell)}</strong> vs <strong>{formatCurrency(u.aov_without_upsell)}</strong> without — a <strong>{upsellAovLiftPct}% higher avg order value</strong>.</>
                  )}
                </>
              ) : (
                <>No upsell items have been accepted yet this period. Make sure upsell suggestions are enabled on your menu items.</>
              )}
            </p>
          </div>
        )}

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : u ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={TrendingUp}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              label="Extra revenue"
              value={formatCurrency(u.revenue)}
              sub={`from ${u.order_count} upsell accept${u.order_count !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={ShoppingBag}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              label="Acceptance rate"
              value={u.total_orders > 0 ? `${Math.round(u.acceptance_rate * 100)}%` : '—'}
              sub={`${u.order_count} of ${u.total_orders} orders`}
            />
            <StatCard
              icon={TrendingUp}
              iconBg="bg-green-50"
              iconColor="text-green-500"
              label="AOV with upsell"
              value={u.aov_with_upsell > 0 ? formatCurrency(u.aov_with_upsell) : '—'}
              sub={u.aov_without_upsell > 0 ? `vs ${formatCurrency(u.aov_without_upsell)} without` : undefined}
            />
            <StatCard
              icon={ArrowUpRight}
              iconBg="bg-brand-50"
              iconColor="text-brand-500"
              label="AOV lift"
              value={u.aov_lift > 0 ? `+${formatCurrency(u.aov_lift)}` : '—'}
              trend={upsellAovLiftPct > 0 ? { dir: 'up', text: `${upsellAovLiftPct}% more per order`, good: true } : undefined}
            />
          </div>
        ) : null}

        {/* Top upsell items */}
        {!loading && u && u.top_items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star size={13} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-gray-700">Top accepted upsell items</h3>
            </div>
            <div className="space-y-3">
              {u.top_items.map((item, idx) => {
                const barPct = u.top_items[0].revenue > 0
                  ? Math.round((item.revenue / u.top_items[0].revenue) * 100)
                  : 0
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-5 h-5 text-xs font-bold rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-gray-400">{item.count}×</span>
                          <span className="text-sm font-semibold text-gray-700 w-16 text-right">{formatCurrency(item.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && u && u.top_items.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            <TrendingUp size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No upsell data yet</p>
            <p className="text-sm mt-1">Upsell revenue will appear here once customers start accepting suggestions</p>
          </div>
        )}
      </section>

      {/* ── Loyalty ROI ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
            <Gift size={14} className="text-amber-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Loyalty ROI</h2>
          <span className="text-xs text-gray-400">{periodLabel}</span>
        </div>

        {/* Callout insight */}
        {!loading && l && (l.active_members > 0 || l.total_discount_given > 0) && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900">
              {l.active_members > 0 ? (
                <>
                  You gave <strong>{formatCurrency(l.total_discount_given)}</strong> in loyalty discounts across <strong>{l.redemption_order_count}</strong> order{l.redemption_order_count !== 1 ? 's' : ''}.
                  {memberAovLiftPct > 0 && l.guest_order_count > 0 && (
                    <> Loyalty members averaged <strong>{formatCurrency(l.member_aov)}</strong> per order vs <strong>{formatCurrency(l.guest_aov)}</strong> for guests — <strong>{memberAovLiftPct}% more per order</strong>, making the discount worthwhile.</>
                  )}
                  {memberAovLiftPct <= 0 && l.member_order_count > 0 && (
                    <> Keep engaging members — loyalty members spending more than guests is the key ROI signal.</>
                  )}
                </>
              ) : (
                <>No loyalty activity yet this period.</>
              )}
            </p>
          </div>
        )}

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : l ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Gift}
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
              label="Active members"
              value={String(l.active_members)}
              sub={`earned or redeemed points`}
            />
            <StatCard
              icon={ArrowDownRight}
              iconBg="bg-red-50"
              iconColor="text-red-400"
              label="Discounts given"
              value={formatCurrency(l.total_discount_given)}
              sub={`across ${l.redemption_order_count} redemption${l.redemption_order_count !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={TrendingUp}
              iconBg="bg-green-50"
              iconColor="text-green-500"
              label="Member avg order"
              value={l.member_aov > 0 ? formatCurrency(l.member_aov) : '—'}
              sub={l.member_order_count > 0 ? `${l.member_order_count} orders` : 'No member orders'}
            />
            <StatCard
              icon={ShoppingBag}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              label="Guest avg order"
              value={l.guest_aov > 0 ? formatCurrency(l.guest_aov) : '—'}
              sub={l.guest_order_count > 0 ? `${l.guest_order_count} orders` : 'No guest orders'}
            />
          </div>
        ) : null}

        {/* Points engagement */}
        {!loading && l && l.points_earned > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Points engagement</h3>
            <div className="space-y-4">

              {/* Earned */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-gray-600">Points earned</span>
                  <span className="text-sm font-semibold text-gray-800">{l.points_earned.toLocaleString()} pts</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-amber-400 rounded-full w-full" />
                </div>
              </div>

              {/* Net redeemed */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-gray-600">Points redeemed (net)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{redemptionRate}% of earned</span>
                    <span className="text-sm font-semibold text-gray-800">{l.points_redeemed.toLocaleString()} pts</span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${Math.min(100, redemptionRate)}%` }}
                  />
                </div>
              </div>

              {/* Refunded row — only show if any cancellations returned points */}
              {l.points_refunded > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-gray-400">Returned (cancelled orders)</span>
                    <span className="text-sm text-gray-400">{l.points_refunded.toLocaleString()} pts</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {l.points_gross_redeemed.toLocaleString()} pts gross redeemed − {l.points_refunded.toLocaleString()} pts refunded = {l.points_redeemed.toLocaleString()} pts net
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400 pt-1">
                {redemptionRate < 20
                  ? 'Low redemption rate — consider lowering the minimum points threshold to encourage use.'
                  : redemptionRate < 60
                  ? 'Healthy redemption rate. Members are actively using their points.'
                  : 'High redemption rate — members love the program!'}
              </p>
            </div>
          </div>
        )}

        {!loading && l && l.active_members === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            <Gift size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No loyalty activity yet</p>
            <p className="text-sm mt-1">Stats will appear once customers start earning or redeeming points</p>
          </div>
        )}
      </section>

      {/* ── No-show Patterns ── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={14} className="text-red-500" />
            </div>
            <h2 className="text-base font-bold text-gray-800">No-show Patterns</h2>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([30, 60, 90] as NoShowPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setNoShowPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${noShowPeriod === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p} days
              </button>
            ))}
          </div>
        </div>

        {noShowData && !noShowLoading && noShowData.total_reservations > 0 && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <Info size={14} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-900">
              {noShowData.no_show_rate > 0 ? (
                <>
                  <strong>{noShowData.no_show_rate}%</strong> of reservations were no-shows
                  {' '}(<strong>{noShowData.total_no_shows}</strong> of {noShowData.total_reservations}).
                  {noShowData.repeat_offenders.length > 0 && (
                    <> <strong>{noShowData.repeat_offenders.length}</strong> repeat offender{noShowData.repeat_offenders.length !== 1 ? 's' : ''} detected.</>
                  )}
                </>
              ) : (
                <>Great — no no-shows recorded in this period!</>
              )}
            </p>
          </div>
        )}

        {noShowLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : noShowData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Users}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              label="Total reservations"
              value={String(noShowData.total_reservations)}
              sub={`last ${noShowData.period_days} days`}
            />
            <StatCard
              icon={AlertTriangle}
              iconBg="bg-red-50"
              iconColor="text-red-500"
              label="No-show rate"
              value={noShowData.total_reservations > 0 ? `${noShowData.no_show_rate}%` : '—'}
              sub={`${noShowData.total_no_shows} no-shows`}
            />
            <StatCard
              icon={Users}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              label="Repeat offenders"
              value={String(noShowData.repeat_offenders.length)}
              sub="2+ no-shows"
            />
            <StatCard
              icon={Star}
              iconBg="bg-green-50"
              iconColor="text-green-500"
              label="Show-up rate"
              value={noShowData.total_reservations > 0
                ? `${Math.round((1 - noShowData.total_no_shows / noShowData.total_reservations) * 100)}%`
                : '—'}
              sub="confirmed + completed"
            />
          </div>
        ) : null}

        {!noShowLoading && noShowData && noShowData.by_day_of_week.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By day of week */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">No-show rate by day</h3>
              <div className="space-y-2.5">
                {noShowData.by_day_of_week.map(d => (
                  <div key={d.dow} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 shrink-0">{d.label.slice(0, 3)}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.rate >= 20 ? 'bg-red-400' : d.rate >= 10 ? 'bg-orange-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(100, d.rate * 3)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-10 text-right shrink-0">
                      {d.rate > 0 ? `${d.rate}%` : '—'}
                    </span>
                    <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                      {d.no_show_count}/{d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repeat offenders or time slots */}
            {noShowData.repeat_offenders.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={13} className="text-red-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Repeat no-shows</h3>
                </div>
                <div className="space-y-2.5">
                  {noShowData.repeat_offenders.map((o, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{o.name || 'Unknown'}</p>
                        {o.phone && <p className="text-xs text-gray-400">{o.phone}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        {o.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">No-show rate by time slot</h3>
                <div className="space-y-2.5">
                  {noShowData.by_time_slot.slice(0, 8).map(t => (
                    <div key={t.hour} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-14 shrink-0">{t.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.rate >= 20 ? 'bg-red-400' : t.rate >= 10 ? 'bg-orange-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(100, t.rate * 3)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-10 text-right shrink-0">
                        {t.rate > 0 ? `${t.rate}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!noShowLoading && noShowData && noShowData.total_reservations === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No reservation data yet</p>
            <p className="text-sm mt-1">No-show patterns will appear once you have reservation history</p>
          </div>
        )}
      </section>

      {/* ── Loyalty Nudge ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
            <Bell size={14} className="text-purple-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Loyalty Nudge Opportunities</h2>
        </div>

        {nudgeData && !nudgeLoading && nudgeData.enabled && nudgeData.eligible_count > 0 && (
          <div className="mb-4 flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <Info size={14} className="text-purple-500 mt-0.5 shrink-0" />
            <p className="text-sm text-purple-900">
              <strong>{nudgeData.eligible_count}</strong> customer{nudgeData.eligible_count !== 1 ? 's are' : ' is'} worth a loyalty nudge right now —
              {' '}either close to their reward threshold or holding redeemable points they haven&apos;t used in 14+ days.
            </p>
          </div>
        )}

        {nudgeLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : nudgeData?.enabled ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={Bell}
                iconBg="bg-purple-50"
                iconColor="text-purple-500"
                label="Nudge-worthy customers"
                value={String(nudgeData.eligible_count)}
                sub="close to threshold or redeemable"
              />
              <StatCard
                icon={Gift}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
                label="Already redeemable"
                value={String(nudgeData.eligible_customers.filter(c => c.is_redeemable).length)}
                sub="but haven't been in 14+ days"
              />
              <StatCard
                icon={Target}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                label="Reward threshold"
                value={nudgeData.program ? String(nudgeData.program.minimum_points_to_redeem) : '—'}
                sub={nudgeData.program?.program_name ?? 'points to redeem'}
              />
            </div>

            {nudgeData.eligible_customers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Top customers to nudge</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {nudgeData.eligible_customers.slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name || 'Unknown'}</p>
                          {c.is_redeemable && (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">READY</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{c.phone || c.email || ''}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-800">{c.loyalty_points_balance.toLocaleString()} pts</p>
                        {!c.is_redeemable && nudgeData.program && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-400 rounded-full"
                                style={{ width: `${Math.min(100, c.pct_of_threshold)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">{c.pct_of_threshold}%</span>
                          </div>
                        )}
                        {c.is_redeemable && (
                          <p className="text-[10px] text-gray-400 mt-0.5">not seen in 14+ days</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : nudgeData && !nudgeData.enabled ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">Loyalty program not enabled</p>
            <p className="text-sm mt-1">Enable your loyalty program to see nudge opportunities</p>
          </div>
        ) : null}
      </section>

      {/* ── Acquisition Channel ROI ── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
              <Target size={14} className="text-teal-600" />
            </div>
            <h2 className="text-base font-bold text-gray-800">Acquisition Channel ROI</h2>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([90, 180, 365] as RoiPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setRoiPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${roiPeriod === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p === 90 ? '90 days' : p === 180 ? '6 months' : '1 year'}
              </button>
            ))}
          </div>
        </div>

        {roiData && !roiLoading && roiData.channels.length > 0 && (() => {
          const top = roiData.channels[0]
          return (
            <div className="mb-4 flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
              <Info size={14} className="text-teal-600 mt-0.5 shrink-0" />
              <p className="text-sm text-teal-900">
                <strong>{top.label}</strong> delivers the highest lifetime value at <strong>{formatCurrency(top.avg_ltv)}</strong> avg LTV per customer
                {top.order_conversion_rate > 0 && (
                  <> with a <strong>{top.order_conversion_rate}%</strong> ordering conversion rate</>
                )}.
              </p>
            </div>
          )
        })()}

        {roiLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : roiData && roiData.channels.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {roiData.channels.slice(0, 4).map(ch => (
                <StatCard
                  key={ch.source}
                  icon={Target}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  label={ch.label}
                  value={formatCurrency(ch.avg_ltv)}
                  sub={`${ch.customer_count} customer${ch.customer_count !== 1 ? 's' : ''} · ${ch.order_conversion_rate}% ordering`}
                />
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">All channels by avg LTV</h3>
              </div>
              {/* Table header — hidden on mobile, shown on sm+ */}
              <div className="hidden sm:grid grid-cols-5 gap-2 px-5 py-2 bg-gray-50 text-xs font-medium text-gray-400">
                <span>Channel</span>
                <span className="text-right">Customers</span>
                <span className="text-right">Conversion</span>
                <span className="text-right">Avg LTV</span>
                <span className="text-right">Avg order</span>
              </div>
              <div className="divide-y divide-gray-50">
                {roiData.channels.map(ch => (
                  <div key={ch.source} className="px-5 py-3 flex sm:grid sm:grid-cols-5 sm:gap-2 items-center justify-between gap-3">
                    <div className="sm:col-span-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{ch.label}</p>
                      {/* mobile sub-line */}
                      <p className="text-xs text-gray-400 sm:hidden">
                        {ch.customer_count} customers · {ch.order_conversion_rate}% ordering
                      </p>
                    </div>
                    <span className="hidden sm:block text-sm text-gray-600 text-right">{ch.customer_count}</span>
                    <span className="hidden sm:block text-sm text-gray-600 text-right">{ch.order_conversion_rate}%</span>
                    <span className="text-sm font-semibold text-gray-800 text-right sm:text-right">{formatCurrency(ch.avg_ltv)}</span>
                    <span className="hidden sm:block text-sm text-gray-500 text-right">{formatCurrency(ch.avg_order_value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            <Target size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No acquisition data yet</p>
            <p className="text-sm mt-1">Channel ROI will appear once customers have an acquisition source and completed orders</p>
          </div>
        )}
      </section>
    </div>
  )
}
