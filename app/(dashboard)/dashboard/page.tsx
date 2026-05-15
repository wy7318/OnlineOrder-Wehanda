'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip as ChartTooltip, Legend,
} from 'chart.js'
import {
  DollarSign, ShoppingBag, Clock, XCircle, Users, RefreshCw,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  Flame, BarChart2, UtensilsCrossed, Plus, Settings, TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend)

/* ─── types ─── */

type Period = 'today' | 'yesterday' | 'this_week'

interface QueueOrder {
  id: string
  order_number: string
  order_type: string
  status: string
  total_amount: number
  created_at: string
  item_count: number
}

interface OverviewData {
  restaurant: { id: string; name: string; daily_revenue_target: number | null }
  period: Period
  prior_label: string
  period_start: string
  period_end: string
  overview: {
    current_revenue: number
    prior_revenue: number
    current_orders: number
    prior_orders: number
    cancellations_count: number
    cancelled_revenue: number
    tip_total: number
    tip_subtotal: number
    avg_prep_minutes: number
    prior_avg_prep: number
    rolling_30d_aov: number
    new_customers: number
    new_customer_aov: number
    returning_orders: number
    channel_breakdown: { order_type: string; count: number; revenue: number }[]
    status_breakdown: { status: string; count: number }[]
    hourly_current: { hour: number; revenue: number }[]
    hourly_prior: { hour: number; revenue: number }[]
    top_items: { name: string; total_qty: number; total_revenue: number }[]
    bottom_item: { name: string; total_qty: number; total_revenue: number } | null
    low_sellthrough_7d: { name: string; total_qty: number } | null
    cancellations_last_hour: { count: number; revenue: number }
    overdue_preparing: { id: string; order_number: string; order_type: string; minutes_ago: number } | null
    avg_prep_today: number
  }
}

/* ─── helpers ─── */

function minutesAgo(isoStr: string) {
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000)
}

function pctDiff(a: number, b: number) {
  if (b === 0) return null
  return Math.round(((a - b) / b) * 100)
}

function fmtMins(mins: number) {
  if (!mins || isNaN(mins)) return '—'
  return `${Math.round(mins)} min`
}

const STATUS_COLS = [
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready for Pickup' },
] as const

const TYPE_LABEL: Record<string, string> = {
  pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-in', takeout: 'Takeout',
}

const TYPE_BADGE: Record<string, string> = {
  pickup: 'bg-blue-50 text-blue-600',
  delivery: 'bg-orange-50 text-orange-600',
  dine_in: 'bg-teal-50 text-teal-600',
  takeout: 'bg-blue-50 text-blue-600',
}

const CHANNEL_COLOR: Record<string, string> = {
  pickup: 'bg-blue-400',
  delivery: 'bg-orange-400',
  dine_in: 'bg-teal-400',
  takeout: 'bg-blue-400',
}

function queueAgeColor(status: string, mins: number): string {
  if (status === 'preparing') {
    if (mins > 25) return 'text-red-500'
    if (mins > 15) return 'text-amber-500'
    return 'text-green-600'
  }
  if (status === 'ready') {
    if (mins > 15) return 'text-red-500'
    if (mins > 8) return 'text-amber-500'
    return 'text-green-600'
  }
  if (status === 'accepted' && mins > 10) return 'text-amber-500'
  return 'text-green-600'
}

function queueAgeLabel(status: string, mins: number): string {
  if (status === 'ready') return mins === 0 ? 'just ready' : `waiting ${mins}m`
  return mins === 0 ? 'just now' : `${mins}m ago`
}

function hourLabel(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

/* ─── sub-components ─── */

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />
}

interface KpiProps {
  icon: React.ElementType
  label: string
  value: string
  valueColor?: string
  trend?: { dir: 'up' | 'down'; text: string; good: boolean }
  sub?: string
}

function KpiCard({ icon: Icon, label, value, valueColor, trend, sub }: KpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2.5">
      <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
        <Icon size={16} className="text-orange-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-[22px] font-bold leading-tight ${valueColor ?? 'text-gray-900'}`}>{value}</p>
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

/* ─── main ─── */

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData] = useState<OverviewData | null>(null)
  const [queue, setQueue] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [targetInput, setTargetInput] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const queueRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOverview = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/overview?period=${p}`)
      if (res.ok) {
        const d: OverviewData = await res.json()
        setData(d)
        if (d.restaurant.daily_revenue_target !== null) {
          setTargetInput(String(d.restaurant.daily_revenue_target))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchQueue = useCallback(async () => {
    const res = await fetch('/api/dashboard/queue')
    if (res.ok) setQueue(await res.json())
  }, [])

  useEffect(() => { fetchOverview(period) }, [period, fetchOverview])

  useEffect(() => {
    fetchQueue()
    queueRef.current = setInterval(fetchQueue, 30000)
    return () => { if (queueRef.current) clearInterval(queueRef.current) }
  }, [fetchQueue])

  const handleSaveTarget = async () => {
    const val = parseFloat(targetInput)
    if (isNaN(val) || val <= 0) return
    setSavingTarget(true)
    await fetch('/api/dashboard/overview', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_revenue_target: val }),
    })
    setSavingTarget(false)
    fetchOverview(period)
  }

  /* ─── derived ─── */
  const ov = data?.overview
  const restaurant = data?.restaurant
  const priorLabel = data?.prior_label ?? 'Prior Period'

  // Queue grouped by status
  const queueByStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = queue.filter(o => o.status === col.key)
    return acc
  }, {} as Record<string, QueueOrder[]>)

  // Alert
  let alert: { level: 'danger' | 'warning'; msg: string; orderId?: string; orderNum?: string } | null = null
  if (ov?.overdue_preparing) {
    alert = {
      level: 'danger',
      msg: `Order #${ov.overdue_preparing.order_number} (${TYPE_LABEL[ov.overdue_preparing.order_type] ?? ov.overdue_preparing.order_type}) has been preparing for ${ov.overdue_preparing.minutes_ago} min — avg prep time today is ${Math.round(ov.avg_prep_today)} min. Check kitchen.`,
      orderId: ov.overdue_preparing.id,
      orderNum: ov.overdue_preparing.order_number,
    }
  } else if ((ov?.cancellations_last_hour?.count ?? 0) >= 3) {
    alert = { level: 'warning', msg: `${ov!.cancellations_last_hour.count} cancellations in the last hour (${formatCurrency(ov!.cancellations_last_hour.revenue)} lost)` }
  } else if (ov && ov.prior_avg_prep > 0 && ov.avg_prep_today > ov.prior_avg_prep * 1.4) {
    alert = { level: 'warning', msg: `Kitchen is running slow: avg prep ${fmtMins(ov.avg_prep_today)} vs ${fmtMins(ov.prior_avg_prep)} ${priorLabel.toLowerCase()}` }
  }

  // Hourly chart
  const allHours = Array.from({ length: 24 }, (_, i) => i)
  const hourMapCurrent = Object.fromEntries((ov?.hourly_current ?? []).map(h => [h.hour, h.revenue]))
  const hourMapPrior = Object.fromEntries((ov?.hourly_prior ?? []).map(h => [h.hour, h.revenue]))
  const activeHours = allHours.filter(h => (hourMapCurrent[h] ?? 0) > 0 || (hourMapPrior[h] ?? 0) > 0)
  const periodName = period === 'today' ? 'Today' : period === 'yesterday' ? 'Yesterday' : 'This Week'
  const chartData = {
    labels: activeHours.length ? activeHours.map(hourLabel) : ['—'],
    datasets: [
      {
        label: periodName,
        data: activeHours.length ? activeHours.map(h => hourMapCurrent[h] ?? 0) : [0],
        backgroundColor: 'rgba(249,115,22,0.85)',
        borderRadius: 4,
      },
      {
        label: priorLabel,
        data: activeHours.length ? activeHours.map(h => hourMapPrior[h] ?? 0) : [0],
        backgroundColor: 'rgba(209,213,219,0.85)',
        borderRadius: 4,
      },
    ],
  }
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: import('chart.js').TooltipItem<'bar'>) =>
            `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v: number | string) => formatCurrency(Number(v)), font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  }

  // Status breakdown
  const statusMap = Object.fromEntries((ov?.status_breakdown ?? []).map(s => [s.status, s.count]))
  const completedCount = statusMap['completed'] ?? 0
  const cancelledCount = statusMap['cancelled'] ?? 0
  const inProgressCount = (statusMap['new'] ?? 0) + (statusMap['accepted'] ?? 0) + (statusMap['preparing'] ?? 0) + (statusMap['ready'] ?? 0)

  // Revenue pace
  const pacePercent = restaurant?.daily_revenue_target && ov
    ? Math.min(100, Math.round((ov.current_revenue / restaurant.daily_revenue_target) * 100))
    : null
  const projectedRevenue = (() => {
    if (!ov || !data) return 0
    const startMs = new Date(data.period_start).getTime()
    const elapsedH = (Date.now() - startMs) / 3600000
    return elapsedH > 0 ? (ov.current_revenue / elapsedH) * 24 : 0
  })()
  const currentHour = new Date().getHours()
  const landmark =
    currentHour >= 21 ? 'Evening service' :
    currentHour >= 17 ? 'Dinner rush' :
    currentHour >= 14 ? 'Lunch rush ended' :
    currentHour >= 11 ? 'Lunch rush' :
    currentHour >= 7 ? 'Morning service' : 'Opening soon'

  // Channel total
  const channelTotal = (ov?.channel_breakdown ?? []).reduce((s, c) => s + c.revenue, 0)

  // KPI computations
  const currentAov = ov && ov.current_orders > 0 ? ov.current_revenue / ov.current_orders : 0
  const aovVs30d = ov ? currentAov - ov.rolling_30d_aov : 0
  const revPct = ov ? pctDiff(ov.current_revenue, ov.prior_revenue) : null
  const ordPct = ov ? pctDiff(ov.current_orders, ov.prior_orders) : null
  const prepDiff = ov ? Math.round(ov.avg_prep_minutes - ov.prior_avg_prep) : 0
  const retentionRate = ov && ov.current_orders > 0
    ? Math.round((ov.returning_orders / ov.current_orders) * 100)
    : 0
  const tipRate = ov && ov.tip_subtotal > 0
    ? Math.round((ov.tip_total / ov.tip_subtotal) * 100)
    : 0
  const newCustPct = ov && ov.current_orders > 0
    ? Math.round((ov.new_customers / ov.current_orders) * 100)
    : 0

  // Operational insights
  const insights: { icon: string; text: string }[] = []
  if (ov) {
    // Peak hour prediction from prior data
    if (ov.hourly_prior.length > 0) {
      const peak = ov.hourly_prior.reduce((b, h) => h.revenue > b.revenue ? h : b, { hour: 0, revenue: 0 })
      if (peak.hour > currentHour) {
        insights.push({ icon: '📈', text: `Peak hour based on ${priorLabel} was ${hourLabel(peak.hour)} — prepare in advance.` })
      }
    }
    // Top velocity item
    if (ov.top_items[0]) {
      insights.push({ icon: '⭐', text: `"${ov.top_items[0].name}" is your top seller (${ov.top_items[0].total_qty} sold, ${formatCurrency(ov.top_items[0].total_revenue)}). Consider featuring it in promotions.` })
    }
    // New customer AOV vs average
    if (ov.new_customers > 0 && ov.rolling_30d_aov > 0 && ov.new_customer_aov > 0) {
      const diff = Math.round(((ov.new_customer_aov - ov.rolling_30d_aov) / ov.rolling_30d_aov) * 100)
      if (Math.abs(diff) >= 10) {
        insights.push({ icon: '👥', text: `${ov.new_customers} new customers today — avg first-order value ${formatCurrency(ov.new_customer_aov)} (${Math.abs(diff)}% ${diff > 0 ? 'above' : 'below'} your 30-day AOV).` })
      } else {
        insights.push({ icon: '👥', text: `${ov.new_customers} new customers today, avg order value ${formatCurrency(ov.new_customer_aov)}.` })
      }
    }
    // Low sellthrough
    if (ov.low_sellthrough_7d) {
      insights.push({ icon: '⚠️', text: `"${ov.low_sellthrough_7d.name}" has low sell-through (${ov.low_sellthrough_7d.total_qty} sold this week). Consider 86ing or promoting before the weekend.` })
    }
    // Cancellation insight
    if (ov.cancellations_count > 0 && ov.current_orders > 0) {
      const cxRate = Math.round((ov.cancellations_count / (ov.current_orders + ov.cancellations_count)) * 100)
      insights.push({ icon: '❌', text: `${ov.cancellations_count} cancellation${ov.cancellations_count !== 1 ? 's' : ''} this period (${cxRate}% rate, ${formatCurrency(ov.cancelled_revenue)} lost).` })
    }
    // Returning customer rate
    if (retentionRate > 0) {
      insights.push({ icon: '🔁', text: `${retentionRate}% of orders came from returning customers — ${ov.returning_orders} returning orders this period.` })
    }
  }

  /* ─── render ─── */
  return (
    <div className="space-y-6 pb-12">

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {loading ? 'Dashboard' : (restaurant?.name ?? 'Dashboard')}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {period === 'today' ? "Today's overview" : period === 'yesterday' ? 'Yesterday' : 'This week'} · live queue refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['today', 'yesterday', 'this_week'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : 'This Week'}
              </button>
            ))}
          </div>
          <Link
            href={`/restaurant/${restaurant?.id ?? '#'}`}
            target="_blank"
            className="text-xs text-orange-500 border border-orange-200 px-3 py-1.5 rounded-xl hover:bg-orange-50 transition"
          >
            View Public Page ↗
          </Link>
        </div>
      </div>

      {/* Alert bar */}
      {alert && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium ${alert.level === 'danger' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            {alert.msg}
          </div>
          {alert.orderNum && (
            <Link href="/orders" className={`shrink-0 text-xs border px-3 py-1.5 rounded-lg font-semibold transition ${alert.level === 'danger' ? 'border-red-300 hover:bg-red-100' : 'border-amber-300 hover:bg-amber-100'}`}>
              View order
            </Link>
          )}
        </div>
      )}

      {/* Live Kitchen Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Flame size={14} className="text-orange-500" />
            Live Kitchen Queue
            {queue.length > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
            )}
          </h2>
          <Link href="/orders" className="text-xs text-orange-500 hover:text-orange-600">All orders →</Link>
        </div>

        {queue.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-8 text-center text-gray-400 text-sm">
            <CheckCircle size={22} className="mx-auto mb-2 text-green-400" />
            No active orders right now
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATUS_COLS.map(col => {
              const orders = queueByStatus[col.key] ?? []
              const shown = orders.slice(0, 3)
              const extra = orders.length - shown.length
              return (
                <div key={col.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-600">{col.label}</span>
                    {orders.length > 0 && (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">{orders.length}</span>
                    )}
                  </div>
                  {/* Order cards */}
                  <div className="divide-y divide-gray-50">
                    {shown.length === 0 ? (
                      <div className="px-3 py-5 text-center text-xs text-gray-300">Empty</div>
                    ) : (
                      shown.map(o => {
                        const mins = minutesAgo(o.created_at)
                        const ageColor = queueAgeColor(o.status, mins)
                        const ageText = queueAgeLabel(o.status, mins)
                        return (
                          <div key={o.id} className="px-3 py-2.5 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-xs font-bold text-gray-800">{o.order_number}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[o.order_type] ?? 'bg-gray-100 text-gray-500'}`}>
                                {TYPE_LABEL[o.order_type] ?? o.order_type}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{o.item_count} item{o.item_count !== 1 ? 's' : ''} · {formatCurrency(o.total_amount)}</span>
                              <span className={`font-semibold ${ageColor}`}>{ageText}</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                    {extra > 0 && (
                      <div className="px-3 py-2 text-center">
                        <Link href="/orders" className="text-xs text-gray-400 hover:text-orange-500 transition">
                          +{extra} more order{extra !== 1 ? 's' : ''}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Today at a Glance */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      ) : ov ? (
        <>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Today at a glance</p>
            {/* KPI Row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <KpiCard
                icon={DollarSign}
                label="Revenue today"
                value={formatCurrency(ov.current_revenue)}
                trend={revPct !== null ? {
                  dir: revPct >= 0 ? 'up' : 'down',
                  text: `${Math.abs(revPct)}% vs ${priorLabel}`,
                  good: revPct >= 0,
                } : undefined}
              />
              <KpiCard
                icon={ShoppingBag}
                label="Orders today"
                value={String(ov.current_orders)}
                trend={ordPct !== null ? {
                  dir: ordPct >= 0 ? 'up' : 'down',
                  text: `${Math.abs(ov.current_orders - ov.prior_orders)} ${ordPct >= 0 ? 'more' : 'fewer'} than ${priorLabel}`,
                  good: ordPct >= 0,
                } : undefined}
              />
              <KpiCard
                icon={TrendingUp}
                label="Avg order value"
                value={currentAov > 0 ? formatCurrency(currentAov) : '—'}
                trend={ov.rolling_30d_aov > 0 ? {
                  dir: aovVs30d >= 0 ? 'up' : 'down',
                  text: `${formatCurrency(Math.abs(aovVs30d))} vs last 30 days`,
                  good: aovVs30d >= 0,
                } : undefined}
              />
              <KpiCard
                icon={Clock}
                label="Avg prep time"
                value={fmtMins(ov.avg_prep_minutes)}
                valueColor={ov.prior_avg_prep > 0 && ov.avg_prep_minutes > ov.prior_avg_prep * 1.2 ? 'text-amber-600' : undefined}
                trend={ov.prior_avg_prep > 0 ? {
                  dir: prepDiff >= 0 ? 'up' : 'down',
                  text: `${Math.abs(prepDiff)} min ${prepDiff >= 0 ? 'slower' : 'faster'} than ${priorLabel}`,
                  good: prepDiff < 0,
                } : undefined}
              />
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Users}
                label="New customers"
                value={String(ov.new_customers)}
                sub={ov.current_orders > 0 ? `${newCustPct}% of today's orders` : undefined}
              />
              <KpiCard
                icon={RefreshCw}
                label="Returning customers"
                value={String(ov.returning_orders)}
                trend={retentionRate > 0 ? {
                  dir: 'up',
                  text: `${retentionRate}% retention rate`,
                  good: true,
                } : undefined}
              />
              <KpiCard
                icon={XCircle}
                label="Cancellations"
                value={String(ov.cancellations_count)}
                valueColor={ov.cancellations_count > 0 ? 'text-red-600' : undefined}
                sub={ov.cancellations_count > 0 ? `${formatCurrency(ov.cancelled_revenue)} lost revenue today` : 'No cancellations'}
              />
              <KpiCard
                icon={BarChart2}
                label="Tips collected"
                value={formatCurrency(ov.tip_total)}
                sub={tipRate > 0 ? `${tipRate}% avg tip rate` : undefined}
              />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Completed', value: completedCount, color: 'text-green-600' },
              { label: 'Cancelled', value: cancelledCount, color: 'text-red-500' },
              { label: 'In Progress', value: inProgressCount, color: 'text-blue-600' },
              { label: 'Active Queue', value: queue.length, color: 'text-orange-600' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Daily revenue pace */}
          {period === 'today' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-700">Daily revenue target</h3>
                {restaurant?.daily_revenue_target ? (
                  <span className={`text-sm font-bold ${pacePercent! >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    {pacePercent}% of daily target
                  </span>
                ) : null}
              </div>

              {restaurant?.daily_revenue_target ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">
                    {formatCurrency(ov.current_revenue)} of {formatCurrency(restaurant.daily_revenue_target)} goal
                    {projectedRevenue > 0 && ` · on pace to finish at ~${formatCurrency(projectedRevenue)}`}
                  </p>
                  <div className="relative">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pacePercent! >= 100 ? 'bg-green-500' : pacePercent! >= 60 ? 'bg-orange-500' : 'bg-red-400'}`}
                        style={{ width: `${pacePercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>$0</span>
                    <span>{landmark}</span>
                    <span>Goal: {formatCurrency(restaurant.daily_revenue_target)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    placeholder="Set daily target $"
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    className="flex-1 max-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={handleSaveTarget}
                    disabled={savingTarget}
                    className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Revenue by hour + Channel mix + Status breakdown */}
          <div className="grid xl:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Revenue by hour</p>
              <p className="text-sm font-semibold text-gray-700 mb-4">
                {periodName.toUpperCase()} VS {priorLabel.toUpperCase()}
              </p>
              <div className="h-52">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              {/* Channel mix */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Channel mix</h3>
                {ov.channel_breakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {ov.channel_breakdown.map(ch => {
                      const share = channelTotal > 0 ? Math.round((ch.revenue / channelTotal) * 100) : 0
                      return (
                        <div key={ch.order_type}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-700 font-medium">{TYPE_LABEL[ch.order_type] ?? ch.order_type}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-semibold text-gray-800">{share}%</span>
                              <span>{formatCurrency(ch.revenue)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full">
                            <div className={`h-full rounded-full ${CHANNEL_COLOR[ch.order_type] ?? 'bg-gray-400'}`} style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Order status breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Order status breakdown</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-green-600">{completedCount}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-red-500">{cancelledCount}</p>
                    <p className="text-xs text-gray-400">Cancelled</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-blue-600">{inProgressCount}</p>
                    <p className="text-xs text-gray-400">In progress</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-gray-600">{statusMap['refunded'] ?? 0}</p>
                    <p className="text-xs text-gray-400">Refunded</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top items + Operational insights */}
          <div className="grid xl:grid-cols-2 gap-6">
            {/* Top items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Top selling items today</h3>
                <span className="text-xs text-gray-400">by revenue</span>
              </div>
              {ov.top_items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {ov.top_items.map((item, idx) => {
                    const isBottom = ov.bottom_item?.name === item.name
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className={`w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center shrink-0 ${isBottom ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'}`}>
                          {isBottom ? '↓' : idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isBottom ? 'text-red-600' : 'text-gray-800'}`}>{item.name}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{item.total_qty} sold</span>
                        <span className="text-sm font-semibold text-gray-700 shrink-0 w-16 text-right">{formatCurrency(item.total_revenue)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Operational insights */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Operational insights</h3>
              {insights.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Not enough data yet.</p>
              ) : (
                <ul className="space-y-3.5">
                  {insights.slice(0, 5).map((ins, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="text-base shrink-0 leading-tight">{ins.icon}</span>
                      <span>{ins.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/menu/items', label: 'Add Menu Item', icon: Plus },
                { href: '/orders', label: 'View Orders', icon: ShoppingBag },
                { href: '/reservations', label: 'Reservations', icon: UtensilsCrossed },
                { href: '/setup', label: 'Settings', icon: Settings },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition group text-sm"
                >
                  <div className="w-8 h-8 bg-orange-50 group-hover:bg-orange-100 rounded-lg flex items-center justify-center transition">
                    <a.icon size={15} className="text-orange-500" />
                  </div>
                  <span className="font-medium text-gray-700 text-sm">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
