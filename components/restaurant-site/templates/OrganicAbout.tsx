import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, ChevronRight } from 'lucide-react'
import { DAY_NAMES, type AboutTemplateProps } from './types'

function EarthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-5 my-14">
      <div className="flex-1 h-px bg-[#e2d8cc]" />
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c4b5a0]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#a8967e]">{label}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#c4b5a0]" />
      </div>
      <div className="flex-1 h-px bg-[#e2d8cc]" />
    </div>
  )
}

export default function OrganicAbout({
  restaurant, accent, aboutTitle, aboutBody, showGallery, showMapLink, galleryUrls, hours, slug,
}: AboutTemplateProps) {
  const todayDay = new Date().getDay()

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Hero */}
      <section className="relative h-64 md:h-80">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-[#1a1612]/55" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #c4b5a0 0%, #8a7f72 100%)' }} />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center pb-12 px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-white/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <div className="h-px w-8 bg-white/30" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-white">{aboutTitle}</h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {aboutBody && (
          <section>
            <EarthDivider label="Our Story" />
            <p className="text-[#5c5044] leading-loose whitespace-pre-line text-[15px] max-w-2xl mx-auto text-center">{aboutBody}</p>
          </section>
        )}

        <EarthDivider label="Find Us" />
        <div className="grid sm:grid-cols-2 gap-5">
          {restaurant.address && (
            <div className="p-6 bg-white rounded-3xl border border-[#e8e0d4]">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-[#a8967e]" />
                <p className="text-[10px] uppercase tracking-widest text-[#a8967e]">Address</p>
              </div>
              <p className="text-sm text-[#3d342b]">{restaurant.address}</p>
              {showMapLink && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold transition hover:opacity-70"
                  style={{ color: accent }}>
                  Get Directions <ChevronRight size={10} />
                </a>
              )}
            </div>
          )}
          {restaurant.phone && (
            <div className="p-6 bg-white rounded-3xl border border-[#e8e0d4]">
              <div className="flex items-center gap-2 mb-3">
                <Phone size={14} className="text-[#a8967e]" />
                <p className="text-[10px] uppercase tracking-widest text-[#a8967e]">Phone</p>
              </div>
              <a href={`tel:${restaurant.phone}`} className="text-sm text-[#3d342b] hover:underline">{restaurant.phone}</a>
            </div>
          )}
          {restaurant.email && (
            <div className="p-6 bg-white rounded-3xl border border-[#e8e0d4]">
              <div className="flex items-center gap-2 mb-3">
                <Mail size={14} className="text-[#a8967e]" />
                <p className="text-[10px] uppercase tracking-widest text-[#a8967e]">Email</p>
              </div>
              <a href={`mailto:${restaurant.email}`} className="text-sm text-[#3d342b] hover:underline">{restaurant.email}</a>
            </div>
          )}
          {restaurant.website && (
            <div className="p-6 bg-white rounded-3xl border border-[#e8e0d4]">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} className="text-[#a8967e]" />
                <p className="text-[10px] uppercase tracking-widest text-[#a8967e]">Website</p>
              </div>
              <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                className="text-sm transition hover:opacity-70" style={{ color: accent }}>
                {restaurant.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        {hours.length > 0 && (
          <>
            <EarthDivider label="Hours" />
            <div className="max-w-sm mx-auto space-y-2">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className={`flex items-center justify-between py-2.5 text-sm border-b border-[#e8e0d4] ${isToday ? 'font-semibold' : ''}`}>
                    <span className={isToday ? 'text-[#1a1612]' : 'text-[#a8967e]'}>{DAY_NAMES[h.day_of_week]}</span>
                    <span className={h.is_closed ? 'text-[#c4b5a0]' : isToday ? '' : 'text-[#5c5044]'}
                      style={isToday && !h.is_closed ? { color: accent } : {}}>
                      {h.is_closed ? 'Closed' : `${h.open_time} – ${h.close_time}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {showGallery && galleryUrls.length > 0 && (
          <>
            <EarthDivider label="Gallery" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-[#f0e8dc] group">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </>
        )}

        <section className="text-center py-20">
          <h3 className="font-serif text-3xl text-[#1a1612] mb-3">Ready to order?</h3>
          <p className="text-[#8a7f72] text-sm mb-8">Seasonal ingredients, crafted with love.</p>
          <Link href={`/restaurant/${slug}/menu`}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-white font-bold text-sm transition hover:opacity-90"
            style={{ background: accent }}>
            View Menu <ChevronRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  )
}
