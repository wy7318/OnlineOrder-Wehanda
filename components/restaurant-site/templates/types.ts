export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export type TemplateId = 'modern' | 'bold' | 'minimal' | 'classic' | 'noir' | 'organic' | 'electric' | 'zen'

export interface TemplateRestaurant {
  name: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  cover_image_url: string | null
  logo_url: string | null
  cuisine_types: string[] | null
  pickup_enabled: boolean | null
  delivery_enabled: boolean | null
  dine_in_enabled: boolean | null
  reservations_enabled: boolean | null
}

export interface TemplateHour {
  id: string | number
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean | null
}

export interface TemplateFeaturedItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
}

export interface TemplateLoyalty {
  is_enabled: boolean | null
  program_name: string | null
  points_per_dollar: number | null
}

export interface AboutTemplateProps {
  restaurant: TemplateRestaurant
  accent: string
  aboutTitle: string
  aboutBody: string | null
  showGallery: boolean
  showMapLink: boolean
  galleryUrls: string[]
  hours: TemplateHour[]
  slug: string
}

export interface TemplateProps {
  restaurant: TemplateRestaurant
  accent: string
  heroHeadline: string
  heroSubheadline: string
  aboutTitle: string
  aboutBody: string | null
  showHours: boolean
  showGallery: boolean
  galleryUrls: string[]
  orderTypes: string[]
  isOpen: boolean
  slug: string
  hours: TemplateHour[]
  featured: TemplateFeaturedItem[]
  loyalty: TemplateLoyalty | null
}
