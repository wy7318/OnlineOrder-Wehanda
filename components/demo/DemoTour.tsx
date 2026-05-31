'use client'

export interface TourStep {
  title: string
  body: string
  tip?: string
}

const CUSTOMER_STEPS: TourStep[] = [
  {
    title: "👋 Welcome to the demo",
    body: "This is exactly what your customers see when they visit your restaurant online. Browse the menu, add items, and try checking out.",
    tip: "Nothing saves to a real database — it's all yours to explore freely.",
  },
  {
    title: "🍱 Add items to your order",
    body: "Tap any menu item to open its detail view. You can choose quantity and add it to the cart — just like your real customers will.",
  },
  {
    title: "🛒 Review and check out",
    body: "Once you've added items, tap the cart bar at the bottom. Try going through the full checkout — you'll get a confirmation just like a real order.",
  },
  {
    title: "📅 Book a table",
    body: "Scroll down to the Reservation section to see the full booking flow. Customers can reserve a table directly from your ordering page.",
  },
  {
    title: "📊 See the owner side",
    body: "Switch to Owner Dashboard (top tab) to see how you'd manage incoming orders, run AI campaigns, and track revenue in real-time.",
  },
]

const OWNER_STEPS: TourStep[] = [
  {
    title: "📊 Your live dashboard",
    body: "This is your command center — revenue, orders, and key metrics for today. Everything updates in real-time as orders come in.",
  },
  {
    title: "⚡ Manage orders live",
    body: "Click Orders to see the live queue. Accept new orders, track prep status, and mark orders ready — all with one tap.",
    tip: "Try clicking 'Accept' on a new order to see the workflow.",
  },
  {
    title: "🤖 AI campaigns run themselves",
    body: "Revenue Boost sends 8 types of personalized emails automatically — birthday wishes, win-backs, cart recovery, and more. Click 'Preview' on any campaign to see a sample email.",
  },
  {
    title: "👥 Know your customers",
    body: "The Customers section shows AI-scored segments: VIP, Loyal, At Risk. You can see who's about to churn before it happens.",
  },
  {
    title: "✍️ AI writes your website",
    body: "In the Website section, click 'Generate with AI' to see how Wehanda writes SEO-optimized copy based on your real menu and customer data.",
  },
]

interface Props {
  mode: 'customer' | 'owner'
  step: number
  onNext: () => void
  onSkip: () => void
}

export default function DemoTour({ mode, step, onNext, onSkip }: Props) {
  const steps = mode === 'customer' ? CUSTOMER_STEPS : OWNER_STEPS
  const current = steps[step]
  if (!current) return null

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-[200] w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-bold text-gray-900 text-sm leading-snug">{current.title}</h4>
          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 font-medium">
            {step + 1}/{steps.length}
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-3">{current.body}</p>

        {current.tip && (
          <div className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-brand-700 font-medium">💡 {current.tip}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex-1"
          >
            Skip tour
          </button>
          <button
            onClick={onNext}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex-1"
          >
            {step < steps.length - 1 ? 'Next →' : 'Done ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
