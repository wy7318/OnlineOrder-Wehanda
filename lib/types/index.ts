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

// ── Customer ──────────────────────────────────────────────────
export interface Customer {
  id: string
  restaurant_id: string
  name: string
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

// ── Order ─────────────────────────────────────────────────────
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type OrderType = 'pickup' | 'dine_in' | 'delivery'

export interface Order {
  id: string
  restaurant_id: string
  customer_id: string | null
  order_number: string
  status: OrderStatus
  order_type: OrderType
  subtotal: number
  tax_amount: number
  fee_amount: number
  total_amount: number
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
}

// ── Public Restaurant View (for customer portal) ──────────────
export interface PublicRestaurant extends Restaurant {
  restaurant_hours: RestaurantHours[]
  categories: (Category & { subcategories: Subcategory[] })[]
  menu_items: (MenuItem & { tags: Tag[]; option_groups: (OptionGroup & { options: Option[] })[] })[]
}
