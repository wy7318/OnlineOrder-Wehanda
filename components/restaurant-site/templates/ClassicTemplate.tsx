import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, CalendarDays, ChevronRight, Utensils } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import { DAY_NAMES, type TemplateProps } from './types'

function Divider({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex-1 h-px bg-amber-100" />
      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{label}</p>
      <div className="flex-1 h-px bg-amber-100" />
    </div>
  )
}

export default function ClassicTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured, loyalty,
}: TemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#fdf8f3] text-gray-900">

      {/* Hero — full-bleed with warm overlay */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/50 via-amber-900/60 to-amber-950/80" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, #78350f 0%, #92400e 50%, ${accent} 100%)` }} />
        )}

        <div className="relative z-10 px-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-12 bg-amber-300/50" />
            <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${isOpen ? 'text-amber-200 bg-amber-900/60' : 'text-red-200 bg-red-900/60'}`}>
              {isOpen ? '● Open now' : '● Closed'}
            </span>
            <div className="h-px w-12 bg-amber-300/50" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white leading-tight tracking-wide mb-5">
            {heroHeadline}
          </h1>
          {heroSubheadline && (
            <p className="text-lg text-amber-100/80 max-w-xl mx-auto mb-10 leading-relaxed">{heroSubheadline}</p>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold text-white shadow-xl transition hover:opacity-90"
              style={{ background: accent }}>
              Order Online <ChevronRight size={18} />
            </Link>
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold bg-white/15 backdrop-blur border border-white/30 text-white hover:bg-white/25 transition">
              View Menu
            </Link>
            {restaurant.reservations_enabled && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold bg-white/15 backdrop-blur border border-white/30 text-white hover:bg-white/25 transition">
                <CalendarDays size={16} /> Reserve a Table
              </Link>
            )}
          </div>

          {/* Order type tags */}
          {orderTypes.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              {orderTypes.map(t => (
                <span key={t} className="text-xs text-amber-200/60 uppercase tracking-widest">{t}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info strip */}
      <section className="bg-amber-50 border-y border-amber-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-wrap gap-6 justify-center text-sm text-amber-900/70">
          {restaurant.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-amber-900 transition">
              <MapPin size={14} className="text-amber-400" />{restaurant.address}
            </a>
          )}
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:text-amber-900 transition">
              <Phone size={14} className="text-amber-400" />{restaurant.phone}
            </a>
          )}
          {(restaurant.cuisine_types ?? []).map(c => (
            <span key={c} className="px-3 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold rounded-full">{c}</span>
          ))}
        </div>
      </section>

      {/* Loyalty */}
      {loyalty?.is_enabled && (
        <section className="py-8 px-6 bg-amber-50">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 bg-amber-100">⭐</div>
            <div>
              <p className="font-bold text-sm text-amber-900">{loyalty.program_name ?? 'Rewards Club'}</p>
              <p className="text-xs text-amber-700/60">Earn {loyalty.points_per_dollar ?? 1} point per $1. Join for free.</p>
            </div>
            <Link href={`/restaurant/${slug}/menu`} className="ml-auto text-xs font-bold px-5 py-2 rounded-full text-white transition hover:opacity-90" style={{ background: accent }}>
              Join Free
            </Link>
          </div>
        </section>
      )}

      {/* Featured items */}
      {featured.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <Divider label="Signature dishes" accent={accent} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {featured.map(item => (
                <Link key={item.id} href={`/restaurant/${slug}/menu`}
                  className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                  <div className="relative aspect-square bg-amber-50">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Utensils size={24} className="text-amber-200" /></div>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    <p className="font-serif font-bold text-sm text-gray-900 mb-1">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.description}</p>}
                    <p className="font-bold text-sm" style={{ color: accent }}>{formatCurrency(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-sm transition hover:opacity-90"
                style={{ background: accent }}>
                View Full Menu <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {aboutBody && (
        <section className="py-20 px-6 bg-amber-50 border-y border-amber-100">
          <div className="max-w-3xl mx-auto text-center">
            <Divider label="Our story" accent={accent} />
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mb-6">{aboutTitle}</h2>
            <p className="text-gray-600 leading-loose text-base whitespace-pre-line">{aboutBody}</p>
            <Link href={`/restaurant/${slug}/about`} className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold transition hover:opacity-70" style={{ color: accent }}>
              Read more <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Hours */}
      {showHours && hours.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <Divider label="Hours" accent={accent} />
            <div className="grid sm:grid-cols-2 gap-2 max-w-md mx-auto">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id}
                    className={`flex items-center justify-between px-5 py-3 rounded-xl text-sm ${isToday ? 'bg-white border-2 shadow-sm font-bold' : 'bg-amber-50'}`}
                    style={isToday ? { borderColor: accent, color: accent } : { color: '#92400e' }}>
                    <span>{DAY_NAMES[h.day_of_week]}{isToday ? ' (today)' : ''}</span>
                    <span className={h.is_closed ? 'text-gray-300' : ''}>{h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {showGallery && galleryUrls.length > 0 && (
        <section className="py-20 px-6 bg-amber-50 border-t border-amber-100">
          <div className="max-w-4xl mx-auto">
            <Divider label="Gallery" accent={accent} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.slice(0, 6).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-amber-100 shadow-sm">
                  <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <section className="py-20 px-6 text-center" style={{ background: '#1c1008' }}>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3">Join us for a meal</h2>
        <p className="text-amber-300/60 mb-10 text-sm">Reserve a table or order online — we&apos;re ready for you.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-sm transition hover:opacity-90"
            style={{ background: accent }}>
            Order Online
          </Link>
          {restaurant.reservations_enabled && (
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold border border-amber-800 text-amber-300 hover:bg-amber-900/40 transition text-sm">
              <CalendarDays size={15} /> Reserve a Table
            </Link>
          )}
        </div>

        <div className="mt-12 flex flex-wrap gap-6 justify-center text-amber-700/60 text-sm">
          {restaurant.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-amber-400 transition">
              <MapPin size={13} />{restaurant.address}
            </a>
          )}
          {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:text-amber-400 transition"><Phone size={13} />{restaurant.phone}</a>}
          {restaurant.email && <a href={`mailto:${restaurant.email}`} className="flex items-center gap-2 hover:text-amber-400 transition"><Mail size={13} />{restaurant.email}</a>}
        </div>
        <p className="mt-10 text-amber-900/50 text-xs">Powered by Wehanda</p>
      </section>
    </div>
  )
}
