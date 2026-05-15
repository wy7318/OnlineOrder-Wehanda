# OrderFlow — Database System Documentation

## Overview

OrderFlow uses **Supabase (PostgreSQL)** as its database. The schema is designed for a **multi-tenant SaaS** model where each restaurant is an isolated tenant identified by `restaurant_id`. Every restaurant-owned table includes a `restaurant_id` foreign key, and Row Level Security (RLS) policies ensure one restaurant's owner cannot access another's data.

---

## Table Reference

### `restaurants`

The root of every tenant. One row = one restaurant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Unique restaurant identifier |
| `owner_user_id` | uuid FK → auth.users | Supabase Auth user who owns this restaurant |
| `name` | text | Display name |
| `slug` | text UNIQUE | URL-safe identifier used in `/restaurant/:slug` |
| `logo_url` | text | Public URL of restaurant logo |
| `cover_image_url` | text | Public URL of cover image |
| `address` | text | Physical address |
| `phone` | text | Contact phone |
| `email` | text | Contact email |
| `website` | text | Restaurant website |
| `description` | text | About / description |
| `timezone` | text | IANA timezone (e.g. `America/New_York`) |
| `online_ordering_enabled` | boolean | Master switch for customer ordering |
| `pickup_enabled` | boolean | Pickup order type allowed |
| `dine_in_enabled` | boolean | Dine-in order type allowed |
| `delivery_enabled` | boolean | Delivery order type allowed |
| `is_active` | boolean | Platform-level enable/disable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `restaurant_hours`

One row per day of week per restaurant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `day_of_week` | smallint | 0 = Sunday … 6 = Saturday |
| `open_time` | text | `HH:MM` (24hr) |
| `close_time` | text | `HH:MM` (24hr) |
| `is_closed` | boolean | When true, whole day is closed |

**Unique constraint:** `(restaurant_id, day_of_week)` — only one record per day per restaurant.

---

### `categories`

Top-level menu sections (Appetizers, Sushi Rolls, Entrees, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `name` | text | Category name |
| `description` | text | Optional description |
| `display_order` | integer | Sort position |
| `is_active` | boolean | Show/hide on customer portal |

---

### `subcategories`

Optional sub-groupings within a category (Classic Rolls, Specialty Rolls).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `category_id` | uuid FK → categories | Parent category |
| `name` | text | Subcategory name |
| `display_order` | integer | Sort position |
| `is_active` | boolean | |

---

### `tags`

Labels assigned to menu items (Spicy, Popular, Vegetarian, Gluten Free).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `name` | text | Tag label |
| `color` | text | Hex color code for UI rendering |

---

### `menu_items`

Individual dishes available for ordering.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `category_id` | uuid FK → categories | NULL = uncategorized |
| `subcategory_id` | uuid FK → subcategories | NULL = no subcategory |
| `name` | text | Item name |
| `description` | text | Item description |
| `price` | numeric(10,2) | Base price in USD |
| `image_url` | text | Public image URL (Supabase Storage) |
| `is_available` | boolean | Toggle availability without deleting |
| `display_order` | integer | Sort position within category |

---

### `menu_item_tags` *(junction table)*

Many-to-many bridge between `menu_items` and `tags`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Denormalized for RLS |
| `menu_item_id` | uuid FK → menu_items | |
| `tag_id` | uuid FK → tags | |

**Unique:** `(menu_item_id, tag_id)`

---

### `option_groups`

Groups of choices for a menu item (e.g. "Protein Choice", "Spice Level").

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `menu_item_id` | uuid FK → menu_items | Which item this group belongs to |
| `name` | text | Group label shown to customer |
| `is_required` | boolean | Customer must select before adding to cart |
| `min_select` | integer | Minimum number of choices |
| `max_select` | integer | Maximum number of choices |
| `display_order` | integer | |

---

### `options`

Individual choices within an option group (e.g. "Chicken", "Salmon", "Tofu").

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `option_group_id` | uuid FK → option_groups | Parent group |
| `name` | text | Choice label |
| `additional_price` | numeric(10,2) | Extra charge (0 = no charge) |
| `is_active` | boolean | Show/hide without deleting |
| `display_order` | integer | |

---

### `customers`

Customer records scoped per restaurant. Upserted on each order by phone number.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `name` | text | |
| `phone` | text | Used as unique identifier per restaurant |
| `email` | text | Optional |

**Unique:** `(restaurant_id, phone)`

---

### `orders`

One row per customer order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `customer_id` | uuid FK → customers | NULL if guest |
| `order_number` | text UNIQUE | Human-readable e.g. `ORD-M8K2J-X4P` |
| `status` | text | `new` → `accepted` → `preparing` → `ready` → `completed` / `cancelled` |
| `order_type` | text | `pickup` / `dine_in` / `delivery` |
| `subtotal` | numeric | Before tax and fees |
| `tax_amount` | numeric | Calculated tax |
| `fee_amount` | numeric | Platform/service fee (0 in MVP) |
| `total_amount` | numeric | Grand total |
| `customer_name` | text | Snapshot at order time |
| `customer_phone` | text | Snapshot |
| `customer_email` | text | Snapshot |
| `order_notes` | text | Special requests |
| `delivery_address` | text | Only for delivery orders |
| `delivery_instructions` | text | |

---

### `order_items`

Line items for each order. Data is snapshotted so menu changes don't affect historical orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `order_id` | uuid FK → orders | |
| `menu_item_id` | uuid FK → menu_items | NULL-safe (item may be deleted later) |
| `item_name_snapshot` | text | Name at time of order |
| `base_price_snapshot` | numeric | Price at time of order |
| `quantity` | integer | |
| `notes` | text | Per-item special instructions |
| `line_total` | numeric | `(base + options) × quantity` |

---

### `order_item_options`

Selected modifiers for each order item. Also snapshotted.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK → restaurants | Tenant reference |
| `order_item_id` | uuid FK → order_items | |
| `option_group_name_snapshot` | text | Group name at time of order |
| `option_name_snapshot` | text | Option name at time of order |
| `additional_price_snapshot` | numeric | Price at time of order |

---

## Entity Relationship Diagram

```
auth.users
    │
    └──< restaurants (owner_user_id)
              │
              ├──< restaurant_hours
              │
              ├──< categories
              │         └──< subcategories
              │
              ├──< tags
              │
              ├──< menu_items (→ category, → subcategory)
              │         ├──< menu_item_tags >──< tags
              │         └──< option_groups
              │                   └──< options
              │
              ├──< customers
              │
              └──< orders (→ customer)
                        └──< order_items (→ menu_item)
                                  └──< order_item_options
```

---

## Multi-Tenant Isolation

**Strategy: Row Level Security (RLS) + `restaurant_id` on every table**

1. Every table except `auth.users` carries a `restaurant_id` column.
2. RLS is enabled on all tables.
3. A helper function `is_restaurant_owner(restaurant_id)` checks `auth.uid() = restaurants.owner_user_id`.
4. Owner policies use this function for `SELECT / INSERT / UPDATE / DELETE`.
5. Public read policies (for the customer portal) are limited to active/available records only.
6. Order insertion is open to anyone (anon key) but reads are owner-only.
7. The API route for orders uses the **Service Role Key** server-side to bypass RLS only for validated writes.

---

## Security Design

| Concern | Solution |
|---------|----------|
| Cross-tenant data access | RLS `using(is_restaurant_owner(restaurant_id))` |
| Unauthenticated menu browsing | Public `SELECT` policy on active records |
| Order placement without auth | Public `INSERT` on orders; restaurant verified server-side |
| Admin operations | Service Role Key (server-only, never exposed to client) |
| Image uploads | Storage bucket policies — authenticated users only |

---

## Storage

**Bucket:** `menu-images` (public)

- Restaurant owners upload item images from the dashboard.
- Images are stored at path `{restaurant_id}/{timestamp}.{ext}`.
- Public URLs are stored in `menu_items.image_url`.

---

## Key Business Rules

| Rule | Implementation |
|------|---------------|
| Ordering disabled when closed | `isRestaurantOpen()` checks hours + timezone client-side; API double-checks `online_ordering_enabled` |
| Price integrity | Prices snapshotted at order time in `order_items` and `order_item_options` |
| Required modifiers enforced | Client-side validation in `ItemModal`; group marked `is_required=true` |
| Order number unique | `generateOrderNumber()` uses timestamp + random string; DB UNIQUE constraint |
| Tenant slug unique | DB UNIQUE constraint on `restaurants.slug` |

---

## Order Status Flow

```
new → accepted → preparing → ready → completed
                                           ↑
              cancelled ←─────────────────┘ (can cancel from any state)
```

---

## Running the Schema

1. Open your Supabase project → **SQL Editor**
2. Copy and paste `supabase/schema.sql`
3. Click **Run**
4. To load demo data: edit `supabase/seed.sql`, replace `<YOUR_AUTH_USER_ID>` with your Supabase Auth user ID, then run it

---

*Generated by OrderFlow SaaS — May 2026*
