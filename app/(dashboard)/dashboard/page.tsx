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
  CalendarDays, CalendarCheck2, CalendarClock, UserCheck, Send,
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
  restaurant: { id: string; name: string; slug: string; daily_revenue_target: number | null }
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

interface ReservationSummary {
  id: string
  customer_name: string
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  status: string
  notes: string | null
}

interface ReservationStats {
  today_total: number
  today_confirmed: number
  today_pending: number
  today_no_show: number
  today_covers: number
  this_week_total: number
  this_week_covers: number
  next_7_days: { date: string; count: number; covers: number }[]
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
  delivery: 'bg-brand-50 text-brand-600',
  dine_in: 'bg-teal-50 text-teal-600',
  takeout: 'bg-blue-50 text-blue-600',
}

const CHANNEL_COLOR: Record<string, string> = {
  pickup: 'bg-blue-400',
  delivery: 'bg-brand-400',
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
      <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
        <Icon size={16} className="text-brand-500" />
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-0.5">{label}</p>
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
  const [todayRes, setTodayRes] = useState<ReservationSummary[]>([])
  const [resStats, setResStats] = useState<ReservationStats | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportResult, setReportResult] = useState<{ ok: boolean; msg: string } | null>(null)
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

  const fetchReservations = useCallback(async () => {
    const res = await fetch('/api/dashboard/reservations')
    if (res.ok) {
      const d = await res.json()
      setTodayRes(d.today ?? [])
      setResStats(d.stats ?? null)
    }
  }, [])

  useEffect(() => { fetchOverview(period) }, [period, fetchOverview])

  useEffect(() => {
    fetchQueue()
    fetchReservations()
    fetch('/api/user/role')
      .then(r => r.json())
      .then(d => setIsPlatformAdmin(d.role === 'platform_admin'))
      .catch(() => {})
    queueRef.current = setInterval(fetchQueue, 30000)
    return () => { if (queueRef.current) clearInterval(queueRef.current) }
  }, [fetchQueue, fetchReservations])

  const handleSendReport = async () => {
    if (!restaurant?.id || reportSending) return
    setReportSending(true)
    setReportResult(null)
    try {
      const res = await fetch('/api/admin/send-monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurant.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setReportResult({ ok: true, msg: `Sent to ${json.email} (${json.period})` })
      } else {
        setReportResult({ ok: false, msg: json.error ?? 'Failed to send' })
      }
    } catch {
      setReportResult({ ok: false, msg: 'Network error' })
    } finally {
      setReportSending(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? 'Dashboard' : (restaurant?.name ?? 'Dashboard')}
          </h1>
          <p className="text-[15px] text-gray-400 mt-0.5">
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
            href={`/restaurant/${restaurant?.slug ?? '#'}`}
            target="_blank"
            className="text-xs text-brand-500 border border-brand-200 px-3 py-1.5 rounded-xl hover:bg-brand-50 transition"
          >
            View Public Page ↗
          </Link>
          {isPlatformAdmin && (
            <button
              onClick={handleSendReport}
              disabled={reportSending || !restaurant?.id}
              className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition font-medium"
              title={`Send ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} report to restaurant owner`}
            >
              <Send size={12} />
              {reportSending ? 'Sending…' : 'Send Monthly Report'}
            </button>
          )}
        </div>
      </div>

      {isPlatformAdmin && reportResult && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${reportResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {reportResult.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
          {reportResult.msg}
          <button onClick={() => setReportResult(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

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
          <h2 className="text-[15px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Flame size={14} className="text-brand-500" />
            Live Kitchen Queue
            {queue.length > 0 && (
              <span className="ml-1 bg-brand-100 text-brand-600 text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
            )}
          </h2>
          <Link href="/orders" className="text-xs text-brand-500 hover:text-brand-600">All orders →</Link>
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
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">{orders.length}</span>
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
                        <Link href="/orders" className="text-xs text-gray-400 hover:text-brand-500 transition">
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

      {/* Reservation Highlights */}
      {resStats && (resStats.today_total > 0 || resStats.this_week_total > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <CalendarDays size={14} className="text-indigo-500" />
              Reservations
              {resStats.today_pending > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {resStats.today_pending} pending
                </span>
              )}
            </h2>
            <Link href="/reservations" className="text-xs text-indigo-500 hover:text-indigo-600">Manage →</Link>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { icon: CalendarCheck2, label: "Today's bookings", value: String(resStats.today_total), sub: `${resStats.today_confirmed} confirmed`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: Users, label: 'Covers today', value: String(resStats.today_covers), sub: 'total guests', color: 'text-teal-600', bg: 'bg-teal-50' },
              { icon: CalendarClock, label: 'Pending confirmation', value: String(resStats.today_pending), sub: resStats.today_pending > 0 ? 'needs attention' : 'all confirmed', color: resStats.today_pending > 0 ? 'text-amber-600' : 'text-green-600', bg: resStats.today_pending > 0 ? 'bg-amber-50' : 'bg-green-50' },
              { icon: CalendarDays, label: 'This week', value: String(resStats.this_week_total), sub: `${resStats.this_week_covers} covers`, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <s.icon size={16} className={s.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 leading-tight truncate">{s.label}</p>
                  <p className={`text-xl font-bold leading-tight ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-400 leading-tight">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            {/* Today's schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <UserCheck size={14} className="text-indigo-400" />
                Today&apos;s schedule
              </h3>
              {todayRes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No reservations today</p>
              ) : (
                <div className="space-y-2">
                  {todayRes.slice(0, 6).map(r => {
                    const [hh, mm] = r.reservation_time.split(':')
                    const h = parseInt(hh), m = mm
                    const label = h === 0 ? `12:${m}am` : h < 12 ? `${h}:${m}am` : h === 12 ? `12:${m}pm` : `${h - 12}:${m}pm`
                    const statusCls =
                      r.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                      r.status === 'pending'   ? 'bg-amber-50 text-amber-700' :
                      r.status === 'no_show'   ? 'bg-red-50 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    return (
                      <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs font-mono font-semibold text-gray-500 w-14 shrink-0">{label}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{r.customer_name}</p>
                          {r.notes && <p className="text-[11px] text-gray-400 truncate">{r.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Users size={11} />{r.party_size}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusCls}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {todayRes.length > 6 && (
                    <Link href="/reservations" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 pt-1">
                      +{todayRes.length - 6} more today →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Week at a glance */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CalendarDays size={14} className="text-indigo-400" />
                Next 7 days
              </h3>
              <div className="space-y-2">
                {resStats.next_7_days.map((day, i) => {
                  const date = new Date(day.date + 'T00:00:00')
                  const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  const maxCount = Math.max(...resStats.next_7_days.map(d => d.count), 1)
                  const barW = day.count > 0 ? Math.max(8, Math.round((day.count / maxCount) * 100)) : 0
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className={`text-xs w-24 shrink-0 ${i === 0 ? 'font-semibold text-indigo-600' : 'text-gray-500'}`}>{dayName}</span>
                      <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                        {barW > 0 && (
                          <div
                            className={`h-full rounded-full flex items-center px-2 ${i === 0 ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                            style={{ width: `${barW}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 w-20 text-right shrink-0">
                        {day.count > 0 ? `${day.count} res · ${day.covers} ppl` : <span className="text-gray-300">—</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
              { label: 'Active Queue', value: queue.length, color: 'text-brand-600' },
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
                  <span className={`text-sm font-bold ${pacePercent! >= 100 ? 'text-green-600' : 'text-brand-600'}`}>
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
                        className={`h-full rounded-full transition-all ${pacePercent! >= 100 ? 'bg-green-500' : pacePercent! >= 60 ? 'bg-brand-500' : 'bg-red-400'}`}
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
                    className="flex-1 max-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={handleSaveTarget}
                    disabled={savingTarget}
                    className="text-sm bg-brand-500 text-white px-4 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition"
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
                        <span className={`w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center shrink-0 ${isBottom ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-600'}`}>
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
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition group text-sm"
                >
                  <div className="w-8 h-8 bg-brand-50 group-hover:bg-brand-100 rounded-lg flex items-center justify-center transition">
                    <a.icon size={15} className="text-brand-500" />
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
