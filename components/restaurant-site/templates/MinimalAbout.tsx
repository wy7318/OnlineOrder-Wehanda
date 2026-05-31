import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

export default function MinimalAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero — flat, contained, not full-bleed */}
      <section className="pt-28 pb-12 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">{aboutTitle}</h1>
        <div className="w-12 h-1 rounded-full" style={{ background: accent }} />
      </section>

      {restaurant.cover_image_url && (
        <div className="max-w-4xl mx-auto px-6 mb-16">
          <div className="relative w-full aspect-[16/7] rounded-3xl overflow-hidden bg-stone-200">
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 space-y-16 pb-20">
        {/* About text */}
        {aboutBody && (
          <section className="lg:flex lg:gap-20">
            <div className="lg:w-1/3 mb-4 lg:mb-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Our story</p>
            </div>
            <p className="lg:w-2/3 text-gray-600 leading-relaxed text-base whitespace-pre-line">{aboutBody}</p>
          </section>
        )}

        <hr className="border-gray-200" />

        {/* Contact — clean list, not cards */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Contact & Location</p>
          <div className="space-y-4 max-w-sm">
            {restaurant.address && (
              <div className="flex items-start gap-3">
                <MapPin size={15} className="text-gray-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-800">{restaurant.address}</p>
                  {showMapLink && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold mt-1 inline-flex items-center gap-0.5 hover:opacity-70 transition" style={{ color: accent }}>
                      Get directions <ChevronRight size={11} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-3">
                <Phone size={15} className="text-gray-300 shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="text-sm text-gray-800 hover:text-gray-600 transition">{restaurant.phone}</a>
              </div>
            )}
            {restaurant.email && (
              <div className="flex items-center gap-3">
                <Mail size={15} className="text-gray-300 shrink-0" />
                <a href={`mailto:${restaurant.email}`} className="text-sm text-gray-800 hover:text-gray-600 transition">{restaurant.email}</a>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-3">
                <Globe size={15} className="text-gray-300 shrink-0" />
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm hover:opacity-70 transition" style={{ color: accent }}>
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Hours — simple text list */}
        {hours.length > 0 && (
          <>
            <hr className="border-gray-200" />
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Hours</p>
              <div className="space-y-1 max-w-xs">
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

        {/* Gallery — masonry */}
        {showGallery && galleryUrls.length > 0 && (
          <>
            <hr className="border-gray-200" />
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Gallery</p>
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {galleryUrls.map((url, i) => (
                  <div key={i} className="break-inside-avoid rounded-2xl overflow-hidden bg-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full object-cover hover:opacity-90 transition-opacity" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* CTA */}
        <section className="border-t border-gray-200 pt-16 text-center">
          <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Ready to order?</h3>
          <p className="text-gray-400 text-sm mb-8">Online ordering — fast, simple, no app needed.</p>
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-sm transition hover:opacity-90"
            style={{ background: accent }}>
            Order Online <ChevronRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  )
}
