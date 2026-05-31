'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  slug: string
  restaurantName: string
  logoUrl?: string | null
  accentColor: string
}

const links = [
  { label: 'Home',  path: '' },
  { label: 'Menu',  path: '/menu' },
  { label: 'About', path: '/about' },
]

export default function SiteNav({ slug, restaurantName, logoUrl, accentColor }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(path: string) {
    const full = `/restaurant/${slug}${path}`
    return path === '' ? pathname === full : pathname.startsWith(full)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo + name */}
          <Link href={`/restaurant/${slug}`} className="flex items-center gap-2.5 shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt={restaurantName} width={32} height={32} className="rounded-lg object-cover w-8 h-8" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: accentColor }}>
                🍽️
              </div>
            )}
            <span className="text-white font-bold text-sm hidden sm:block truncate max-w-[140px]">{restaurantName}</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 ml-4">
            {links.map(l => (
              <Link
                key={l.path}
                href={`/restaurant/${slug}${l.path}`}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive(l.path)
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Order CTA (desktop) */}
          <Link
            href={`/restaurant/${slug}/menu`}
            className="ml-auto hidden md:inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold text-white transition"
            style={{ background: accentColor }}
          >
            <ShoppingBag size={14} /> Order Now
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="ml-auto md:hidden p-2 text-white/80 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 pt-14" onClick={() => setMobileOpen(false)}>
          <div className="bg-gray-900/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex flex-col gap-1">
            {links.map(l => (
              <Link
                key={l.path}
                href={`/restaurant/${slug}${l.path}`}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive(l.path) ? 'bg-white/20 text-white' : 'text-white/70'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={`/restaurant/${slug}/menu`}
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: accentColor }}
            >
              <ShoppingBag size={14} /> Order Now
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
