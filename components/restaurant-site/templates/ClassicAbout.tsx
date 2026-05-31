import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight, Clock } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

function WarmDivider({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex-1 h-px bg-amber-100" />
      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{label}</p>
      <div className="flex-1 h-px bg-amber-100" />
    </div>
  )
}

export default function ClassicAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#fdf8f3]">
      {/* Hero */}
      <section className="relative h-72 md:h-96">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/50 via-amber-900/55 to-amber-950/75" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #78350f 0%, #92400e 60%, #1c1008 100%)' }} />
        )}
        <div className="absolute inset-0 flex items-end justify-center text-center">
          <div className="px-6 pb-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12 bg-amber-300/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300/60" />
              <div className="h-px w-12 bg-amber-300/40" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide">{aboutTitle}</h1>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        {/* About text */}
        {aboutBody && (
          <section className="text-center max-w-2xl mx-auto">
            <WarmDivider label="Our story" accent={accent} />
            <p className="text-gray-600 leading-loose text-base whitespace-pre-line">{aboutBody}</p>
          </section>
        )}

        {/* Contact */}
        <section>
          <WarmDivider label="Find us" accent={accent} />
          <div className="grid sm:grid-cols-2 gap-4">
            {restaurant.address && (
              <div className="flex gap-4 p-5 bg-white border border-amber-100 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                  <MapPin size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700/50 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm text-gray-800 font-medium">{restaurant.address}</p>
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
              <div className="flex gap-4 p-5 bg-white border border-amber-100 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                  <Phone size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700/50 uppercase tracking-wider mb-1">Phone</p>
                  <a href={`tel:${restaurant.phone}`} className="text-sm text-gray-800 font-medium hover:underline">{restaurant.phone}</a>
                </div>
              </div>
            )}
            {restaurant.email && (
              <div className="flex gap-4 p-5 bg-white border border-amber-100 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                  <Mail size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700/50 uppercase tracking-wider mb-1">Email</p>
                  <a href={`mailto:${restaurant.email}`} className="text-sm text-gray-800 font-medium hover:underline">{restaurant.email}</a>
                </div>
              </div>
            )}
            {restaurant.website && (
              <div className="flex gap-4 p-5 bg-white border border-amber-100 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                  <Globe size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700/50 uppercase tracking-wider mb-1">Website</p>
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
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-px bg-amber-100" />
              <Clock size={14} style={{ color: accent }} />
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>Hours</p>
              <div className="flex-1 h-px bg-amber-100" />
            </div>
            <div className="grid sm:grid-cols-2 gap-2 max-w-md mx-auto">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id}
                    className={`flex items-center justify-between px-5 py-3 rounded-xl text-sm ${isToday ? 'bg-white border-2 shadow-sm font-bold' : 'bg-amber-50'}`}
                    style={isToday ? { borderColor: accent, color: accent } : { color: '#92400e' }}>
                    <span>{DAY_NAMES[h.day_of_week]}{isToday ? ' (today)' : ''}</span>
                    <span className={h.is_closed ? 'text-amber-200' : ''}>{h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Gallery */}
        {showGallery && galleryUrls.length > 0 && (
          <section>
            <WarmDivider label="Gallery" accent={accent} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-amber-100 shadow-sm border border-amber-100">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-10 border-t border-amber-100">
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">Join us for a meal</h3>
          <p className="text-amber-700/50 text-sm mb-8">Reserve a table or order online — we&apos;re ready for you.</p>
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
