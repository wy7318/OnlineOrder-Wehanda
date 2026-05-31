'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-700/95 backdrop-blur-md border-b border-brand-600/60">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-black text-white text-xl tracking-tight">
          Wehanda
        </Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <a href="#pricing" className="text-white/70 hover:text-white transition">Pricing</a>
          <Link href="/demo" className="text-white/70 hover:text-white transition">
            Demo
          </Link>
          <Link href="/login" className="text-white/70 hover:text-white transition">
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-white text-brand-600 hover:bg-brand-50 font-bold px-4 py-2 rounded-lg transition"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="sm:hidden text-white/70 hover:text-white transition"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-brand-600/50 bg-brand-700 px-6 py-4 flex flex-col gap-1">
          <a href="#pricing" className="text-white/70 hover:text-white py-2.5 text-sm" onClick={() => setOpen(false)}>
            Pricing
          </a>
          <Link href="/demo" className="text-white/70 hover:text-white py-2.5 text-sm" onClick={() => setOpen(false)}>
            Demo
          </Link>
          <Link href="/login" className="text-white/70 hover:text-white py-2.5 text-sm" onClick={() => setOpen(false)}>
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-white text-brand-600 font-bold py-3 rounded-xl text-center text-sm mt-2"
            onClick={() => setOpen(false)}
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  )
}
