export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Auth / Users ──────────────────────────────────────────────
export interface UserProfile {
  id: string
  email: string
  role: 'platform_admin' | 'restaurant_owner' | 'customer'
  created_at: string
}

// ── Restaurant ────────────────────────────────────────────────
export interface Restaurant {
  id: string
  owner_user_id: string
  name: string
  slug: string
  logo_url: string | null
  cover_image_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  timezone: string
  online_ordering_enabled: boolean
  pickup_enabled: boolean
  dine_in_enabled: boolean
  delivery_enabled: boolean
  tax_rate: number
  reservations_enabled: boolean
  reservation_capacity: number
  reservation_max_party_size: number
  reservation_advance_days: number
  reservation_min_notice_hours: number
  reservation_auto_confirm: boolean
  cuisine_types: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RestaurantInsert = Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>
export type RestaurantUpdate = Partial<Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'owner_user_id'>>

// ── Restaurant Hours ──────────────────────────────────────────
export interface RestaurantHours {
  id: string
  restaurant_id: string
  day_of_week: number // 0 = Sunday … 6 = Saturday
  open_time: string   // 'HH:MM'
  close_time: string  // 'HH:MM'
  is_closed: boolean
  created_at: string
  updated_at: string
}

// ── Category ──────────────────────────────────────────────────
export interface Category {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'restaurant_id'>>

// ── Subcategory ───────────────────────────────────────────────
export interface Subcategory {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SubcategoryInsert = Omit<Subcategory, 'id' | 'created_at' | 'updated_at'>

// ── Tag ───────────────────────────────────────────────────────
export interface Tag {
  id: string
  restaurant_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

// ── Menu Item ─────────────────────────────────────────────────
export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string | null
  subcategory_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  display_order: number
  created_at: string
  updated_at: string
  tags?: Tag[]
  option_groups?: OptionGroup[]
}

export type MenuItemInsert = Omit<MenuItem, 'id' | 'created_at' | 'updated_at' | 'tags' | 'option_groups'>
export type MenuItemUpdate = Partial<MenuItemInsert>

// ── Menu Item Tags ────────────────────────────────────────────
export interface MenuItemTag {
  id: string
  restaurant_id: string
  menu_item_id: string
  tag_id: string
}

// ── Option Group ──────────────────────────────────────────────
export interface OptionGroup {
  id: string
  restaurant_id: string
  menu_item_id: string
  name: string
  is_required: boolean
  min_select: number
  max_select: number
  display_order: number
  created_at: string
  updated_at: string
  options?: Option[]
}

export type OptionGroupInsert = Omit<OptionGroup, 'id' | 'created_at' | 'updated_at' | 'options'>

// ── Option ────────────────────────────────────────────────────
export interface Option {
  id: string
  restaurant_id: string
  option_group_id: string
  name: string
  additional_price: number
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type OptionInsert = Omit<Option, 'id' | 'created_at' | 'updated_at'>

// ── Reservation ───────────────────────────────────────────
export type ReservationStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show'

export interface Reservation {
  id: string
  restaurant_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  party_size: number
  reservation_date: string   // 'YYYY-MM-DD'
  reservation_time: string   // 'HH:MM:SS' from postgres
  status: ReservationStatus
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

// ── Customer Management enums ─────────────────────────────────
export type AcquisitionSource =
  | 'organic' | 'google_ad' | 'instagram_ad' | 'facebook_ad'
  | 'referral' | 'qr_code' | 'walk_in' | 'loyalty_signup' | 'other'

export type PreferredContactMethod = 'email' | 'sms' | 'push' | 'none'

export type DietaryFlagType =
  | 'vegetarian' | 'vegan' | 'gluten_free' | 'halal'
  | 'kosher' | 'nut_allergy' | 'dairy_free' | 'shellfish_allergy' | 'other'

export type CustomerEventType =
  | 'order_placed' | 'order_cancelled' | 'order_refunded'
  | 'reservation_made' | 'reservation_cancelled'
  | 'cart_abandoned' | 'item_viewed' | 'promo_redeemed'
  | 'promo_ignored' | 'review_submitted' | 'support_ticket_opened'
  | 'loyalty_points_earned' | 'loyalty_points_redeemed'
  | 'email_opened' | 'email_clicked' | 'sms_opened'
  | 'app_session_started' | 'login' | 'logout'

export type DeviceType = 'mobile_web' | 'desktop_web' | 'ios_app' | 'android_app'

// ── Customer (restaurant-scoped, extended with CRM + AI fields) ───────────
export interface Customer {
  id: string
  restaurant_id: string
  // Original field kept for backward compatibility with order upsert
  name: string
  // Split name fields for CRM
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  birthday: string | null
  anniversary: string | null
  preferred_contact_method: PreferredContactMethod
  marketing_opt_in: boolean
  marketing_opt_in_at: string | null
  acquisition_source: AcquisitionSource
  acquisition_campaign_id: string | null
  acquisition_source_detail: string | null
  loyalty_points_balance: number
  tags: string[]
  notes: string | null
  is_blocked: boolean
  last_seen_at: string | null
  auth_user_id: string | null
  // AI placeholder columns (null until ML pipeline is built)
  churn_risk_score: number | null
  ltv_predicted_90d: number | null
  segment_ai_label: string | null
  last_ai_scored_at: string | null
  data_version: number
  created_at: string
  updated_at: string
}

// Computed stats joined from the orders table
export interface CustomerWithStats extends Customer {
  total_orders: number
  lifetime_value: number
  avg_order_value: number
  last_order_at: string | null
  first_order_at: string | null
}

// ── Customer Address ──────────────────────────────────────────
export interface CustomerAddress {
  id: string
  customer_id: string
  restaurant_id: string
  label: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  zip: string
  country: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
  delivery_zone_id: string | null
  created_at: string
  updated_at: string
}

// ── Customer Event (append-only AI training log) ──────────────
export interface CustomerEvent {
  id: string
  customer_id: string
  restaurant_id: string
  event_type: CustomerEventType
  event_at: string
  recorded_at: string
  session_id: string | null
  device_type: DeviceType
  source_id: string | null
  metadata: Record<string, unknown>
}

// ── Customer Segment ──────────────────────────────────────────
export interface CustomerSegment {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  color: string
  is_system: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CustomerSegmentMember {
  segment_id: string
  customer_id: string
  restaurant_id: string
  added_at: string
  added_by: string
}

// ── Customer Dietary Flag ─────────────────────────────────────
export interface CustomerDietaryFlag {
  id: string
  customer_id: string
  restaurant_id: string
  flag_type: DietaryFlagType
  source: 'self_reported' | 'inferred_from_orders'
  created_at: string
}

// ── Customer Profile (platform-wide auth account) ─────────────
export interface CustomerProfile {
  id: string           // = auth.users.id
  display_name: string
  phone: string
  created_at: string
  updated_at: string
}

// ── Loyalty ───────────────────────────────────────────────────
export interface LoyaltyProgram {
  id: string
  restaurant_id: string
  is_enabled: boolean
  program_name: string
  points_per_dollar: number
  points_to_redeem: number        // X points = $1 off
  minimum_points_to_redeem: number
  welcome_bonus_points: number
  birthday_bonus_points: number
  points_expiry_days: number | null
  created_at: string
  updated_at: string
}

export type LoyaltyTransactionType =
  | 'order_earn' | 'order_redeem' | 'order_refund'
  | 'welcome_bonus' | 'birthday_bonus'
  | 'manual_adjust' | 'expiry'

export interface LoyaltyTransaction {
  id: string
  restaurant_id: string
  customer_id: string
  order_id: string | null
  points_delta: number
  type: LoyaltyTransactionType
  note: string | null
  created_at: string
}

// ── Order ─────────────────────────────────────────────────────
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type OrderType = 'pickup' | 'dine_in' | 'delivery'

export interface Order {
  id: string
  restaurant_id: string
  customer_id: string | null
  customer_user_id: string | null
  order_number: string
  status: OrderStatus
  order_type: OrderType
  subtotal: number
  tax_amount: number
  fee_amount: number
  total_amount: number
  loyalty_points_redeemed: number
  loyalty_discount_amount: number
  customer_name: string
  customer_phone: string
  customer_email: string
  order_notes: string | null
  delivery_address: string | null
  delivery_instructions: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

// ── Order Item ────────────────────────────────────────────────
export interface OrderItem {
  id: string
  restaurant_id: string
  order_id: string
  menu_item_id: string | null
  item_name_snapshot: string
  base_price_snapshot: number
  quantity: number
  notes: string | null
  line_total: number
  added_from_upsell: boolean
  created_at: string
  order_item_options?: OrderItemOption[]
}

// ── Order Item Option ─────────────────────────────────────────
export interface OrderItemOption {
  id: string
  restaurant_id: string
  order_item_id: string
  option_group_name_snapshot: string
  option_name_snapshot: string
  additional_price_snapshot: number
  created_at: string
}

// ── Cart (client-side) ────────────────────────────────────────
export interface CartOption {
  option_group_id: string
  option_group_name: string
  option_id: string
  option_name: string
  additional_price: number
}

export interface CartItem {
  id: string // local uuid
  menu_item_id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
  notes: string
  selected_options: CartOption[]
  line_total: number
  added_from_upsell?: boolean
}

// ── Public Restaurant View (for customer portal) ──────────────
export interface PublicRestaurant extends Restaurant {
  restaurant_hours: RestaurantHours[]
  categories: (Category & { subcategories: Subcategory[] })[]
  menu_items: (MenuItem & { tags: Tag[]; option_groups: (OptionGroup & { options: Option[] })[] })[]
}
