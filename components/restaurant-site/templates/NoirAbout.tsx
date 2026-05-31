import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

function CinematicDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-6 mb-14">
      <div className="flex-1 h-px" style={{ background: 'rgba(240,237,232,0.07)' }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.45em]" style={{ color: 'rgba(240,237,232,0.28)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(240,237,232,0.07)' }} />
    </div>
  )
}

export default function NoirAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#0c0c0c]" style={{ color: '#f0ede8' }}>
      {/* Hero */}
      <section className="relative h-72 md:h-[420px]">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/85" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c] via-[#1a1612] to-[#0c0c0c]" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center pb-12 px-6">
          <div className="w-10 h-px mb-8" style={{ background: 'rgba(255,255,255,0.18)' }} />
          <h1 className="text-4xl sm:text-5xl font-light italic tracking-[0.06em] text-white">{aboutTitle}</h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-24 space-y-28">

        {aboutBody && (
          <section>
            <CinematicDivider label="I — Our Story" />
            <div className="grid md:grid-cols-5 gap-10 md:gap-16">
              <div className="md:col-span-2">
                <h2 className="text-3xl font-light italic" style={{ color: 'rgba(240,237,232,0.85)' }}>{restaurant.name}</h2>
              </div>
              <p className="md:col-span-3 leading-loose whitespace-pre-line text-[15px]" style={{ color: 'rgba(240,237,232,0.45)' }}>{aboutBody}</p>
            </div>
          </section>
        )}

        {/* Contact */}
        <section>
          <CinematicDivider label="II — Find Us" />
          <div className="grid sm:grid-cols-2 gap-6">
            {restaurant.address && (
              <div className="p-6" style={{ border: '1px solid rgba(240,237,232,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <MapPin size={14} style={{ color: 'rgba(240,237,232,0.3)' }} />
                  <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(240,237,232,0.3)' }}>Address</p>
                </div>
                <p className="text-sm" style={{ color: 'rgba(240,237,232,0.6)' }}>{restaurant.address}</p>
                {showMapLink && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-[11px] uppercase tracking-widest transition hover:opacity-70"
                    style={{ color: accent }}>
                    Directions <ChevronRight size={10} />
                  </a>
                )}
              </div>
            )}
            {restaurant.phone && (
              <div className="p-6" style={{ border: '1px solid rgba(240,237,232,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Phone size={14} style={{ color: 'rgba(240,237,232,0.3)' }} />
                  <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(240,237,232,0.3)' }}>Phone</p>
                </div>
                <a href={`tel:${restaurant.phone}`} className="text-sm transition hover:opacity-90"
                  style={{ color: 'rgba(240,237,232,0.6)' }}>{restaurant.phone}</a>
              </div>
            )}
            {restaurant.email && (
              <div className="p-6" style={{ border: '1px solid rgba(240,237,232,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Mail size={14} style={{ color: 'rgba(240,237,232,0.3)' }} />
                  <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(240,237,232,0.3)' }}>Email</p>
                </div>
                <a href={`mailto:${restaurant.email}`} className="text-sm transition hover:opacity-90"
                  style={{ color: 'rgba(240,237,232,0.6)' }}>{restaurant.email}</a>
              </div>
            )}
            {restaurant.website && (
              <div className="p-6" style={{ border: '1px solid rgba(240,237,232,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Globe size={14} style={{ color: 'rgba(240,237,232,0.3)' }} />
                  <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(240,237,232,0.3)' }}>Website</p>
                </div>
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm transition hover:opacity-70" style={{ color: accent }}>
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Hours */}
        {hours.length > 0 && (
          <section>
            <CinematicDivider label="III — Hours" />
            <div className="grid sm:grid-cols-2 gap-x-16 max-w-xl">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className="flex items-center justify-between py-3.5"
                    style={{ borderBottom: '1px solid rgba(240,237,232,0.06)' }}>
                    <span className="text-sm" style={{ color: isToday ? 'rgba(240,237,232,0.9)' : 'rgba(240,237,232,0.3)' }}>
                      {DAY_NAMES[h.day_of_week]}
                    </span>
                    <span className="text-sm"
                      style={{ color: h.is_closed ? 'rgba(240,237,232,0.18)' : isToday ? accent : 'rgba(240,237,232,0.3)' }}>
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
            <CinematicDivider label="IV — Gallery" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {galleryUrls.map((url, i) => (
                <div key={i} className={`relative overflow-hidden group ${i === 0 ? 'col-span-2 md:col-span-1 row-span-2' : ''}`}
                  style={{ aspectRatio: i === 0 ? '1/1' : '4/3' }}>
                  <Image src={url} alt={`Photo ${i + 1}`} fill
                    className="object-cover transition-all duration-700 group-hover:scale-105 opacity-65 group-hover:opacity-90" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8" style={{ borderTop: '1px solid rgba(240,237,232,0.06)' }}>
          <p className="text-[10px] uppercase tracking-[0.45em] mb-8" style={{ color: 'rgba(240,237,232,0.25)' }}>
            Reservations & Ordering
          </p>
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-3 px-10 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white transition hover:opacity-80"
            style={{ background: accent }}>
            View Menu & Order <ChevronRight size={11} />
          </Link>
        </section>
      </div>
    </div>
  )
}
