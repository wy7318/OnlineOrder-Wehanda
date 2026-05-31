import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, MapPin, Phone } from 'lucide-react'
import { DAY_NAMES, type TemplateProps } from './types'
import { formatCurrency } from '@/lib/utils/helpers'

export default function ZenTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured,
}: TemplateProps) {
  const todayDay = new Date().getDay()
  const hasOrdering = orderTypes.length > 0

  return (
    <div className="min-h-screen bg-[#f9f8f7]">

      {/* Minimal hero — typography is the hero */}
      <section className="relative min-h-[75vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {restaurant.cover_image_url && (
          <div className="absolute inset-0">
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover opacity-[0.07]" priority />
          </div>
        )}
        <div className="relative z-10 max-w-3xl mx-auto">
          {restaurant.logo_url && (
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 mx-auto mb-14">
              <Image src={restaurant.logo_url} alt={restaurant.name} width={40} height={40} className="object-cover w-full h-full" />
            </div>
          )}
          {(restaurant.cuisine_types ?? []).length > 0 && (
            <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-12">
              {restaurant.cuisine_types!.join('  ·  ')}
            </p>
          )}
          <h1 className="font-extralight tracking-[0.12em] text-[#1c1c1c] leading-tight mb-12"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}>
            {heroHeadline || restaurant.name}
          </h1>
          {heroSubheadline && (
            <p className="text-gray-400 font-light text-base mb-10 max-w-md mx-auto leading-relaxed">{heroSubheadline}</p>
          )}
          <div className="w-px h-14 bg-gray-300 mx-auto mb-10" />
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <span className={`inline-flex items-center gap-2 px-5 py-2 border text-[11px] font-light uppercase tracking-[0.3em] ${isOpen ? 'border-gray-300 text-gray-500' : 'border-red-200 text-red-400'}`}>
              <span className={`w-1 h-1 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isOpen ? 'Now Open' : 'Closed'}
            </span>
            {hasOrdering && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition hover:opacity-80"
                style={{ background: accent }}>
                Order <ChevronRight size={11} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">

        {/* About — editorial single column */}
        {aboutBody && (
          <section className="py-20 border-t border-gray-200">
            <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-12">{aboutTitle || 'Our Philosophy'}</p>
            <p className="text-[#3c3c3c] font-light text-lg leading-loose whitespace-pre-line">{aboutBody}</p>
            <Link href={`/restaurant/${slug}/about`}
              className="inline-flex items-center gap-2 mt-10 text-[11px] uppercase tracking-[0.3em] font-medium transition hover:opacity-60"
              style={{ color: accent }}>
              Read More <ChevronRight size={11} />
            </Link>
          </section>
        )}

        {/* Featured — numbered editorial list */}
        {featured.length > 0 && (
          <section className="py-20 border-t border-gray-200">
            <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-14">Featured</p>
            {featured.map((item, i) => (
              <Link key={item.id} href={`/restaurant/${slug}/menu`}
                className="group flex items-center gap-6 py-10 border-b border-gray-100 hover:border-gray-300 transition-all">
                <span className="text-[11px] text-gray-300 font-light w-8 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-light text-[#1c1c1c] tracking-wide mb-1 group-hover:text-[#0a0a0a] transition-colors">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-400 font-light line-clamp-1">{item.description}</p>
                  )}
                </div>
                <span className="text-lg font-light text-[#3c3c3c] shrink-0">{formatCurrency(item.price)}</span>
                {item.image_url && (
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 opacity-55 group-hover:opacity-85 transition-opacity">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  </div>
                )}
              </Link>
            ))}
            <div className="mt-12">
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] font-medium transition hover:opacity-60"
                style={{ color: accent }}>
                Full Menu <ChevronRight size={11} />
              </Link>
            </div>
          </section>
        )}

        {/* Hours */}
        {showHours && hours.length > 0 && (
          <section className="py-20 border-t border-gray-200">
            <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-12">Hours</p>
            <div className="space-y-3">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className="flex items-center justify-between py-1">
                    <span className={`text-sm font-light tracking-[0.12em] uppercase ${isToday ? 'text-[#1c1c1c]' : 'text-gray-400'}`}>
                      {DAY_NAMES[h.day_of_week].slice(0, 3)}
                    </span>
                    <span className={`text-sm font-light ${h.is_closed ? 'text-gray-200' : isToday ? '' : 'text-gray-400'}`}
                      style={isToday && !h.is_closed ? { color: accent } : {}}>
                      {h.is_closed ? '—' : `${h.open_time} – ${h.close_time}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Gallery — tight grid with generous hover */}
        {showGallery && galleryUrls.length > 0 && (
          <section className="py-20 border-t border-gray-200">
            <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-12">Gallery</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden bg-gray-100 group">
                  <Image src={url} alt={`Photo ${i + 1}`} fill
                    className="object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-16 border-t border-gray-200 grid sm:grid-cols-3 gap-10 text-sm">
          {restaurant.address && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-gray-300 mb-3">Location</p>
              <p className="font-light text-gray-500">{restaurant.address}</p>
            </div>
          )}
          {restaurant.phone && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-gray-300 mb-3">Contact</p>
              <a href={`tel:${restaurant.phone}`} className="font-light text-gray-500 hover:text-[#1c1c1c] transition">{restaurant.phone}</a>
            </div>
          )}
          {hasOrdering && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-gray-300 mb-3">Order</p>
              <Link href={`/restaurant/${slug}/menu`} className="font-light transition hover:opacity-70" style={{ color: accent }}>
                View Menu →
              </Link>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
