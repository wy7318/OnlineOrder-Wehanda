// All fake data used across demo components.
// Nothing here touches the database — all interactions are local React state.

export interface DemoMenuItem {
  id: string
  name: string
  desc: string
  price: number
  popular?: boolean
}

export interface DemoCategory {
  id: string
  name: string
  items: DemoMenuItem[]
}

export const DEMO_MENU: DemoCategory[] = [
  {
    id: 'appetizers', name: 'Appetizers',
    items: [
      { id: 'a1', name: 'Gyoza (6pc)', desc: 'Pan-fried pork and cabbage dumplings with ponzu dipping sauce.', price: 9.50, popular: true },
      { id: 'a2', name: 'Edamame', desc: 'Salted steamed soybeans, lightly seasoned with sea salt.', price: 5.00 },
      { id: 'a3', name: 'Takoyaki (6pc)', desc: 'Octopus balls with bonito flakes, mayo, and takoyaki sauce.', price: 11.00 },
      { id: 'a4', name: 'Miso Soup', desc: 'Traditional dashi with silken tofu, wakame, and scallion.', price: 4.00 },
    ],
  },
  {
    id: 'rolls', name: 'Sushi Rolls',
    items: [
      { id: 'r1', name: 'Dragon Roll', desc: 'Shrimp tempura, avocado, cucumber — topped with thinly sliced salmon.', price: 18.50, popular: true },
      { id: 'r2', name: 'California Roll', desc: 'Crab, avocado, and cucumber with toasted sesame seeds.', price: 12.00 },
      { id: 'r3', name: 'Spicy Tuna Roll', desc: 'Fresh tuna, sriracha mayo, cucumber, and scallion.', price: 14.50 },
      { id: 'r4', name: 'Rainbow Roll', desc: 'California roll topped with assorted premium sashimi.', price: 19.00, popular: true },
    ],
  },
  {
    id: 'ramen', name: 'Ramen',
    items: [
      { id: 'n1', name: 'Tonkotsu Ramen', desc: 'Rich 12-hour pork bone broth, chashu, soft-boiled egg, bamboo shoots.', price: 16.00, popular: true },
      { id: 'n2', name: 'Spicy Miso Ramen', desc: 'Bold miso broth with chili paste, ground pork, corn, and butter.', price: 15.00 },
      { id: 'n3', name: 'Shoyu Ramen', desc: 'Clear soy-based broth, bamboo shoots, nori, and menma.', price: 14.00 },
    ],
  },
  {
    id: 'desserts', name: 'Desserts',
    items: [
      { id: 'd1', name: 'Mochi Ice Cream (3pc)', desc: 'Choose from matcha, strawberry, or vanilla. All handmade.', price: 8.00 },
      { id: 'd2', name: 'Matcha Tiramisu', desc: 'Japanese-Italian fusion: mascarpone cream with matcha and espresso.', price: 9.00 },
    ],
  },
]

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready'

export interface DemoOrder {
  id: string
  orderNumber: string
  customer: string
  type: 'Pickup' | 'Dine In'
  items: string
  total: number
  status: OrderStatus
  minsAgo: number
}

export const INITIAL_ORDERS: DemoOrder[] = [
  { id: '1', orderNumber: '#0041', customer: 'James P.', type: 'Pickup', items: 'Dragon Roll × 2, Gyoza', total: 46.50, status: 'new', minsAgo: 0 },
  { id: '2', orderNumber: '#0040', customer: 'Sarah C.', type: 'Dine In', items: 'Tonkotsu Ramen, Spicy Tuna Roll', total: 30.50, status: 'new', minsAgo: 3 },
  { id: '3', orderNumber: '#0039', customer: 'Marcus L.', type: 'Pickup', items: 'Rainbow Roll, Edamame, Miso Soup', total: 28.00, status: 'accepted', minsAgo: 6 },
  { id: '4', orderNumber: '#0037', customer: 'Aisha P.', type: 'Pickup', items: 'Tonkotsu Ramen × 2, Gyoza', total: 41.50, status: 'preparing', minsAgo: 12 },
  { id: '5', orderNumber: '#0036', customer: 'Tom W.', type: 'Dine In', items: 'California Roll, Salmon Sashimi', total: 34.00, status: 'preparing', minsAgo: 8 },
  { id: '6', orderNumber: '#0035', customer: 'Emily K.', type: 'Pickup', items: 'California Roll × 3, Gyoza', total: 45.50, status: 'ready', minsAgo: 2 },
]

export const DEMO_CUSTOMERS = [
  { id: '1', name: 'James Park', initials: 'JP', orders: 23, pts: 2400, badge: 'VIP', badgeClass: 'bg-brand-100 text-brand-700', last: '2 days ago', spent: '$1,247', risk: 12 },
  { id: '2', name: 'Sarah Chen', initials: 'SC', orders: 7, pts: 680, badge: 'At Risk', badgeClass: 'bg-red-100 text-red-600', last: '38 days ago', spent: '$312', risk: 87 },
  { id: '3', name: 'Marcus Lee', initials: 'ML', orders: 12, pts: 1150, badge: 'Loyal', badgeClass: 'bg-green-100 text-green-700', last: '5 days ago', spent: '$589', risk: 24 },
  { id: '4', name: 'Aisha Patel', initials: 'AP', orders: 3, pts: 290, badge: 'New', badgeClass: 'bg-gray-100 text-gray-600', last: '1 week ago', spent: '$98', risk: 40 },
  { id: '5', name: 'Tom Wright', initials: 'TW', orders: 31, pts: 3100, badge: 'Top 5%', badgeClass: 'bg-amber-100 text-amber-700', last: 'Yesterday', spent: '$1,780', risk: 8 },
  { id: '6', name: 'Emily Kim', initials: 'EK', orders: 8, pts: 750, badge: 'Regular', badgeClass: 'bg-blue-100 text-blue-700', last: '4 days ago', spent: '$390', risk: 35 },
]

export const DEMO_CAMPAIGNS = [
  { id: 'birthday',   emoji: '🎂', name: 'Birthday',         sent: 3,  clicked: 2, revenue: 0,   status: 'active' as const },
  { id: 'win_back',   emoji: '💌', name: 'Win-Back',          sent: 8,  clicked: 5, revenue: 127, status: 'active' as const },
  { id: 'cart',       emoji: '🛒', name: 'Cart Recovery',     sent: 6,  clicked: 4, revenue: 84,  status: 'active' as const },
  { id: 'after_order',emoji: '⭐', name: 'After-Order',       sent: 14, clicked: 9, revenue: 0,   status: 'active' as const },
  { id: 'milestone',  emoji: '🎉', name: 'Milestone',         sent: 4,  clicked: 3, revenue: 0,   status: 'active' as const },
  { id: 'quiet_day',  emoji: '🌙', name: 'Quiet Day Boost',   sent: 2,  clicked: 1, revenue: 46,  status: 'active' as const },
  { id: 'loyalty',    emoji: '🏆', name: 'Loyalty Nudge',     sent: 5,  clicked: 3, revenue: 0,   status: 'active' as const },
  { id: 'new_item',   emoji: '🍜', name: 'New Item Launch',   sent: 0,  clicked: 0, revenue: 0,   status: 'paused' as const },
]

export const CANNED_AI_WEBSITE = {
  hero_headline: 'Fresh Sushi & Ramen in the Heart of SF',
  hero_subheadline: 'Order online for pickup or dine in — made fresh to order every time. Free pickup, no app fees.',
  about_title: 'Crafted Fresh, Every Day',
  about_body: "Sakura Kitchen has been a Market Street staple since 2018. Our fish arrives twice a week directly from Tokyo's Tsukiji market, and every broth is made from scratch over 12 hours. Our regulars keep coming back for the Dragon Roll and tonkotsu. Whether you're grabbing a quick lunch or settling in for dinner, it's the same kitchen, same care.",
  seo_meta_description: 'Order sushi and ramen online at Sakura Kitchen, San Francisco. Fresh fish daily, 12-hour tonkotsu broth. Pickup or dine in — no fees, no wait. From $9.',
  seo_keywords: 'sushi San Francisco, Japanese restaurant Market Street SF, ramen SF, Sakura Kitchen online order, dragon roll SF, tonkotsu ramen San Francisco, sushi near me, Japanese food downtown SF',
}

export const CANNED_AI_EMAILS: Record<string, { subject: string; body: string }> = {
  birthday: {
    subject: 'Happy Birthday! 🎂 A treat from Sakura Kitchen',
    body: "Hi Sarah! Wishing you the happiest of birthdays from all of us at Sakura Kitchen. Your Dragon Roll is waiting — come celebrate with us today. We're adding 200 bonus points to your Sakura Rewards as our gift.",
  },
  win_back: {
    subject: "We miss you, Sarah! 🍜",
    body: "It's been a while and we've been thinking about you. Your 680 loyalty points are waiting, and we just added a new Spicy Miso Ramen we think you'd love. Come back soon — we saved your usual spot.",
  },
  cart: {
    subject: "You left something behind 🛒",
    body: "Hey Sarah! You had a Dragon Roll and Gyoza in your cart. They're still here waiting for you — just tap below to finish your order. Takes 30 seconds.",
  },
  after_order: {
    subject: "Hope you enjoyed your meal! ⭐",
    body: "Hey Sarah, it's been a few days since your last visit. We hope the Tonkotsu Ramen hit the spot! If you're craving another bowl — or want to try our new Spicy Miso — come back soon.",
  },
  milestone: {
    subject: "You're officially a Sakura regular! 🎉",
    body: "Sarah, you just hit 10 orders with us — and we couldn't be more grateful. As a thank-you, we're adding 500 bonus points to your Sakura Rewards account. See you soon!",
  },
  quiet_day: {
    subject: "Come in today — it's a perfect time 🍽️",
    body: "Hey Sarah! It's a beautiful afternoon and we'd love to see you. The Dragon Roll is fresh out of the kitchen and there's no wait right now. Perfect time for a quick lunch.",
  },
  loyalty: {
    subject: "Your reward is almost ready! 🏆",
    body: "Hey Sarah! You're only 120 points away from your next Sakura Reward — that's just one more visit. Come in for your usual and claim it on your next order.",
  },
  new_item: {
    subject: "Just added: Spicy Miso Ramen 🍜",
    body: "We've been working on something new and it's finally ready. Our Spicy Miso Ramen — bold miso broth, chili paste, ground pork, and butter corn — is now on the menu. Come try it first.",
  },
}

export const HOURLY_REVENUE = [8, 14, 22, 38, 65, 95, 88, 100, 82, 70, 55, 42]
export const HOURLY_LABELS = ['10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm']
