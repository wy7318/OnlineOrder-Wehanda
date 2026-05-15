import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
          <ShoppingBag size={18} className="text-white" />
        </div>
        <span className="font-bold text-xl text-gray-900">OrderFlow</span>
      </Link>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {children}
      </div>
    </div>
  )
}
