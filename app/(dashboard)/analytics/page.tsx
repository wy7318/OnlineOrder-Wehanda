'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Gift, ShoppingBag, ArrowUpRight, ArrowDownRight, Star, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

type Period = 7 | 30 | 90

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

  const load = useCallback(async (days: Period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/revenue-impact?days=${days}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])

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
    </div>
  )
}
