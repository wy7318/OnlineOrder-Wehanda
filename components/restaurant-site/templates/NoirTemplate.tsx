import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, MapPin, Phone } from 'lucide-react'
import { DAY_NAMES, type TemplateProps } from './types'
import { formatCurrency } from '@/lib/utils/helpers'

function CinematicDivider({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="flex items-center gap-6 mb-14">
      <div className="flex-1 h-px" style={{ background: 'rgba(240,237,232,0.07)' }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.45em]" style={{ color: 'rgba(240,237,232,0.28)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(240,237,232,0.07)' }} />
    </div>
  )
}

export default function NoirTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured,
}: TemplateProps) {
  const todayDay = new Date().getDay()
  const hasOrdering = orderTypes.length > 0

  return (
    <div className="min-h-screen bg-[#0c0c0c]" style={{ color: '#f0ede8' }}>

      {/* Full-screen Cinematic Hero */}
      <section className="relative h-screen min-h-[600px] max-h-[900px]">
        {restaurant.cover_image_url ? (
          <>
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/85" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c] via-[#1a1612] to-[#0c0c0c]" />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          {restaurant.logo_url && (
            <div className="w-14 h-14 rounded-full overflow-hidden border mb-10" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <Image src={restaurant.logo_url} alt={restaurant.name} width={56} height={56} className="object-cover w-full h-full" />
            </div>
          )}
          <div className="w-10 h-px mb-10" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-light italic tracking-[0.06em] text-white leading-tight mb-6">
            {heroHeadline || restaurant.name}
          </h1>
          <div className="w-10 h-px mb-8" style={{ background: 'rgba(255,255,255,0.2)' }} />
          {heroSubheadline && (
            <p className="text-sm uppercase tracking-[0.32em] mb-8 max-w-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {heroSubheadline}
            </p>
          )}
          {(restaurant.cuisine_types ?? []).length > 0 && (
            <p className="text-[11px] uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {restaurant.cuisine_types!.join('  ·  ')}
            </p>
          )}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className={`inline-flex items-center gap-2 px-5 py-2 border text-[11px] font-medium uppercase tracking-[0.2em] ${isOpen ? '' : ''}`}
              style={{ borderColor: isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.35)', color: isOpen ? 'rgba(255,255,255,0.55)' : 'rgba(239,68,68,0.65)' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'animate-pulse' : ''}`}
                style={{ background: isOpen ? '#4ade80' : '#ef4444' }} />
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            {hasOrdering && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-7 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:opacity-80"
                style={{ background: accent }}>
                Order Online <ChevronRight size={11} />
              </Link>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="text-[9px] uppercase tracking-[0.45em]" style={{ color: 'rgba(255,255,255,0.22)' }}>Scroll</span>
          <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)' }} />
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-28 space-y-32">

        {/* About */}
        {aboutBody && (
          <section>
            <CinematicDivider label="I — Our Story" accent={accent} />
            <div className="grid md:grid-cols-5 gap-10 md:gap-16 items-start">
              <div className="md:col-span-2">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light italic leading-tight" style={{ color: 'rgba(240,237,232,0.88)' }}>
                  {aboutTitle || restaurant.name}
                </h2>
              </div>
              <div className="md:col-span-3">
                <p className="leading-loose whitespace-pre-line text-[15px]" style={{ color: 'rgba(240,237,232,0.45)' }}>{aboutBody}</p>
                <Link href={`/restaurant/${slug}/about`}
                  className="inline-flex items-center gap-2 mt-10 text-[11px] uppercase tracking-[0.28em] transition hover:opacity-60"
                  style={{ color: accent }}>
                  Our Story <ChevronRight size={11} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <section>
            <CinematicDivider label="II — Featured" accent={accent} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((item, i) => (
                <Link key={item.id} href={`/restaurant/${slug}/menu`}
                  className={`group block relative overflow-hidden transition-all duration-500 ${i === 0 && featured.length >= 3 ? 'sm:row-span-2' : ''}`}
                  style={{ border: '1px solid rgba(240,237,232,0.06)' }}>
                  <div className={`relative bg-white/[0.02] ${i === 0 && featured.length >= 3 ? 'aspect-[3/4] sm:h-full' : 'aspect-[4/3]'}`}
                    style={i === 0 && featured.length >= 3 ? { minHeight: '300px' } : {}}>
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill
                        className="object-cover transition-all duration-700 group-hover:scale-105"
                        style={{ opacity: 0.75 }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'rgba(255,255,255,0.06)' }}>✦</div>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 60%)' }} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-[10px] uppercase tracking-[0.32em] mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="font-light text-[17px] text-white leading-snug">{item.name}</h3>
                    <p className="mt-1.5 text-sm font-medium" style={{ color: accent }}>{formatCurrency(item.price)}</p>
                  </div>
                  {/* Hover border accent */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ border: `1px solid ${accent}40` }} />
                </Link>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] transition hover:opacity-60"
                style={{ color: accent }}>
                View Full Menu <ChevronRight size={11} />
              </Link>
            </div>
          </section>
        )}

        {/* Hours */}
        {showHours && hours.length > 0 && (
          <section>
            <CinematicDivider label="III — Hours" accent={accent} />
            <div className="grid sm:grid-cols-2 gap-x-16 max-w-xl">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid rgba(240,237,232,0.06)' }}>
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
            <CinematicDivider label="IV — Gallery" accent={accent} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {galleryUrls.map((url, i) => (
                <div key={i} className={`relative overflow-hidden group ${i === 0 ? 'col-span-2 md:col-span-1 row-span-2' : ''}`}
                  style={{ aspectRatio: i === 0 ? '1/1' : '4/3' }}>
                  <Image src={url} alt={`Photo ${i + 1}`} fill
                    className="object-cover transition-all duration-700 group-hover:scale-105"
                    style={{ opacity: 0.65 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer info grid */}
        <section className="grid sm:grid-cols-3 gap-10 pt-16" style={{ borderTop: '1px solid rgba(240,237,232,0.06)' }}>
          {restaurant.address && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: 'rgba(240,237,232,0.22)' }}>Location</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,237,232,0.45)' }}>{restaurant.address}</p>
            </div>
          )}
          {restaurant.phone && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: 'rgba(240,237,232,0.22)' }}>Contact</p>
              <a href={`tel:${restaurant.phone}`} className="text-sm transition hover:opacity-90"
                style={{ color: 'rgba(240,237,232,0.45)' }}>{restaurant.phone}</a>
            </div>
          )}
          {hasOrdering && (
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: 'rgba(240,237,232,0.22)' }}>Reserve / Order</p>
              <Link href={`/restaurant/${slug}/menu`} className="text-sm transition hover:opacity-70" style={{ color: accent }}>
                View Menu →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
