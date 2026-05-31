'use client'
import { useState } from 'react'
import { Store, LayoutDashboard } from 'lucide-react'
import CustomerDemo from './CustomerDemo'
import OwnerDemo from './OwnerDemo'
import DemoTour from './DemoTour'
import Link from 'next/link'

type Mode = 'customer' | 'owner'

export default function DemoShell() {
  const [mode, setMode] = useState<Mode>('customer')
  const [tourStep, setTourStep] = useState(0)
  const [tourVisible, setTourVisible] = useState(true)

  function switchMode(m: Mode) {
    setMode(m)
    setTourStep(0)
    setTourVisible(true)
  }

  function nextTourStep() {
    setTourStep(s => {
      const steps = mode === 'customer' ? 5 : 5
      if (s + 1 >= steps) { setTourVisible(false); return s }
      return s + 1
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo header */}
      <div className="sticky top-0 z-[150] bg-brand-700 shadow-lg">
        {/* Top notice bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-brand-600/50 text-xs text-white/60">
          <span className="hidden sm:block italic">Demo mode — all interactions are simulated, nothing is saved</span>
          <span className="sm:hidden italic">Demo mode</span>
          <Link
            href="/register"
            className="bg-white text-brand-600 font-bold px-4 py-1 rounded-full hover:bg-brand-50 transition shrink-0 text-xs"
          >
            Set up your restaurant →
          </Link>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-white font-bold text-sm hidden sm:block">Wehanda Demo</span>
          <div className="flex bg-brand-800/50 rounded-xl p-1 gap-1 mx-auto sm:mx-0">
            <button
              onClick={() => switchMode('customer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'customer' ? 'bg-white text-brand-600 shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Store size={15} />
              Customer View
            </button>
            <button
              onClick={() => switchMode('owner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'owner' ? 'bg-white text-brand-600 shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <LayoutDashboard size={15} />
              Owner Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Mode label strip */}
      <div className="bg-brand-50 border-b border-brand-100 px-6 py-2 text-center">
        {mode === 'customer' ? (
          <p className="text-xs text-brand-600 font-medium">
            👇 This is what your <strong>customers</strong> see when they visit your restaurant online
          </p>
        ) : (
          <p className="text-xs text-brand-600 font-medium">
            📊 This is your <strong>owner dashboard</strong> — manage orders, campaigns, customers & more
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'customer' ? <CustomerDemo /> : <OwnerDemo />}
      </div>

      {/* Guided tour */}
      {tourVisible && (
        <DemoTour
          mode={mode}
          step={tourStep}
          onNext={nextTourStep}
          onSkip={() => setTourVisible(false)}
        />
      )}
    </div>
  )
}
