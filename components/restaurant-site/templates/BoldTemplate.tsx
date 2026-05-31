import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, CalendarDays, ChevronRight, Utensils, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import { DAY_NAMES, type TemplateProps } from './types'

export default function BoldTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured, loyalty,
}: TemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* Hero — split layout on desktop, stacked on mobile */}
      <section className="relative min-h-screen flex flex-col lg:flex-row">

        {/* Left: text */}
        <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-32 lg:py-0 lg:w-1/2 xl:w-[55%]">
          <div className="flex items-center gap-2 mb-8">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isOpen ? 'text-white' : 'text-white/70'}`}
              style={{ background: isOpen ? '#16a34a' : '#dc2626' }}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen ? 'animate-pulse' : ''}`} />
              {isOpen ? 'Open now' : 'Closed'}
            </span>
            {orderTypes.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-full border border-white/20 text-white/60 text-xs font-medium">{t}</span>
            ))}
          </div>

          <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6">
            {heroHeadline.split(' ').map((word, i, arr) => (
              <span key={i}>
                <span className={i === arr.length - 1 ? '' : 'text-white'}>{word}</span>
                {i < arr.length - 1 ? ' ' : ''}
              </span>
            ))}
            <span className="block w-24 h-1.5 mt-4 rounded-full" style={{ background: accent }} />
          </h1>

          {heroSubheadline && (
            <p className="text-lg text-white/50 max-w-md mb-10 leading-relaxed">{heroSubheadline}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-black text-white transition hover:opacity-85"
              style={{ background: accent }}>
              Order Now <ChevronRight size={18} />
            </Link>
            {restaurant.reservations_enabled && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-black border border-white/20 text-white hover:bg-white/10 transition">
                <CalendarDays size={17} /> Reserve
              </Link>
            )}
          </div>

          {restaurant.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
              className="mt-10 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition">
              <MapPin size={14} />{restaurant.address}
            </a>
          )}
        </div>

        {/* Right: image */}
        <div className="relative lg:w-1/2 xl:w-[45%] h-72 lg:h-auto">
          {restaurant.cover_image_url ? (
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${accent}40 0%, ${accent}90 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-transparent to-transparent lg:block hidden" />
        </div>
      </section>

      {/* Loyalty */}
      {loyalty?.is_enabled && (
        <section className="py-5 px-8 sm:px-12 border-t border-white/10" style={{ background: `${accent}18` }}>
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: accent }}>⭐</div>
            <div>
              <p className="font-bold text-sm">{loyalty.program_name ?? 'Rewards Club'}</p>
              <p className="text-xs text-white/50">Earn {loyalty.points_per_dollar ?? 1} point per $1 spent</p>
            </div>
            <Link href={`/restaurant/${slug}/menu`} className="ml-auto text-xs font-bold px-4 py-2 rounded-lg text-white transition hover:opacity-80" style={{ background: accent }}>
              Join Free
            </Link>
          </div>
        </section>
      )}

      {/* Featured items */}
      {featured.length > 0 && (
        <section className="py-20 px-8 sm:px-12 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>Menu highlights</p>
                <h2 className="text-3xl sm:text-4xl font-black">Signature dishes</h2>
              </div>
              <Link href={`/restaurant/${slug}/menu`} className="text-sm font-bold flex items-center gap-1 text-white/50 hover:text-white transition">
                Full menu <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(item => (
                <Link key={item.id} href={`/restaurant/${slug}/menu`}
                  className="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all hover:bg-white/10">
                  <div className="relative aspect-[4/3] bg-white/5">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Utensils size={24} className="text-white/20" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm leading-snug mb-1">{item.name}</p>
                    {item.description && <p className="text-xs text-white/40 line-clamp-2 mb-3">{item.description}</p>}
                    <p className="font-black text-sm" style={{ color: accent }}>{formatCurrency(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-white text-sm transition hover:opacity-85"
                style={{ background: accent }}>
                Order Online <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {aboutBody && (
        <section className="py-20 px-8 sm:px-12 border-t border-white/10 bg-[#141414]">
          <div className="max-w-5xl mx-auto lg:flex lg:gap-20 lg:items-start">
            <div className="lg:w-1/3 mb-8 lg:mb-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accent }}>Our story</p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">{aboutTitle}</h2>
              <Link href={`/restaurant/${slug}/about`} className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-white/50 hover:text-white transition">
                Learn more <ChevronRight size={14} />
              </Link>
            </div>
            <div className="lg:w-2/3">
              <p className="text-white/60 leading-relaxed text-base whitespace-pre-line">{aboutBody}</p>
            </div>
          </div>
        </section>
      )}

      {/* Hours */}
      {showHours && hours.length > 0 && (
        <section className="py-20 px-8 sm:px-12 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Clock size={16} style={{ color: accent }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>Hours</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className={`flex flex-col px-4 py-3 rounded-xl text-sm ${isToday ? 'border' : 'bg-white/5'}`}
                    style={isToday ? { borderColor: accent, background: `${accent}15` } : {}}>
                    <span className={`text-xs font-bold mb-1 ${isToday ? '' : 'text-white/40'}`} style={isToday ? { color: accent } : {}}>
                      {DAY_NAMES[h.day_of_week]}{isToday ? ' ←' : ''}
                    </span>
                    <span className={h.is_closed ? 'text-white/25' : 'font-semibold'}>
                      {h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {showGallery && galleryUrls.length > 0 && (
        <section className="border-t border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {galleryUrls.slice(0, 6).map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden bg-white/5">
                <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover hover:scale-110 transition-transform duration-500 hover:opacity-80" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA footer */}
      <section className="py-20 px-8 sm:px-12 border-t border-white/10 bg-[#141414] text-center">
        <h2 className="text-3xl sm:text-4xl font-black mb-3">Ready to order?</h2>
        <p className="text-white/40 mb-10 text-base">Skip the line. Order online.</p>
        <Link href={`/restaurant/${slug}/menu`}
          className="inline-flex items-center gap-2 px-10 py-5 rounded-xl font-black text-white text-base transition hover:opacity-85"
          style={{ background: accent }}>
          Start Your Order <ChevronRight size={20} />
        </Link>
        <div className="mt-12 flex flex-wrap gap-6 justify-center text-white/30 text-sm">
          {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="hover:text-white/70 transition flex items-center gap-2"><Phone size={13} />{restaurant.phone}</a>}
          {restaurant.email && <a href={`mailto:${restaurant.email}`} className="hover:text-white/70 transition flex items-center gap-2"><Mail size={13} />{restaurant.email}</a>}
        </div>
        <p className="mt-10 text-white/20 text-xs">Powered by Wehanda</p>
      </section>
    </div>
  )
}
