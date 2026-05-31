import type { Metadata } from 'next'
import Link from 'next/link'
import ModernTemplate from '@/components/restaurant-site/templates/ModernTemplate'
import type { TemplateProps } from '@/components/restaurant-site/templates/types'

export const metadata: Metadata = {
  title: 'Live Demo — Wehanda Restaurant Ordering Page',
  description:
    'See exactly what your customers will see when they visit your restaurant on Wehanda. A live demo of a fully functional ordering page.',
}

// Hardcoded demo data — no database call needed
const DEMO_PROPS: TemplateProps = {
  restaurant: {
    name: 'Sakura Kitchen',
    description:
      'Authentic Japanese cuisine with fresh fish flown in daily. From traditional omakase to casual ramen, everything is made from scratch.',
    address: '123 Market St, San Francisco, CA 94105',
    phone: '(415) 555-0192',
    email: 'hello@sakurakitchen.com',
    website: null,
    cover_image_url: null,
    logo_url: null,
    cuisine_types: ['Japanese', 'Sushi', 'Ramen'],
    pickup_enabled: true,
    delivery_enabled: false,
    dine_in_enabled: true,
    reservations_enabled: true,
  },
  accent: '#037FFC',
  heroHeadline: 'Fresh Sushi & Ramen in the Heart of SF',
  heroSubheadline: 'Order online for pickup or dine in — made fresh to order, every time.',
  aboutTitle: 'Our Story',
  aboutBody:
    "Sakura Kitchen started in 2018 as a small sushi counter on Market Street. Today our regulars keep coming back for the Dragon Roll and the tonkotsu ramen. We source directly from the Tokyo fish market twice a week and make every broth from scratch. Come in for lunch or order pickup — either way, it's the same kitchen, same care.",
  showHours: true,
  showGallery: false,
  galleryUrls: [],
  orderTypes: ['Pickup', 'Dine In'],
  isOpen: true,
  slug: 'demo',
  hours: [
    { id: 1, day_of_week: 0, open_time: '11:00', close_time: '21:00', is_closed: false },
    { id: 2, day_of_week: 1, open_time: '11:00', close_time: '22:00', is_closed: false },
    { id: 3, day_of_week: 2, open_time: '11:00', close_time: '22:00', is_closed: false },
    { id: 4, day_of_week: 3, open_time: '11:00', close_time: '22:00', is_closed: false },
    { id: 5, day_of_week: 4, open_time: '11:00', close_time: '22:00', is_closed: false },
    { id: 6, day_of_week: 5, open_time: '11:00', close_time: '23:00', is_closed: false },
    { id: 7, day_of_week: 6, open_time: '11:00', close_time: '22:00', is_closed: false },
  ],
  featured: [
    {
      id: '1',
      name: 'Dragon Roll',
      description: 'Shrimp tempura, avocado, cucumber topped with thinly sliced fresh salmon.',
      price: 18.5,
      image_url: null,
    },
    {
      id: '2',
      name: 'Tonkotsu Ramen',
      description: 'Rich pork bone broth, chashu, soft egg, bamboo shoots, and nori.',
      price: 16.0,
      image_url: null,
    },
    {
      id: '3',
      name: 'Salmon Sashimi (8pc)',
      description: 'Premium Atlantic salmon sliced to order, served with wasabi and pickled ginger.',
      price: 22.0,
      image_url: null,
    },
    {
      id: '4',
      name: 'Gyoza (6pc)',
      description: 'Pan-fried pork and cabbage dumplings with house ponzu dipping sauce.',
      price: 9.5,
      image_url: null,
    },
  ],
  loyalty: {
    is_enabled: true,
    program_name: 'Sakura Rewards',
    points_per_dollar: 1,
  },
}

export default function DemoPage() {
  return (
    <>
      {/* Demo banner */}
      <div className="sticky top-0 z-[100] bg-brand-600 text-white text-center text-sm py-2.5 px-4 flex items-center justify-center gap-3 flex-wrap">
        <span className="font-medium">
          ✨ Demo preview — this is exactly what your customers see
        </span>
        <Link
          href="/register"
          className="bg-white text-brand-600 font-bold px-4 py-1 rounded-full text-xs hover:bg-brand-50 transition shrink-0"
        >
          Set up your restaurant →
        </Link>
      </div>

      <ModernTemplate {...DEMO_PROPS} />
    </>
  )
}
