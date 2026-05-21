import Link from 'next/link'
import { ShoppingBag, BarChart3, Clock, Shield, ChevronRight, Star, Utensils } from 'lucide-react'

const features = [
  { icon: ShoppingBag, title: 'Online Ordering', desc: 'Let customers order directly from your digital menu, 24/7.' },
  { icon: BarChart3, title: 'Order Dashboard', desc: 'Manage incoming orders and update statuses in real-time.' },
  { icon: Clock, title: 'Operation Hours', desc: 'Set per-day hours by timezone — ordering auto-disables when closed.' },
  { icon: Shield, title: 'Multi-Tenant Isolation', desc: "Each restaurant's data is strictly isolated and secure." },
  { icon: Utensils, title: 'Menu Management', desc: 'CRUD for categories, items, modifiers, tags, and images.' },
  { icon: Star, title: 'Custom Branding', desc: 'Each restaurant gets a branded public ordering page.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Wehanda</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              Sign In
            </Link>
            <Link href="/register" className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-brand-50 to-white">
        <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Star size={14} /> Multi-tenant restaurant SaaS
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight max-w-3xl mb-6">
          Online ordering,<br />
          <span className="text-brand-500">built for restaurants</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-xl mb-10 leading-relaxed">
          Register your restaurant, build your menu, and start accepting orders in minutes.
          Each restaurant gets a beautiful public ordering page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition shadow-lg shadow-brand-200"
          >
            Start Restaurant Setup <ChevronRight size={20} />
          </Link>
          <Link
            href="/restaurant/demo-sushi-house"
            className="flex items-center gap-2 border-2 border-gray-200 hover:border-brand-300 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg transition"
          >
            View Demo Restaurant
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to run online ordering</h2>
            <p className="text-gray-600 text-lg">One platform, multiple restaurants, total control.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition group">
                <div className="w-12 h-12 bg-brand-100 group-hover:bg-brand-500 rounded-xl flex items-center justify-center mb-4 transition">
                  <f.icon size={22} className="text-brand-500 group-hover:text-white transition" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-500">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to take orders online?</h2>
          <p className="text-brand-100 mb-8 text-lg">Join restaurants already using Wehanda to grow their business.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-brand-500 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-brand-50 transition"
          >
            Create your restaurant <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
              <ShoppingBag size={12} className="text-white" />
            </div>
            <span className="font-semibold text-gray-700">Wehanda</span>
          </div>
          <p>© {new Date().getFullYear()} Wehanda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
