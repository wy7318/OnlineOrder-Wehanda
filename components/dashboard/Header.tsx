import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  userEmail?: string
}

export default function Header({ title, subtitle, actions, userEmail }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-[15px] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {userEmail && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-brand-600 font-semibold text-xs">
                {userEmail[0].toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">{userEmail}</span>
          </div>
        )}
      </div>
    </div>
  )
}
