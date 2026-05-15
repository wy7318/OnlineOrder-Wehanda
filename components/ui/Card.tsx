import { cn } from '@/lib/utils/helpers'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', padding && 'p-6', className)}>
      {children}
    </div>
  )
}
