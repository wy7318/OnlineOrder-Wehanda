'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { TrendingUp, Gift, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

interface ImpactData {
  upsell: {
    revenue: number
    order_count: number
    total_orders: number
    acceptance_rate: number
    aov_lift: number
  }
  loyalty: {
    total_discount_given: number
    active_members: number
    member_aov_lift: number
    member_order_count: number
  }
}

export default function RevenueInsightCard() {
  const [data, setData] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/revenue-impact?days=30')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  const hasData = (data?.upsell.revenue ?? 0) > 0
    || (data?.upsell.total_orders ?? 0) > 0
    || (data?.loyalty.active_members ?? 0) > 0

  if (!loading && !hasData) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <TrendingUp size={14} className="text-brand-500" />
          Revenue Impact
          <span className="text-xs font-normal text-gray-400">· last 30 days</span>
        </h3>
        <Link
          href="/analytics"
          className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium transition"
        >
          Full report <ArrowRight size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="animate-pulse space-y-2 bg-gray-50 rounded-xl p-3.5">
              <div className="h-3 bg-gray-200 rounded w-14" />
              <div className="h-7 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Upsell panel */}
          <div className="bg-orange-50 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={12} className="text-orange-500" />
              <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wide">Upsell</p>
            </div>
            {data.upsell.total_orders === 0 ? (
              <p className="text-xs text-gray-400">No completed orders yet</p>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(data.upsell.revenue)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  extra revenue · {Math.round(data.upsell.acceptance_rate * 100)}% accepted
                </p>
                {data.upsell.aov_lift > 0.5 && (
                  <p className="text-xs text-green-600 font-medium mt-1.5">
                    ↑ {formatCurrency(data.upsell.aov_lift)} higher avg order
                  </p>
                )}
              </>
            )}
          </div>

          {/* Loyalty panel */}
          <div className="bg-amber-50 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Gift size={12} className="text-amber-500" />
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Loyalty</p>
            </div>
            {data.loyalty.active_members === 0 ? (
              <p className="text-xs text-gray-400">No members yet</p>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900">{data.loyalty.active_members} members</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatCurrency(data.loyalty.total_discount_given)} discounts given
                </p>
                {data.loyalty.member_aov_lift > 0.5 && data.loyalty.member_order_count > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-1.5">
                    ↑ {formatCurrency(data.loyalty.member_aov_lift)} vs guest orders
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
