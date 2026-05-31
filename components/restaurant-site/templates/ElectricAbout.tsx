import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

export default function ElectricAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-72 md:h-[420px] overflow-hidden">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover scale-105" priority />
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0a]" />
        )}
        <div className="absolute inset-0 flex flex-col items-start justify-end px-5 sm:px-10 pb-8 md:pb-12">
          <h1 className="font-black uppercase text-white leading-none tracking-tighter"
            style={{ fontSize: 'clamp(2.5rem, 9vw, 6rem)' }}>
            {aboutTitle}
          </h1>
          <div className="h-1.5 rounded-full mt-4 w-16" style={{ background: accent }} />
        </div>
      </section>

      {/* Accent bar */}
      <div className="py-3 px-6 flex items-center justify-center" style={{ background: accent }}>
        <span className="text-white font-black text-xs uppercase tracking-[0.4em]">{restaurant.name}</span>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 space-y-20">

        {aboutBody && (
          <section className="py-16 border-y-2 border-[#0a0a0a]">
            <p className="font-black uppercase text-[10px] tracking-[0.5em] text-gray-400 mb-6">About Us</p>
            <p className="text-[#0a0a0a] text-xl sm:text-2xl font-medium leading-relaxed max-w-2xl whitespace-pre-line">{aboutBody}</p>
          </section>
        )}

        {/* Contact grid */}
        <section>
          <h2 className="font-black uppercase text-3xl sm:text-4xl text-[#0a0a0a] mb-8 leading-none">Find Us</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {restaurant.address && (
              <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-[#0a0a0a] transition group">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={15} style={{ color: accent }} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Address</p>
                </div>
                <p className="font-medium text-[#0a0a0a]">{restaurant.address}</p>
                {showMapLink && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-[11px] font-black uppercase tracking-widest transition hover:opacity-70"
                    style={{ color: accent }}>
                    Directions <ChevronRight size={10} />
                  </a>
                )}
              </div>
            )}
            {restaurant.phone && (
              <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-[#0a0a0a] transition">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={15} style={{ color: accent }} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</p>
                </div>
                <a href={`tel:${restaurant.phone}`} className="font-medium text-[#0a0a0a] hover:underline">{restaurant.phone}</a>
              </div>
            )}
            {restaurant.email && (
              <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-[#0a0a0a] transition">
                <div className="flex items-center gap-2 mb-3">
                  <Mail size={15} style={{ color: accent }} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</p>
                </div>
                <a href={`mailto:${restaurant.email}`} className="font-medium text-[#0a0a0a] hover:underline">{restaurant.email}</a>
              </div>
            )}
            {restaurant.website && (
              <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-[#0a0a0a] transition">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={15} style={{ color: accent }} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Website</p>
                </div>
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                  className="font-medium transition hover:opacity-70" style={{ color: accent }}>
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </section>

        {hours.length > 0 && (
          <section>
            <h2 className="font-black uppercase text-3xl sm:text-4xl text-[#0a0a0a] mb-8 leading-none">Hours</h2>
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

        {showGallery && galleryUrls.length > 0 && (
          <section>
            <h2 className="font-black uppercase text-3xl sm:text-4xl text-[#0a0a0a] mb-8 leading-none">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="py-12" style={{ borderTop: '2px solid #0a0a0a' }}>
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-black uppercase tracking-wider text-black transition hover:opacity-85 hover:scale-[1.02]"
            style={{ background: accent }}>
            Order Online <ChevronRight size={14} />
          </Link>
        </section>
      </div>
    </div>
  )
}
