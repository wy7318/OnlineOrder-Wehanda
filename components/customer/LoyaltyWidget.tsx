'use client'

import { useEffect, useState } from 'react'
import { X, Star, TrendingUp, Gift, CakeSlice, Clock, Award, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import type { LoyaltyTransaction } from '@/lib/types'

interface LoyaltyBalanceData {
  balance: number
  transactions: LoyaltyTransaction[]
  program: {
    program_name: string
    points_to_redeem: number
    minimum_points_to_redeem: number
  } | null
}

interface Props {
  restaurantId: string
  onClose: () => void
}

const TX_ICONS: Record<string, React.ElementType> = {
  order_earn: TrendingUp,
  order_redeem: Gift,
  order_refund: ArrowUpCircle,
  welcome_bonus: Award,
  birthday_bonus: CakeSlice,
  manual_adjust: Star,
  expiry: Clock,
}

const TX_COLORS: Record<string, string> = {
  order_earn: 'text-green-600 bg-green-50',
  order_redeem: 'text-brand-600 bg-brand-50',
  order_refund: 'text-green-600 bg-green-50',
  welcome_bonus: 'text-amber-600 bg-amber-50',
  birthday_bonus: 'text-pink-600 bg-pink-50',
  manual_adjust: 'text-blue-600 bg-blue-50',
  expiry: 'text-gray-500 bg-gray-100',
}

const TX_LABELS: Record<string, string> = {
  order_earn: 'Earned from order',
  order_redeem: 'Redeemed at checkout',
  order_refund: 'Refunded — order cancelled',
  welcome_bonus: 'Welcome bonus',
  birthday_bonus: 'Birthday bonus',
  manual_adjust: 'Manual adjustment',
  expiry: 'Points expired',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function LoyaltyWidget({ restaurantId, onClose }: Props) {
  const [data, setData] = useState<LoyaltyBalanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/loyalty/balance?restaurant_id=${restaurantId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [restaurantId])

  const canRedeem = data && data.program
    && data.balance >= data.program.minimum_points_to_redeem
  const redeemValue = data?.program
    ? Math.floor(data.balance / data.program.points_to_redeem)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-brand-500 to-brand-600">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-white" />
            <h2 className="text-base font-extrabold text-white">
              {data?.program?.program_name ?? 'My Rewards'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-4 border-brand-300 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading your points…</p>
            </div>
          ) : !data?.program ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center">
                <Star size={28} className="text-gray-400" />
              </div>
              <p className="font-bold text-gray-700">Rewards not available</p>
              <p className="text-sm text-gray-400">This restaurant hasn't enabled a loyalty program yet.</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Balance card */}
              <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-5 text-white shadow-lg">
                <p className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">Your Points</p>
                <p className="text-5xl font-extrabold tracking-tight mb-1">
                  {(data.balance ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-white/80 font-medium">
                  {data.program.program_name}
                </p>
                {redeemValue > 0 && (
                  <div className="mt-3 bg-white/15 rounded-2xl px-3 py-2 inline-block">
                    <p className="text-sm font-bold">Worth up to ${redeemValue} off</p>
                  </div>
                )}
              </div>

              {/* Redeem callout */}
              {canRedeem ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Gift size={18} className="text-green-600 shrink-0" />
                  <p className="text-sm font-semibold text-green-700">
                    You can redeem up to <span className="font-extrabold">${redeemValue} off</span> at checkout!
                  </p>
                </div>
              ) : (
                data.program.minimum_points_to_redeem > (data.balance ?? 0) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600 font-medium">
                      Earn <span className="font-extrabold">{data.program.minimum_points_to_redeem - (data.balance ?? 0)} more points</span> to start redeeming
                    </p>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((data.balance ?? 0) / data.program.minimum_points_to_redeem) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{data.balance ?? 0} pts</span>
                      <span>{data.program.minimum_points_to_redeem} pts</span>
                    </div>
                  </div>
                )
              )}

              {/* How it works */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">How it works</p>
                <p className="text-sm text-amber-800">• {data.program.points_to_redeem} points = <strong>$1 off</strong> your order</p>
                <p className="text-sm text-amber-800">• Minimum <strong>{data.program.minimum_points_to_redeem} points</strong> to redeem</p>
                <p className="text-sm text-amber-800">• Points added after each <strong>completed order</strong></p>
              </div>

              {/* Transaction history */}
              {data.transactions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</p>
                  <div className="space-y-2">
                    {data.transactions.map(tx => {
                      const Icon = TX_ICONS[tx.type] ?? Star
                      const colorCls = TX_COLORS[tx.type] ?? 'text-gray-500 bg-gray-100'
                      const isPositive = tx.points_delta > 0
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorCls}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {tx.note ?? TX_LABELS[tx.type] ?? tx.type}
                            </p>
                            <p className="text-xs text-gray-400">{fmtDate(tx.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isPositive
                              ? <ArrowUpCircle size={13} className="text-green-500" />
                              : <ArrowDownCircle size={13} className="text-red-400" />}
                            <span className={`text-sm font-extrabold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                              {isPositive ? '+' : ''}{tx.points_delta}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {data.transactions.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">No activity yet — place an order to start earning!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
