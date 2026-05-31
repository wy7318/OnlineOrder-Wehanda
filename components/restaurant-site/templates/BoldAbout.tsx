import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight, Clock } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

export default function BoldAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Hero */}
      <section className="relative h-72 md:h-96">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-black/50 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, #111 0%, ${accent}90 100%)` }} />
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl w-full mx-auto px-8 pb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">{aboutTitle}</h1>
            <span className="block w-16 h-1 mt-4 rounded-full" style={{ background: accent }} />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8 py-16 space-y-16">
        {/* About text */}
        {aboutBody && (
          <section className="lg:flex lg:gap-20">
            <div className="lg:w-1/3 mb-6 lg:mb-0">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>Our story</p>
            </div>
            <p className="lg:w-2/3 text-white/60 leading-relaxed text-base whitespace-pre-line">{aboutBody}</p>
          </section>
        )}

        {/* Contact */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: accent }}>Find us</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {restaurant.address && (
              <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}25` }}>
                  <MapPin size={16} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm text-white font-medium">{restaurant.address}</p>
                  {showMapLink && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold mt-2 inline-flex items-center gap-1 hover:opacity-70 transition" style={{ color: accent }}>
                      Get directions <ChevronRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}25` }}>
                  <Phone size={16} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">Phone</p>
                  <a href={`tel:${restaurant.phone}`} className="text-sm text-white font-medium hover:text-white/70 transition">{restaurant.phone}</a>
                </div>
              </div>
            )}
            {restaurant.email && (
              <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}25` }}>
                  <Mail size={16} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">Email</p>
                  <a href={`mailto:${restaurant.email}`} className="text-sm text-white font-medium hover:text-white/70 transition">{restaurant.email}</a>
                </div>
              </div>
            )}
            {restaurant.website && (
              <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}25` }}>
                  <Globe size={16} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">Website</p>
                  <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium hover:opacity-70 transition" style={{ color: accent }}>
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
            <div className="flex items-center gap-2 mb-6">
              <Clock size={15} style={{ color: accent }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>Hours</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id}
                    className={`flex flex-col px-4 py-3 rounded-xl text-sm ${isToday ? 'border' : 'bg-white/5'}`}
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
          </section>
        )}

        {/* Gallery */}
        {showGallery && galleryUrls.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: accent }}>Gallery</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden bg-white/5">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover hover:scale-110 transition-transform duration-500 hover:opacity-80" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-10 border-t border-white/10">
          <h3 className="text-2xl font-black mb-2">Ready to order?</h3>
          <p className="text-white/40 text-sm mb-8">Online ordering — fast, simple, no app needed.</p>
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-white text-sm transition hover:opacity-85"
            style={{ background: accent }}>
            Order Online <ChevronRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  )
}
