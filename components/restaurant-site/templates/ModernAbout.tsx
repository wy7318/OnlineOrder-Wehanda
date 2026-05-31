import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight, Clock } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

export default function ModernAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-64 md:h-80">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)` }} />
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-4xl w-full mx-auto px-6 pb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{aboutTitle}</h1>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-14">
        {/* About text */}
        {aboutBody && (
          <section>
            <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">{aboutBody}</p>
          </section>
        )}

        {/* Contact */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: accent }}>Find us</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {restaurant.address && (
              <div className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
                  <MapPin size={18} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm text-gray-800 font-medium">{restaurant.address}</p>
                  {showMapLink && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold mt-2 inline-flex items-center gap-1 transition hover:opacity-70" style={{ color: accent }}>
                      Get directions <ChevronRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
                  <Phone size={18} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                  <a href={`tel:${restaurant.phone}`} className="text-sm text-gray-800 font-medium hover:underline">{restaurant.phone}</a>
                </div>
              </div>
            )}
            {restaurant.email && (
              <div className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
                  <Mail size={18} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                  <a href={`mailto:${restaurant.email}`} className="text-sm text-gray-800 font-medium hover:underline">{restaurant.email}</a>
                </div>
              </div>
            )}
            {restaurant.website && (
              <div className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
                  <Globe size={18} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Website</p>
                  <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline" style={{ color: accent }}>
                    {restaurant.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Hours */}
        {hours.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Clock size={16} style={{ color: accent }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>Hours</p>
            </div>
            <div className="space-y-2 max-w-sm">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${isToday ? 'font-bold border-2' : 'bg-gray-50 text-gray-700'}`}
                    style={isToday ? { borderColor: accent, background: `${accent}08`, color: accent } : {}}>
                    <span>{DAY_NAMES[h.day_of_week]}{isToday ? ' (today)' : ''}</span>
                    <span className={h.is_closed ? 'text-gray-400 font-normal' : ''}>
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
          <section>
            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: accent }}>Gallery</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8 border-t border-gray-100">
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Ready to order?</h3>
          <p className="text-gray-500 text-sm mb-6">Skip the wait — order online for pickup or delivery.</p>
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-sm transition hover:opacity-90"
            style={{ background: accent }}>
            Order Online <ChevronRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  )
}
