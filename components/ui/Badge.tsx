import { cn } from '@/lib/utils/helpers'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange'
  className?: string
  style?: React.CSSProperties
}

const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  orange: 'bg-brand-100 text-brand-700',
}

export default function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span style={style} className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
