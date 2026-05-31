import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, CalendarDays, ChevronRight, Utensils } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'
import { DAY_NAMES, type TemplateProps } from './types'

export default function MinimalTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured, loyalty,
}: TemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-stone-50 text-gray-900">

      {/* Hero — split layout (text left, image right) */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-28 pb-16 lg:flex lg:items-center lg:gap-16 lg:min-h-[90vh]">

        {/* Text */}
        <div className="flex-1 mb-12 lg:mb-0">
          <div className="flex items-center gap-2 mb-8">
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className={`text-xs font-semibold tracking-wide ${isOpen ? 'text-green-600' : 'text-red-500'}`}>
              {isOpen ? 'Open now' : 'Closed'}
            </span>
            {orderTypes.map(t => (
              <span key={t} className="text-xs text-gray-400 font-medium before:content-['·'] before:mr-2">{t}</span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-gray-900 mb-6">
            {heroHeadline}
          </h1>

          {heroSubheadline && (
            <p className="text-lg text-gray-500 max-w-lg mb-10 leading-relaxed">{heroSubheadline}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-10">
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: accent }}>
              Order Now <ChevronRight size={16} />
            </Link>
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold border border-gray-200 text-gray-700 hover:border-gray-400 transition">
              View Menu
            </Link>
            {restaurant.reservations_enabled && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold border border-gray-200 text-gray-700 hover:border-gray-400 transition">
                <CalendarDays size={15} /> Reserve
              </Link>
            )}
          </div>

          {/* Contact line */}
          <div className="flex flex-wrap gap-5 text-sm text-gray-400">
            {restaurant.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-gray-600 transition">
                <MapPin size={13} />{restaurant.address}
              </a>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-gray-600 transition">
                <Phone size={13} />{restaurant.phone}
              </a>
            )}
          </div>
        </div>

        {/* Cover image — contained box */}
        {restaurant.cover_image_url && (
          <div className="relative lg:w-[42%] aspect-[4/5] rounded-3xl overflow-hidden bg-stone-200 shrink-0">
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
          </div>
        )}
      </section>

      <hr className="border-gray-200 mx-6 sm:mx-10" />

      {/* Loyalty */}
      {loyalty?.is_enabled && (
        <section className="max-w-6xl mx-auto px-6 sm:px-10 py-8 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${accent}15` }}>
            <span style={{ color: accent }}>⭐</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{loyalty.program_name ?? 'Rewards Club'}</p>
            <p className="text-xs text-gray-400">Earn {loyalty.points_per_dollar ?? 1} point per $1 — sign in when ordering to start earning</p>
          </div>
          <Link href={`/restaurant/${slug}/menu`} className="ml-auto text-xs font-bold px-4 py-2 rounded-full border transition hover:opacity-80" style={{ color: accent, borderColor: accent }}>
            Join
          </Link>
        </section>
      )}

      {/* Featured items */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Popular dishes</h2>
            <Link href={`/restaurant/${slug}/menu`} className="text-sm font-semibold flex items-center gap-1 text-gray-400 hover:text-gray-700 transition">
              Full menu <ChevronRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {featured.map(item => (
              <Link key={item.id} href={`/restaurant/${slug}/menu`}
                className="group flex items-center gap-5 py-5 hover:bg-stone-100 -mx-4 px-4 rounded-2xl transition">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Utensils size={18} className="text-stone-300" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>}
                </div>
                <p className="font-bold text-sm shrink-0" style={{ color: accent }}>{formatCurrency(item.price)}</p>
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <Link href={`/restaurant/${slug}/menu`}
              className="inline-flex items-center gap-2 text-sm font-bold transition hover:opacity-70" style={{ color: accent }}>
              See everything on our menu <ChevronRight size={15} />
            </Link>
          </div>
        </section>
      )}

      <hr className="border-gray-200 mx-6 sm:mx-10" />

      {/* About */}
      {aboutBody && (
        <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16 lg:flex lg:gap-20">
          <div className="lg:w-1/3 mb-6 lg:mb-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{aboutTitle}</h2>
            <Link href={`/restaurant/${slug}/about`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-gray-700 transition">
              About us <ChevronRight size={13} />
            </Link>
          </div>
          <p className="lg:w-2/3 text-gray-500 leading-relaxed text-base whitespace-pre-line">{aboutBody}</p>
        </section>
      )}

      {/* Hours */}
      {showHours && hours.length > 0 && (
        <>
          <hr className="border-gray-200 mx-6 sm:mx-10" />
          <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
            <h2 className="text-2xl font-extrabold mb-8">Hours</h2>
            <div className="space-y-1 max-w-sm">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className={`flex items-center justify-between py-2 text-sm ${isToday ? 'font-bold' : ''}`}>
                    <span className={isToday ? 'text-gray-900' : 'text-gray-400'}>{DAY_NAMES[h.day_of_week]}{isToday ? ' (today)' : ''}</span>
                    <span className={h.is_closed ? 'text-gray-300' : isToday ? '' : 'text-gray-500'} style={isToday && !h.is_closed ? { color: accent } : {}}>
                      {h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {/* Gallery — masonry columns */}
      {showGallery && galleryUrls.length > 0 && (
        <>
          <hr className="border-gray-200 mx-6 sm:mx-10" />
          <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
            <h2 className="text-2xl font-extrabold mb-8">Gallery</h2>
            <div className="columns-2 sm:columns-3 gap-3 space-y-3">
              {galleryUrls.slice(0, 6).map((url, i) => (
                <div key={i} className="relative break-inside-avoid rounded-2xl overflow-hidden bg-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full object-cover hover:opacity-90 transition-opacity duration-300" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 py-20 text-center border-t border-gray-100">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">Ready to order?</h2>
        <p className="text-gray-400 mb-8 text-sm">Online ordering — fast, simple, no app needed.</p>
        <Link href={`/restaurant/${slug}/menu`}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-sm transition hover:opacity-90"
          style={{ background: accent }}>
          Order Online <ChevronRight size={16} />
        </Link>
        <div className="mt-10 flex flex-wrap gap-5 justify-center text-xs text-gray-300">
          {restaurant.email && <a href={`mailto:${restaurant.email}`} className="flex items-center gap-1.5 hover:text-gray-500 transition"><Mail size={12} />{restaurant.email}</a>}
          {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-gray-500 transition"><Phone size={12} />{restaurant.phone}</a>}
        </div>
        <p className="mt-8 text-gray-200 text-xs">Powered by Wehanda</p>
      </section>
    </div>
  )
}
