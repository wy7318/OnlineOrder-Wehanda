import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

export default function ZenAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#f9f8f7]">
      {/* Minimal text hero — no overlay drama */}
      <section className="relative pt-32 pb-16 px-6 text-center border-b border-gray-200">
        {restaurant.cover_image_url && (
          <div className="absolute inset-0">
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover opacity-[0.06]" priority />
          </div>
        )}
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-8">{restaurant.name}</p>
          <h1 className="font-extralight tracking-[0.1em] text-[#1c1c1c] leading-tight mb-6"
            style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}>
            {aboutTitle}
          </h1>
          <div className="w-px h-10 bg-gray-300 mx-auto" />
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">

        {aboutBody && (
          <section className="py-20 border-b border-gray-200">
            <p className="text-[#3c3c3c] font-light text-lg leading-loose whitespace-pre-line">{aboutBody}</p>
          </section>
        )}

        {/* Contact — clean minimal list */}
        <section className="py-20 border-b border-gray-200">
          <p className="text-[10px] uppercase tracking-[0.65em] text-gray-400 mb-12">Contact & Location</p>
          <div className="space-y-6">
            {restaurant.address && (
              <div className="flex items-start gap-4">
                <MapPin size={14} className="text-gray-300 mt-0.5 shrink-0" />
                <div>
                  <p className="font-light text-[#3c3c3c]">{restaurant.address}</p>
                  {showMapLink && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[11px] uppercase tracking-[0.3em] font-medium transition hover:opacity-60"
                      style={{ color: accent }}>
                      Directions <ChevronRight size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-4">
                <Phone size={14} className="text-gray-300 shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="font-light text-[#3c3c3c] hover:text-[#1c1c1c] transition">{restaurant.phone}</a>
              </div>
            )}
            {restaurant.email && (
              <div className="flex items-center gap-4">
                <Mail size={14} className="text-gray-300 shrink-0" />
                <a href={`mailto:${restaurant.email}`} className="font-light text-[#3c3c3c] hover:text-[#1c1c1c] transition">{restaurant.email}</a>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-4">
                <Globe size={14} className="text-gray-300 shrink-0" />
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                  className="font-light transition hover:opacity-70" style={{ color: accent }}>
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </section>

        {hours.length > 0 && (
          <section className="py-20 border-b border-gray-200">
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

        {showGallery && galleryUrls.length > 0 && (
          <section className="py-20 border-b border-gray-200">
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

        <section className="py-20 text-center">
          <div className="w-px h-10 bg-gray-300 mx-auto mb-10" />
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-2 px-8 py-3 text-[11px] uppercase tracking-[0.3em] font-medium text-white transition hover:opacity-80"
            style={{ background: accent }}>
            View Menu <ChevronRight size={11} />
          </Link>
        </section>
      </div>
    </div>
  )
}
