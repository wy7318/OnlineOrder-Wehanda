import { cn } from '@/lib/utils/helpers'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'orange' | 'green' | 'blue' | 'red' | 'yellow'
  subtitle?: string
}

const colorMap = {
  orange: 'bg-brand-50 text-brand-600',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
}

export default function StatsCard({ title, value, icon: Icon, color = 'orange', subtitle }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colorMap[color])}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
