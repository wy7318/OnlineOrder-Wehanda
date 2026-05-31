import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, MapPin, Phone, Clock } from 'lucide-react'
import { DAY_NAMES, type TemplateProps } from './types'
import { formatCurrency } from '@/lib/utils/helpers'

function EarthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-5 my-16">
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

export default function OrganicTemplate({
  restaurant, accent, heroHeadline, heroSubheadline, aboutTitle, aboutBody,
  showHours, showGallery, galleryUrls, orderTypes, isOpen, slug, hours, featured,
}: TemplateProps) {
  const todayDay = new Date().getDay()
  const hasOrdering = orderTypes.length > 0

  return (
    <div className="min-h-screen bg-[#faf7f2]">

      {/* Split hero */}
      <section className="min-h-[70vh] grid md:grid-cols-2">
        {/* Image — stacks above on mobile */}
        <div className="relative h-64 md:h-auto md:order-2 overflow-hidden">
          {restaurant.cover_image_url ? (
            <Image src={restaurant.cover_image_url} alt={restaurant.name} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #d9ccc0 0%, #c4b5a0 100%)' }} />
          )}
        </div>

        {/* Text half */}
        <div className="flex flex-col justify-end p-8 md:p-14 md:order-1 bg-[#faf7f2]">
          {restaurant.logo_url && (
            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#e2d8cc] mb-10 shrink-0">
              <Image src={restaurant.logo_url} alt={restaurant.name} width={48} height={48} className="object-cover w-full h-full" />
            </div>
          )}
          {(restaurant.cuisine_types ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {restaurant.cuisine_types!.map(c => (
                <span key={c} className="text-[10px] uppercase tracking-[0.3em] text-[#a8967e] px-3 py-1 border border-[#e2d8cc] rounded-full bg-white/60">
                  {c}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-[#1a1612] leading-[1.1] mb-4">
            {heroHeadline || restaurant.name}
          </h1>
          {heroSubheadline && (
            <p className="text-[#8a7f72] text-[15px] leading-relaxed mb-8 max-w-sm">{heroSubheadline}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold border ${isOpen ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isOpen ? 'Open' : 'Closed'}
            </span>
            {hasOrdering && (
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest text-white transition hover:opacity-85"
                style={{ background: accent }}>
                Order Online <ChevronRight size={11} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* About */}
        {aboutBody && (
          <section>
            <EarthDivider label="Our Story" />
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-serif text-3xl text-[#1a1612] mb-6">{aboutTitle || restaurant.name}</h2>
              <p className="text-[#5c5044] leading-loose whitespace-pre-line text-[15px]">{aboutBody}</p>
              <Link href={`/restaurant/${slug}/about`}
                className="inline-flex items-center gap-2 mt-8 text-sm font-semibold transition hover:opacity-70"
                style={{ color: accent }}>
                Read More <ChevronRight size={13} />
              </Link>
            </div>
          </section>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <section>
            <EarthDivider label="From Our Kitchen" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(item => (
                <Link key={item.id} href={`/restaurant/${slug}/menu`}
                  className="group block rounded-3xl overflow-hidden bg-white border border-[#e8e0d4] hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="relative aspect-[4/3] bg-[#f0e8dc]">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-[#c4b5a0]">✿</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-lg text-[#1a1612] mb-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-[#8a7f72] text-sm line-clamp-2 leading-relaxed mb-3">{item.description}</p>
                    )}
                    <span className="font-semibold text-sm" style={{ color: accent }}>{formatCurrency(item.price)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href={`/restaurant/${slug}/menu`}
                className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-70"
                style={{ color: accent }}>
                Full Menu <ChevronRight size={13} />
              </Link>
            </div>
          </section>
        )}

        {/* Contact strip */}
        {(restaurant.address || restaurant.phone) && (
          <section className="py-12 border-y border-[#e2d8cc] my-16">
            <div className="flex flex-wrap justify-center gap-10">
              {restaurant.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-[#a8967e] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#5c5044]">{restaurant.address}</p>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={15} className="text-[#a8967e] shrink-0" />
                  <a href={`tel:${restaurant.phone}`} className="text-sm text-[#5c5044] hover:text-[#1a1612] transition">{restaurant.phone}</a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Hours */}
        {showHours && hours.length > 0 && (
          <section>
            <EarthDivider label="When We're Open" />
            <div className="max-w-sm mx-auto space-y-2">
              {hours.map(h => {
                const isToday = h.day_of_week === todayDay
                return (
                  <div key={h.id} className={`flex items-center justify-between py-2.5 text-sm border-b border-[#e8e0d4] ${isToday ? 'font-semibold' : ''}`}>
                    <span className={isToday ? 'text-[#1a1612]' : 'text-[#a8967e]'}>
                      {DAY_NAMES[h.day_of_week]}
                    </span>
                    <span className={h.is_closed ? 'text-[#c4b5a0]' : isToday ? '' : 'text-[#5c5044]'}
                      style={isToday && !h.is_closed ? { color: accent } : {}}>
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
            <EarthDivider label="Gallery" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-[#f0e8dc] group">
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-20">
          <h3 className="font-serif text-3xl text-[#1a1612] mb-3">Come dine with us</h3>
          <p className="text-[#8a7f72] text-sm mb-8">Farm-fresh, made with care — every day.</p>
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
