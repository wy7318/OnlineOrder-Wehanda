'use client'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ClipboardList, Zap, Users,
  ShoppingBag, DollarSign, Clock, TrendingUp, ArrowUpRight,
} from 'lucide-react'

const SCREENS = ['Dashboard', 'Orders', 'Revenue Boost', 'Customers'] as const
type Screen = typeof SCREENS[number]

// ─── Sub-screens ─────────────────────────────────────────────────────────────

function DashboardScreen() {
  return (
    <div className="p-4 overflow-auto h-full">
      <p className="text-sm font-bold text-gray-900 mb-4">Good afternoon, Sakura Kitchen 👋</p>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { icon: DollarSign, label: 'Revenue Today', value: '$1,247', trend: '+18%' },
          { icon: ShoppingBag, label: 'Orders Today', value: '23', trend: '+5' },
          { icon: TrendingUp, label: 'Avg Order', value: '$54.20', trend: '+$3.40' },
          { icon: Clock, label: 'Avg Prep', value: '18 min', trend: '-2 min' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center mb-2">
              <k.icon size={13} className="text-brand-500" />
            </div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">{k.label}</p>
            <p className="text-sm font-bold text-gray-900">{k.value}</p>
            <p className="text-[10px] text-green-600 flex items-center gap-0.5 font-medium mt-0.5">
              <ArrowUpRight size={9} />{k.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Hourly bar chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-3">
        <p className="text-[11px] font-semibold text-gray-700 mb-2">Revenue by Hour</p>
        <div className="flex items-end gap-1 h-14">
          {[15, 28, 22, 40, 65, 90, 80, 100, 75, 55, 38, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-brand-400 rounded-sm"
              style={{ height: `${h}%`, opacity: i === 7 ? 1 : 0.6 + (i / 30) }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {['10am', '12pm', '2pm', '9pm'].map(t => (
            <span key={t} className="text-[9px] text-gray-400">{t}</span>
          ))}
        </div>
      </div>

      {/* Top items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-[11px] font-semibold text-gray-700 mb-2">Top Items Today</p>
        {[
          { name: 'Salmon Sashimi', qty: 12 },
          { name: 'Dragon Roll', qty: 9 },
          { name: 'Miso Ramen', qty: 7 },
        ].map(item => (
          <div key={item.name} className="mb-2">
            <div className="flex justify-between text-[10px] font-medium text-gray-700 mb-0.5">
              <span>{item.name}</span>
              <span>{item.qty}×</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full transition-all duration-700"
                style={{ width: `${(item.qty / 12) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrdersScreen() {
  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">Live Orders</p>
        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse block" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          {
            col: 'New', count: 1,
            orders: [{ n: '#0041', type: 'Pickup', items: 'Dragon Roll × 2, Gyoza', time: 'just now', ring: true }],
          },
          {
            col: 'Accepted', count: 1,
            orders: [{ n: '#0039', type: 'Dine-in', items: 'Sashimi Platter, Miso', time: '4m ago', ring: false }],
          },
          {
            col: 'Preparing', count: 2,
            orders: [
              { n: '#0037', type: 'Delivery', items: 'Ramen × 2, Gyoza', time: '12m', ring: false },
              { n: '#0036', type: 'Pickup', items: 'Sushi Set', time: '8m', ring: false },
            ],
          },
          {
            col: 'Ready', count: 1,
            orders: [{ n: '#0035', type: 'Pickup', items: 'California Roll × 3', time: '2m', ring: false }],
          },
        ].map(col => (
          <div key={col.col}>
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{col.col}</p>
              <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 rounded">
                {col.count}
              </span>
            </div>
            {col.orders.map(o => (
              <div
                key={o.n}
                className={`rounded-xl border p-2.5 mb-2 text-[11px] ${
                  col.col === 'New' ? 'bg-blue-50 border-blue-200' :
                  col.col === 'Accepted' ? 'bg-amber-50 border-amber-200' :
                  col.col === 'Preparing' ? 'bg-brand-50 border-brand-200' :
                  'bg-green-50 border-green-200'
                } ${o.ring ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
              >
                <div className="flex justify-between font-bold text-gray-800 mb-1">
                  <span>{o.n}</span>
                  <span className="text-gray-400 font-normal text-[10px]">{o.time}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-1">{o.type}</p>
                <p className="text-gray-700 text-[10px] leading-tight truncate">{o.items}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function RevenueBoostScreen() {
  return (
    <div className="p-4 h-full overflow-auto">
      <p className="text-sm font-bold text-gray-900 mb-0.5">Revenue Boost</p>
      <p className="text-[11px] text-gray-500 mb-3">AI campaigns running automatically</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Emails Sent', value: '47', color: 'text-brand-500' },
          { label: 'Clicks', value: '12', color: 'text-blue-600' },
          { label: 'Revenue', value: '$284', color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-gray-400 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {[
        { emoji: '🎂', name: 'Birthday', sent: 3, note: '2 clicks this week', color: 'text-green-600' },
        { emoji: '💌', name: 'Win-Back', sent: 8, note: '1 order attributed', color: 'text-green-600' },
        { emoji: '🛒', name: 'Cart Recovery', sent: 6, note: '$84 recovered', color: 'text-green-600' },
        { emoji: '⭐', name: 'After-Order', sent: 14, note: '4 returned', color: 'text-green-600' },
        { emoji: '🎉', name: 'Milestone', sent: 4, note: 'Running', color: 'text-gray-400' },
      ].map(c => (
        <div key={c.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 mb-1.5 flex items-center gap-2.5">
          <span className="text-base leading-none">{c.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800">{c.name}</p>
            <p className="text-[10px] text-gray-400">{c.sent} sent this month</p>
          </div>
          <span className={`text-[10px] font-semibold shrink-0 ${c.color}`}>{c.note}</span>
        </div>
      ))}
    </div>
  )
}

function CustomersScreen() {
  return (
    <div className="p-4 h-full overflow-auto">
      <p className="text-sm font-bold text-gray-900 mb-4">Customers</p>

      {[
        { name: 'James Park', orders: 23, pts: '2,400 pts', badge: 'VIP', badgeColor: 'bg-brand-100 text-brand-700', last: '2 days ago', initials: 'JP' },
        { name: 'Sarah Chen', orders: 7, pts: '680 pts', badge: 'At Risk', badgeColor: 'bg-red-100 text-red-600', last: '38 days ago', initials: 'SC' },
        { name: 'Marcus Lee', orders: 12, pts: '1,150 pts', badge: 'Loyal', badgeColor: 'bg-green-100 text-green-700', last: '5 days ago', initials: 'ML' },
        { name: 'Aisha Patel', orders: 3, pts: '290 pts', badge: 'New', badgeColor: 'bg-gray-100 text-gray-600', last: '1 week ago', initials: 'AP' },
        { name: 'Tom Wright', orders: 31, pts: '3,100 pts', badge: 'Top 5%', badgeColor: 'bg-amber-100 text-amber-700', last: 'Yesterday', initials: 'TW' },
      ].map(c => (
        <div key={c.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[11px] font-bold shrink-0">
            {c.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[11px] font-bold text-gray-800">{c.name}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.badgeColor}`}>{c.badge}</span>
            </div>
            <p className="text-[10px] text-gray-400">{c.orders} orders · {c.pts} · {c.last}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardPreview() {
  const [active, setActive] = useState<Screen>('Dashboard')
  const [visible, setVisible] = useState(true)

  // Auto-cycle through screens
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActive(prev => {
          const idx = SCREENS.indexOf(prev)
          return SCREENS[(idx + 1) % SCREENS.length]
        })
        setVisible(true)
      }, 250)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  function switchTo(screen: Screen) {
    if (screen === active) return
    setVisible(false)
    setTimeout(() => { setActive(screen); setVisible(true) }, 200)
  }

  const NAV_ITEMS: { label: Screen; icon: React.ElementType }[] = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Orders', icon: ClipboardList },
    { label: 'Revenue Boost', icon: Zap },
    { label: 'Customers', icon: Users },
  ]

  return (
    <div className="w-full">
      {/* Screen tabs */}
      <div className="flex gap-2 mb-5 flex-wrap justify-center">
        {SCREENS.map(s => (
          <button
            key={s}
            onClick={() => switchTo(s)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              active === s
                ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                : 'bg-white text-gray-500 hover:text-brand-600 border border-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Browser frame */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-brand-200/30 overflow-hidden border border-gray-200">
        {/* Browser chrome */}
        <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-gray-400 border border-gray-200 font-mono">
            app.wehanda.com/{active === 'Dashboard' ? 'dashboard' : active === 'Orders' ? 'orders' : active === 'Revenue Boost' ? 'revenue-boost' : 'customers'}
          </div>
        </div>

        {/* App shell */}
        <div className="flex" style={{ height: '420px' }}>

          {/* Sidebar — hidden on smallest screens */}
          <div className="hidden sm:flex w-44 bg-gray-900 shrink-0 flex-col p-2.5">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-2 mb-2 border-b border-gray-800 pb-3">
              <div className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center shrink-0">
                <ShoppingBag size={12} className="text-white" />
              </div>
              <span className="font-bold text-white text-sm">Wehanda</span>
            </div>
            {/* Restaurant chip */}
            <div className="bg-gray-800 rounded-lg px-2.5 py-2 mb-2">
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Managing</p>
              <p className="text-xs font-semibold text-white truncate">Sakura Kitchen</p>
            </div>
            {/* Nav items */}
            {NAV_ITEMS.map(item => (
              <button
                key={item.label}
                onClick={() => switchTo(item.label)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold mb-0.5 transition-colors text-left ${
                  active === item.label
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <item.icon size={13} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 bg-gray-50 overflow-hidden relative">
            <div
              className="absolute inset-0 overflow-auto transition-opacity duration-300"
              style={{ opacity: visible ? 1 : 0 }}
            >
              {active === 'Dashboard' && <DashboardScreen />}
              {active === 'Orders' && <OrdersScreen />}
              {active === 'Revenue Boost' && <RevenueBoostScreen />}
              {active === 'Customers' && <CustomersScreen />}
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-xs text-brand-300 mt-4 font-medium">
        Real platform · Auto-cycling preview · Click any tab to explore
      </p>
    </div>
  )
}
