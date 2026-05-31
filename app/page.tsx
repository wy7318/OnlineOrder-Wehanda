import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Check, ChevronRight, ArrowRight } from 'lucide-react'
import NavBar from '@/components/landing/NavBar'
import DashboardPreview from '@/components/landing/DashboardPreview'

export const revalidate = 86400

const DEFAULTS = {
  meta_title: 'Wehanda — Restaurant Online Ordering & AI Marketing Software',
  meta_description:
    'Accept online orders with zero commission. AI email campaigns, loyalty programs, and a custom ordering page for your restaurant — from $69/month.',
  keywords:
    'restaurant online ordering software, restaurant ordering system, online food ordering platform for restaurants, restaurant marketing automation, restaurant loyalty program, restaurant website builder, restaurant SaaS, online menu management, restaurant CRM software',
  hero_headline: 'Online ordering without the commission.',
  hero_subheadline:
    'Wehanda gives your restaurant a custom ordering page, AI marketing, and loyalty programs — keeping 100% of every order. Starting at $69/month.',
}

async function getSeoData() {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_seo')
      .select('meta_title, meta_description, keywords, hero_headline, hero_subheadline')
      .eq('id', 1)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoData()
  const title = (seo?.meta_title as string | null) ?? DEFAULTS.meta_title
  const description = (seo?.meta_description as string | null) ?? DEFAULTS.meta_description
  const keywords = (seo?.keywords as string | null) ?? DEFAULTS.keywords
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://online-order-wehanda.vercel.app'

  return {
    title,
    description,
    keywords,
    alternates: { canonical: siteUrl },
    openGraph: {
      title,
      description,
      type: 'website',
      url: siteUrl,
      siteName: 'Wehanda',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

// ─── Feature data ────────────────────────────────────────────────────────────

const PLATFORM_FEATURES = [
  {
    n: '01',
    title: 'Online Ordering',
    desc: "Pickup, dine-in, and delivery from a page that's 100% yours — no app store, no middleman.",
  },
  {
    n: '02',
    title: 'Menu Builder',
    desc: 'Categories, subcategories, modifiers, photos, happy hour pricing, and availability rules.',
  },
  {
    n: '03',
    title: 'Reservations',
    desc: 'Table booking built into your ordering page — no separate software required.',
  },
  {
    n: '04',
    title: 'Loyalty Program',
    desc: 'Points and rewards that bring customers back to your restaurant, not a competitor.',
  },
  {
    n: '05',
    title: 'Website Builder',
    desc: '8 design templates with your brand colors, gallery, SEO fields, and opening hours.',
  },
  {
    n: '06',
    title: 'Analytics & Reports',
    desc: 'Revenue, orders, customer trends, and a monthly performance summary in your inbox.',
  },
]

const AI_CAMPAIGNS = [
  { name: 'Birthday', desc: 'Sent on their special day, every time — automatically.' },
  { name: 'Win-Back', desc: "Reaches customers who haven't ordered in 30+ days." },
  { name: 'Cart Recovery', desc: 'Follows up on abandoned orders within hours.' },
  { name: 'New Item Launch', desc: 'Announces new dishes to customers who order that category.' },
  { name: 'Milestone', desc: 'Celebrates the 5th, 10th, and 25th order milestones.' },
  { name: 'Quiet Day Boost', desc: 'Fills slow days with real, targeted outreach.' },
  { name: 'Loyalty Nudge', desc: "Tells customers when they're one order from a reward." },
  { name: 'After-Order Follow-up', desc: 'A warm check-in sent 3 days after their meal.' },
]

const BASIC_FEATURES = [
  'Custom ordering page (pickup, dine-in, delivery)',
  'Menu builder with categories, modifiers & photos',
  'Reservations system',
  'Customer CRM',
  'Loyalty points program',
  '8 website templates with brand colors',
  'Monthly performance email report',
  'Analytics dashboard',
  'Gallery, SEO fields & hours management',
]

const BOOST_EXTRAS = [
  '8 automated AI email campaign types',
  'AI-generated website SEO content',
  'Customer churn risk & LTV scoring',
  'Menu conversion tips from AI',
  'Upsell recommendations engine',
  'Push notifications (iOS & Android)',
  'Google competitor research',
  'Click tracking & revenue attribution',
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const seo = await getSeoData()
  const heroHeadline = (seo?.hero_headline as string | null) ?? DEFAULTS.hero_headline
  const heroSub = (seo?.hero_subheadline as string | null) ?? DEFAULTS.hero_subheadline

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://online-order-wehanda.vercel.app'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Wehanda',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    description: DEFAULTS.meta_description,
    url: siteUrl,
    offers: [
      {
        '@type': 'Offer',
        name: 'Basic',
        price: '69',
        priceCurrency: 'USD',
        description: 'Online ordering, menu builder, reservations, loyalty, website builder, analytics',
      },
      {
        '@type': 'Offer',
        name: 'Revenue Boost',
        price: '149',
        priceCurrency: 'USD',
        description:
          'Everything in Basic plus 8 AI email campaign types, customer scoring, menu insights, push notifications',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen">
        <NavBar />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section
          className="pt-32 sm:pt-36 pb-20 sm:pb-28 px-6"
          style={{ background: 'linear-gradient(135deg, #0255c4 0%, #037FFC 60%, #3b9fff 100%)' }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 border border-white/25 text-white/70 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-10">
              Restaurant Platform &nbsp;·&nbsp; No Commissions
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-black text-white leading-[1.05] tracking-tight max-w-3xl mb-7">
              {heroHeadline}
            </h1>

            <p className="text-lg sm:text-xl text-white/75 max-w-2xl mb-10 leading-relaxed">
              {heroSub}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-20">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-600 hover:bg-brand-50 font-bold px-8 py-4 rounded-xl text-base transition shadow-lg shadow-brand-900/20"
              >
                Start free today <ChevronRight size={18} />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 border border-white/30 hover:border-white/60 text-white font-medium px-8 py-4 rounded-xl text-base transition"
              >
                See a live demo <ArrowRight size={18} />
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
              {[
                { val: '$0', label: 'Commission per order' },
                { val: '20 min', label: 'Setup to first order' },
                { val: '8', label: 'AI campaign types' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-3xl sm:text-4xl font-black text-white mb-1">{s.val}</p>
                  <p className="text-white/55 text-sm leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROBLEM ──────────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-8">
              The problem
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight max-w-3xl mb-16">
              Third-party apps are making your restaurant work for them.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {[
                {
                  stat: '30%',
                  desc: 'Commission taken on every order by Uber Eats, DoorDash, and similar platforms.',
                },
                {
                  stat: '0',
                  desc: "Customer data you own when they order through someone else's app.",
                },
                {
                  stat: '100%',
                  desc: 'Of your brand handed to a platform that lists your competitors right next to you.',
                },
              ].map(p => (
                <div key={p.stat} className="py-8 md:py-0 md:px-10 first:md:pl-0 last:md:pr-0">
                  <p className="text-6xl font-black text-brand-500 mb-4 leading-none">{p.stat}</p>
                  <p className="text-gray-600 leading-relaxed text-sm">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLATFORM DEMO ────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-brand-50">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-400 mb-4 text-center">
              See it in action
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight text-center mb-4">
              Your dashboard, live.
            </h2>
            <p className="text-gray-500 text-lg text-center mb-12 max-w-xl mx-auto leading-relaxed">
              Real-time orders, AI campaigns, customer profiles, and analytics — all in one clean interface.
            </p>
            <DashboardPreview />
          </div>
        </section>

        {/* ── CORE PLATFORM ────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-brand-900">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-400 mb-6">
              The platform
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight max-w-2xl mb-5">
              Everything your restaurant needs. Nothing extra.
            </h2>
            <p className="text-brand-200 text-lg mb-14 max-w-xl leading-relaxed">
              Purpose-built for restaurant owners — not enterprise chains, not generic e-commerce stores.
            </p>

            <div className="border border-brand-800 rounded-2xl overflow-hidden">
              {PLATFORM_FEATURES.map((f, i) => (
                <div
                  key={f.n}
                  className={`flex gap-6 p-7 sm:p-8 ${
                    i < PLATFORM_FEATURES.length - 1 ? 'border-b border-brand-800' : ''
                  }`}
                >
                  <span className="text-xs font-bold tracking-widest text-brand-500 mt-1 shrink-0 w-6">
                    {f.n}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1.5">{f.title}</h3>
                    <p className="text-brand-300 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI REVENUE BOOST ─────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-brand-600">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-white/50 mb-6">
              Revenue Boost · $149/month
            </p>
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 mb-14">
              <div className="lg:w-5/12">
                <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
                  AI that runs your marketing while you run your kitchen.
                </h2>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                  Eight campaign types sent automatically — personalized per customer and tracked
                  all the way to revenue.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-7 py-3.5 rounded-xl hover:bg-brand-50 transition"
                >
                  Start with Revenue Boost <ChevronRight size={18} />
                </Link>
              </div>

              <div className="lg:w-7/12 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AI_CAMPAIGNS.map(c => (
                  <div
                    key={c.name}
                    className="bg-white/10 border border-white/15 rounded-xl p-5 backdrop-blur-sm"
                  >
                    <p className="font-bold text-white mb-1 text-sm">{c.name}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── AI EXTRAS ────────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-12">
              Also included with Revenue Boost
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {[
                {
                  title: 'Customer Scoring',
                  desc: "AI labels every customer by churn risk, lifetime value, and order frequency — so you know who needs attention and who's loyal.",
                },
                {
                  title: 'Menu Insights',
                  desc: "Spot items people view but don't order. Get plain-English tips: update the photo, rewrite the description, adjust the price.",
                },
                {
                  title: 'AI Website Copy',
                  desc: 'Generate SEO-optimized hero, about, and meta content based on your real menu, location, and customer data.',
                },
              ].map(f => (
                <div key={f.title} className="border-t-2 border-brand-500 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-brand-50" id="pricing">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-400 mb-4 text-center">
              Pricing
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 text-center mb-4">
              Simple, honest pricing.
            </h2>
            <p className="text-gray-500 text-lg text-center mb-16">
              No setup fees. No per-order commissions. No hidden costs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Basic */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Basic
                </p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-black text-gray-900">$69</span>
                  <span className="text-gray-400 mb-2 text-sm">/month</span>
                </div>
                <p className="text-gray-500 text-sm mb-8">
                  Everything you need to accept orders online and grow your regulars.
                </p>
                <Link
                  href="/register"
                  className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl mb-8 transition text-sm"
                >
                  Get started
                </Link>
                <ul className="space-y-3 mt-auto">
                  {BASIC_FEATURES.map(f => (
                    <li key={f} className="flex gap-3 text-sm text-gray-700">
                      <Check size={15} className="text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Revenue Boost */}
              <div
                className="rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-lg shadow-brand-200/40"
                style={{ background: 'linear-gradient(145deg, #0255c4 0%, #037FFC 100%)' }}
              >
                <div className="absolute top-5 right-5 bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase border border-white/30">
                  Most Popular
                </div>
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">
                  Revenue Boost
                </p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-black text-white">$149</span>
                  <span className="text-white/60 mb-2 text-sm">/month</span>
                </div>
                <p className="text-white/70 text-sm mb-8">
                  AI marketing that grows your restaurant while you focus on food.
                </p>
                <Link
                  href="/register"
                  className="block w-full text-center bg-white text-brand-600 hover:bg-brand-50 font-bold py-3.5 rounded-xl mb-8 transition text-sm"
                >
                  Start with Revenue Boost
                </Link>
                <ul className="space-y-3 mt-auto">
                  <li className="text-white/50 text-xs font-semibold uppercase tracking-wider pb-3 border-b border-white/20">
                    Everything in Basic, plus:
                  </li>
                  {BOOST_EXTRAS.map(f => (
                    <li key={f} className="flex gap-3 text-sm text-white/85">
                      <Check size={15} className="text-white/70 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section
          className="py-24 px-6"
          style={{ background: 'linear-gradient(135deg, #0255c4 0%, #037FFC 100%)' }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              Your menu could be live tonight.
            </h2>
            <p className="text-white/70 text-lg mb-10 leading-relaxed">
              Setup takes 20 minutes. Your first order keeps every dollar.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-brand-50 font-bold px-10 py-4 rounded-xl text-lg transition shadow-xl shadow-brand-900/20"
            >
              Create your restaurant <ChevronRight size={20} />
            </Link>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer className="bg-brand-900 border-t border-brand-800 py-10 px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="font-black text-white text-lg mb-1">Wehanda</p>
              <p className="text-brand-400 text-sm">Restaurant online ordering &amp; AI marketing</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-brand-300">
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <Link href="/demo" className="hover:text-white transition">Demo</Link>
              <Link href="/login" className="hover:text-white transition">Sign In</Link>
              <Link href="/register" className="hover:text-white transition">Get Started</Link>
            </div>
            <p className="text-brand-600 text-sm">&copy; {new Date().getFullYear()} Wehanda</p>
          </div>
        </footer>
      </div>
    </>
  )
}
