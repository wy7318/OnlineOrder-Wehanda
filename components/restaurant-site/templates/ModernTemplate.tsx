import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, CalendarDays, ChevronRight, Utensils } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import { DAY_NAMES, type TemplateProps } from './types'

export default function ModernTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured, loyalty,
}: TemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="relative min-h-[85vh] flex flex-col justify-end">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)` }} />
        )}

        <div className="relative z-10 max-w-4xl mx-auto px-6 pb-16 pt-32 w-full">
          <div className="flex items-center gap-2 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500/80 text-white'}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen ? 'animate-pulse' : ''}`} />
              {isOpen ? 'Open now' : 'Closed'}
            </span>
            {orderTypes.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-medium border border-white/20 backdrop-blur-sm">{t}</span>
            ))}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-4">{heroHeadline}</h1>
          {heroSubheadline && <p className="text-lg sm:text-xl text-white/80 max-w-2xl mb-8 leading-relaxed">{heroSubheadline}</p>}
          <div className="flex flex-wrap gap-3">
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white shadow-2xl transition hover:opacity-90 active:scale-95"
              style={{ background: accent }}>
              Order Now <ChevronRight size={18} />
            </Link>
            {restaurant.reservations_enabled && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold bg-white/15 backdrop-blur-sm border border-white/30 text-white hover:bg-white/25 transition">
                <CalendarDays size={17} /> Reserve a Table
              </Link>
            )}
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold bg-white/15 backdrop-blur-sm border border-white/30 text-white hover:bg-white/25 transition">
              View Menu
            </Link>
          </div>
        </div>
      </section>

      {/* Info strip */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-wrap gap-5 text-sm text-gray-600">
          {restaurant.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-gray-900 transition">
              <MapPin size={15} className="text-gray-400 shrink-0" />{restaurant.address}
            </a>
          )}
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:text-gray-900 transition">
              <Phone size={15} className="text-gray-400 shrink-0" />{restaurant.phone}
            </a>
          )}
          {(restaurant.cuisine_types ?? []).map(c => (
            <span key={c} className="px-2.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">{c}</span>
          ))}
        </div>
      </section>

      {/* Loyalty */}
      {loyalty?.is_enabled && (
        <section className="py-6 px-6" style={{ background: `${accent}10` }}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: accent }}>⭐</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{loyalty.program_name ?? 'Rewards Club'}</p>
              <p className="text-xs text-gray-500">Earn {loyalty.points_per_dollar ?? 1} point per $1. Sign in when ordering to start earning.</p>
            </div>
            <Link href={`/restaurant/${slug}/menu`} className="ml-auto shrink-0 text-xs font-bold px-4 py-2 rounded-xl text-white" style={{ background: accent }}>
              Join Free
            </Link>
          </div>
        </section>
      )}

      {/* Featured items */}
      {featured.length > 0 && (
        <section className="py-14 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>From our menu</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Popular dishes</h2>
              </div>
              <Link href={`/restaurant/${slug}/menu`} className="text-sm font-bold flex items-center gap-1 transition hover:opacity-70" style={{ color: accent }}>
                Full menu <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featured.map(item => (
                <Link key={item.id} href={`/restaurant/${slug}/menu`}
                  className="group flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 transition-all">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Utensils size={20} className="text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-snug mb-1">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{item.description}</p>}
                    <p className="font-extrabold text-sm" style={{ color: accent }}>{formatCurrency(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white text-sm transition hover:opacity-90"
                style={{ background: accent }}>
                See full menu & order <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {aboutBody && (
        <section className="py-14 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Our story</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">{aboutTitle}</h2>
            <p className="text-gray-600 leading-relaxed text-base max-w-2xl whitespace-pre-line">{aboutBody}</p>
            <Link href={`/restaurant/${slug}/about`} className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold transition hover:opacity-70" style={{ color: accent }}>
              Learn more <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Hours */}
      {showHours && hours.length > 0 && (
        <section className="py-14 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>When we&apos;re open</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-7">Hours</h2>
            <div className="grid sm:grid-cols-2 gap-2 max-w-lg">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${isToday ? 'font-bold border-2' : 'bg-gray-50'}`}
                    style={isToday ? { borderColor: accent, color: accent, background: `${accent}08` } : {}}>
                    <span className={isToday ? '' : 'text-gray-600'}>{DAY_NAMES[h.day_of_week]}</span>
                    <span className={h.is_closed ? 'text-gray-400' : ''}>{h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {showGallery && galleryUrls.length > 0 && (
        <section className="py-14 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Gallery</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-7">Our space</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.slice(0, 6).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-200">
                  <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA footer */}
      <section className="py-16 px-6" style={{ background: accent }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Ready to order?</h2>
          <p className="text-white/75 mb-8 text-base">Fresh food, fast ordering — right from your phone.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white rounded-2xl font-bold text-sm hover:bg-gray-50 transition">
              <span style={{ color: accent }}>Start Ordering</span>
            </Link>
            {restaurant.reservations_enabled && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 border border-white/30 rounded-2xl font-bold text-sm text-white hover:bg-white/25 transition">
                <CalendarDays size={16} /> Reserve a Table
              </Link>
            )}
          </div>
          <div className="mt-12 flex flex-wrap gap-6 justify-center text-white/70 text-sm">
            {restaurant.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition">
                <MapPin size={14} />{restaurant.address}
              </a>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:text-white transition">
                <Phone size={14} />{restaurant.phone}
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center gap-2 hover:text-white transition">
                <Mail size={14} />{restaurant.email}
              </a>
            )}
          </div>
          <p className="mt-8 text-white/40 text-xs">Powered by Wehanda</p>
        </div>
      </section>
    </div>
  )
}
