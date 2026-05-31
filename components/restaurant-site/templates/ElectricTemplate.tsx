import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, MapPin, Phone, Plus } from 'lucide-react'
import { DAY_NAMES, type TemplateProps } from './types'
import { formatCurrency } from '@/lib/utils/helpers'

export default function ElectricTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured,
}: TemplateProps) {
  const todayDay = new Date().getDay()
  const hasOrdering = orderTypes.length > 0

  return (
    <div className="min-h-screen bg-white">

      {/* Oversized impact hero */}
      <section className="relative h-[82vh] min-h-[520px] overflow-hidden">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover scale-105" priority />
            <div className="absolute inset-0 bg-black/52" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0a]" />
        )}

        <div className="absolute inset-0 flex flex-col justify-end px-5 sm:px-8 md:px-12 pb-8 md:pb-12">
          {/* Giant name — the hero IS the typography */}
          <h1 className="font-black uppercase text-white leading-none tracking-tighter mb-4"
            style={{ fontSize: 'clamp(3rem, 12vw, 9rem)' }}>
            {heroHeadline || restaurant.name}
          </h1>
          <div className="h-1.5 rounded-full mb-6 w-20" style={{ background: accent }} />
          {heroSubheadline && (
            <p className="text-white/70 text-base sm:text-lg mb-6 max-w-md font-medium">{heroSubheadline}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${isOpen ? 'bg-green-400 text-black' : 'bg-red-500 text-white'}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${isOpen ? 'animate-pulse' : ''}`} />
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            {hasOrdering && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-black uppercase tracking-wider text-black transition hover:opacity-85 hover:scale-[1.02]"
                style={{ background: accent }}>
                Order Now <ChevronRight size={14} />
              </Link>
            )}
            {restaurant.reservations_enabled && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-black uppercase tracking-wider text-white border-2 border-white/40 hover:border-white transition hover:scale-[1.02]">
                Reserve
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Accent ticker bar */}
      <div className="py-3.5 px-6 flex items-center justify-center gap-6 flex-wrap" style={{ background: accent }}>
        <span className="text-white font-black text-xs uppercase tracking-[0.35em]">
          {restaurant.name}
        </span>
        {(restaurant.cuisine_types ?? []).map(c => (
          <span key={c} className="text-white/75 font-bold text-xs uppercase tracking-widest flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-white/50" /> {c}
          </span>
        ))}
        {(restaurant.address || restaurant.phone) && (
          <span className="text-white/60 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/50" />
            {restaurant.address ?? restaurant.phone}
          </span>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">

        {/* Featured items — bold asymmetric grid */}
        {featured.length > 0 && (
          <section className="mb-28">
            <div className="flex items-end justify-between mb-10 gap-4">
              <h2 className="font-black uppercase text-[#0a0a0a] leading-none tracking-tight"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}>
                The Menu
              </h2>
              <Link href={`/restaurant/${slug}/menu`}
                className="text-xs font-black uppercase tracking-wider shrink-0 hover:opacity-60 transition"
                style={{ color: accent }}>
                See All →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {featured.map((item, i) => (
                <Link key={item.id} href={`/restaurant/${slug}/menu`}
                  className={`group block relative overflow-hidden rounded-2xl bg-gray-100 ${i === 0 && featured.length > 1 ? 'sm:row-span-2' : ''}`}>
                  <div className={`relative ${i === 0 && featured.length > 1 ? 'aspect-[3/4] sm:h-full' : 'aspect-video'}`}
                    style={i === 0 && featured.length > 1 ? { minHeight: '280px' } : {}}>
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: accent + '18' }}>🍽️</div>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 55%)' }} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                    <h3 className="font-black uppercase text-white text-xl sm:text-2xl leading-tight">{item.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-black text-xl sm:text-2xl" style={{ color: accent }}>{formatCurrency(item.price)}</span>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition">
                        <Plus size={18} className="text-white" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* About — bold statement */}
        {aboutBody && (
          <section className="mb-28 py-16 border-y-2 border-[#0a0a0a]">
            <p className="font-black uppercase text-[10px] tracking-[0.5em] text-gray-400 mb-6">About</p>
            <p className="text-[#0a0a0a] text-xl sm:text-2xl font-medium leading-relaxed max-w-2xl">{aboutBody}</p>
            <Link href={`/restaurant/${slug}/about`}
              className="inline-flex items-center gap-2 mt-8 text-sm font-black uppercase tracking-wider transition hover:opacity-60"
              style={{ color: accent }}>
              Our Story <ChevronRight size={13} />
            </Link>
          </section>
        )}

        {/* Hours */}
        {showHours && hours.length > 0 && (
          <section className="mb-28">
            <h3 className="font-black uppercase text-[#0a0a0a] text-3xl sm:text-4xl mb-10 leading-none">Hours</h3>
            <div className="grid sm:grid-cols-2 gap-2 max-w-lg">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className={`flex items-center justify-between px-5 py-4 rounded-2xl text-sm ${isToday ? 'text-white' : 'bg-gray-50 text-gray-500'}`}
                    style={isToday ? { background: accent } : {}}>
                    <span className="font-black uppercase tracking-wide">{DAY_NAMES[h.day_of_week].slice(0, 3)}</span>
                    <span className={`font-bold ${h.is_closed ? 'opacity-50' : ''}`}>
                      {h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Gallery */}
        {showGallery && galleryUrls.length > 0 && (
          <section className="mb-20">
            <h3 className="font-black uppercase text-[#0a0a0a] text-3xl sm:text-4xl mb-10 leading-none">Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Location strip */}
        {(restaurant.address || restaurant.phone) && (
          <section className="py-12 flex flex-wrap gap-8 items-start" style={{ borderTop: '2px solid #0a0a0a' }}>
            {restaurant.address && (
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: accent }} />
                <p className="font-medium text-[#0a0a0a] text-sm">{restaurant.address}</p>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} style={{ color: accent }} />
                <a href={`tel:${restaurant.phone}`} className="font-medium text-[#0a0a0a] text-sm hover:underline">{restaurant.phone}</a>
              </div>
            )}
            {hasOrdering && (
              <div className="ml-auto">
                <Link href={`/restaurant/${slug}/menu`}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-black uppercase tracking-wider text-black transition hover:opacity-85"
                  style={{ background: accent }}>
                  Order Online <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
