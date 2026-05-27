# Wehanda – Platform Specification
*AI-consumable reference document for mobile app development*

---

## 1. Platform Overview

**Wehanda** is a multi-tenant restaurant SaaS platform. Each restaurant owner gets a private dashboard to manage their menu, orders, reservations, customers, and analytics. Customers interact through a public-facing ordering portal unique to each restaurant (`/restaurant/[slug]`). The platform operator controls restaurant access through a licensing system.

**Brand name:** Wehanda  
**Support email:** support@simplidone.com  
**Email from address:** `Wehanda <noreply@updates.simplidone.com>`

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, server + client components) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Supabase Auth (JWT, email/password) |
| Email | Resend (`RESEND_API_KEY`) |
| Payments | Stripe (platform keys + per-restaurant connected accounts) |
| State (client) | Zustand (cart store, notification store) |
| Styling | Tailwind CSS |
| Deployment | Vercel (with Vercel Cron Jobs) |

**Environment variables required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY` (live)
- `STRIPE_TEST_SECRET_KEY`
- `CRON_SECRET` (Vercel cron auth)

---

## 3. Authentication & User Roles

### 3.1 Auth System
Supabase Auth handles all authentication (email + password). Two entirely separate user personas share the same auth system but are logically separated:

**Restaurant Owners** — sign up via `/register`, own and manage one or more restaurants via the dashboard at `/(dashboard)/*`.

**Customers** — sign up on the public restaurant portal `/restaurant/[slug]`. Customer accounts are platform-wide (one login works at any restaurant) but loyalty points and CRM records are per-restaurant-scoped.

### 3.2 Role Hierarchy

| Role | Table | Access |
|---|---|---|
| `platform_admin` | `platform_admins` | Full admin at `/admin`, can manage all restaurants and licenses |
| `restaurant_owner` | `auth.users` + owns restaurants | Dashboard for their own restaurant(s) |
| `customer` | `customer_profiles` | Public portal ordering, reservations, order history |
| Guest | — | Can place orders and reservations without an account |

### 3.3 Auth Flow
- **Owner login:** `/login` → `/dashboard` (or `/select-restaurant` if owning 2+ restaurants)
- **Customer login:** Triggered inline on the restaurant ordering page via `CustomerAuthModal`
- **Platform admin check:** `GET /api/admin/check` → `{ isAdmin: boolean }`
- **Role detection:** `GET /api/user/role` returns `{ role: 'platform_admin' | 'restaurant_owner' | 'customer' | null }`

### 3.4 Multi-Restaurant Selection
Owners with multiple restaurants choose which one to manage via `/select-restaurant`. The selected restaurant ID is stored in a cookie `selected_restaurant_id` (httpOnly, 30-day max-age). The cookie is set by `GET /api/restaurant/select?id=[restaurantId]`.

---

## 4. Database Schema

All tables are in the `public` schema. All UUIDs are `gen_random_uuid()` by default.

### 4.1 `restaurants`
The core multi-tenant anchor. Every other table references `restaurant_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_user_id` | uuid FK → auth.users | |
| `name` | text | |
| `slug` | text UNIQUE | URL path, e.g. `my-restaurant` |
| `logo_url` | text nullable | |
| `cover_image_url` | text nullable | |
| `address` | text nullable | |
| `phone` | text nullable | |
| `email` | text nullable | Contact email (used for trial expiry warnings) |
| `website` | text nullable | |
| `description` | text nullable | |
| `timezone` | text | IANA tz, default `America/New_York` |
| `online_ordering_enabled` | boolean | Global on/off for ordering |
| `pickup_enabled` | boolean | |
| `dine_in_enabled` | boolean | |
| `delivery_enabled` | boolean | |
| `tax_rate` | numeric | Percentage, e.g. `8.5` for 8.5% |
| `reservations_enabled` | boolean | |
| `reservation_capacity` | integer | Total seats for simultaneous reservations |
| `reservation_max_party_size` | integer | |
| `reservation_advance_days` | integer | How far ahead customers can book |
| `reservation_min_notice_hours` | integer | Minimum lead time for same-day bookings |
| `reservation_auto_confirm` | boolean | Auto-confirm vs. pending review |
| `daily_revenue_target` | numeric nullable | Dashboard progress bar target |
| `cuisine_types` | text[] | e.g. `['italian', 'pizza']` |
| `is_active` | boolean | Platform-level active flag |

### 4.2 `restaurant_hours`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `day_of_week` | smallint | 0=Sunday … 6=Saturday |
| `open_time` | text | `'HH:MM'` |
| `close_time` | text | `'HH:MM'` |
| `is_closed` | boolean | If true, restaurant is closed that day |

### 4.3 `restaurant_licenses`
One row per restaurant. Controls access and feature availability.

| Column | Type | Notes |
|---|---|---|
| `restaurant_id` | uuid PK FK | |
| `status` | text | `'trial'`, `'active'`, `'suspended'`, `'cancelled'` |
| `feature_menu` | boolean | Access to Menu Builder |
| `feature_orders` | boolean | Access to Orders |
| `feature_reservations` | boolean | Access to Reservations |
| `feature_customers` | boolean | Access to Customers/CRM |
| `feature_analytics` | boolean | Access to Analytics |
| `trial_ends_at` | timestamptz nullable | When `status='trial'`, enforced on every dashboard load |
| `notes` | text nullable | Internal admin notes |

**License enforcement:**
- `suspended` or `cancelled` → redirect to `/suspended`
- `trial` with `trial_ends_at` in the past → redirect to `/suspended`
- Feature flags `false` → nav item hidden from sidebar

### 4.4 `restaurant_payment_settings`
One row per restaurant.

| Column | Type | Notes |
|---|---|---|
| `restaurant_id` | uuid UNIQUE FK | |
| `stripe_enabled` | boolean | |
| `stripe_account_id` | text nullable | Connected Stripe account ID |
| `stripe_mode` | text | `'live'` or `'test'` |
| `stripe_live_publishable_key` | text nullable | |
| `stripe_live_secret_key` | text nullable | |
| `stripe_test_publishable_key` | text nullable | |
| `stripe_test_secret_key` | text nullable | |

### 4.5 `categories`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `name` | text | |
| `description` | text nullable | |
| `display_order` | integer | Sort order in menu |
| `is_active` | boolean | |
| `available_order_types` | text[] nullable | `null` = all types; otherwise subset of `['pickup','dine_in','delivery']` |
| `happy_hour_enabled` | boolean | |
| `happy_hour_start` | time nullable | `'HH:MM'` |
| `happy_hour_end` | time nullable | `'HH:MM'` |
| `happy_hour_days` | integer[] nullable | Days of week (0=Sun…6=Sat) |

### 4.6 `subcategories`
Same columns as `categories` plus:
| Column | Type | Notes |
|---|---|---|
| `category_id` | uuid FK → categories | |

Subcategories nest under categories. Items can belong to both a category and a subcategory.

### 4.7 `menu_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `category_id` | uuid nullable FK | |
| `subcategory_id` | uuid nullable FK | |
| `name` | text | |
| `description` | text nullable | |
| `price` | numeric | Base price in dollars |
| `image_url` | text nullable | |
| `is_available` | boolean | Toggle without deleting |
| `display_order` | integer | |
| `available_order_types` | text[] nullable | Same as categories |
| `happy_hour_enabled` | boolean | |
| `happy_hour_start` | time nullable | |
| `happy_hour_end` | time nullable | |
| `happy_hour_days` | integer[] nullable | |

**Availability cascade:** When filtering items for display, the system checks item → subcategory → category. An item is hidden if ANY level fails the availability check for the current order type or time.

### 4.8 `tags`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `name` | text | e.g. `'Spicy'`, `'Vegan'` |
| `color` | text | Hex color, default `'#f97316'` |

### 4.9 `menu_item_tags`
Join table: many-to-many between `menu_items` and `tags`.

### 4.10 `option_groups`
Customization groups attached to a menu item (e.g. "Size", "Toppings").

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `menu_item_id` | uuid FK | |
| `name` | text | |
| `is_required` | boolean | Blocks add-to-cart if not selected |
| `min_select` | integer | Minimum selections |
| `max_select` | integer | Maximum selections |
| `display_order` | integer | |

### 4.11 `options`
Individual choices within an option group.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `option_group_id` | uuid FK | |
| `name` | text | |
| `additional_price` | numeric | Added on top of base price; 0 if no extra charge |
| `is_active` | boolean | |
| `display_order` | integer | |

### 4.12 `orders`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `customer_id` | uuid nullable FK → customers | CRM record (may be null for first-time guests) |
| `customer_user_id` | uuid nullable FK → auth.users | Set if customer was logged in |
| `order_number` | text UNIQUE | Human-readable, e.g. `ORD-A1B2` |
| `status` | text | `'new'`, `'accepted'`, `'preparing'`, `'ready'`, `'completed'`, `'cancelled'` |
| `order_type` | text | `'pickup'`, `'dine_in'`, `'delivery'` |
| `subtotal` | numeric | Sum of item line totals |
| `tax_amount` | numeric | Calculated server-side from `tax_rate` |
| `fee_amount` | numeric | Tip amount |
| `total_amount` | numeric | `subtotal + tax_amount + fee_amount - loyalty_discount_amount` |
| `customer_name` | text | Snapshot at order time |
| `customer_phone` | text | |
| `customer_email` | text | |
| `order_notes` | text nullable | Customer instructions |
| `delivery_address` | text nullable | Required when `order_type='delivery'` |
| `delivery_instructions` | text nullable | |
| `loyalty_points_redeemed` | integer | Points used in this order |
| `loyalty_discount_amount` | numeric | Dollar discount from loyalty redemption |
| `payment_method` | text | `'cash'` or `'stripe'` |
| `stripe_payment_intent_id` | text nullable | |
| `payment_status` | text | `'unpaid'`, `'paid'`, `'failed'`, `'refunded'` |

**Order lifecycle:**
`new` → `accepted` → `preparing` → `ready` → `completed` (or `cancelled` at any stage)

**Loyalty points awarded** when status transitions to `completed`.  
**Loyalty points refunded** when status transitions to `cancelled` (if points were redeemed).

### 4.13 `order_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK | |
| `menu_item_id` | uuid nullable FK | Nullable in case item is deleted later |
| `item_name_snapshot` | text | Name at time of order |
| `base_price_snapshot` | numeric | Price at time of order |
| `quantity` | integer | Min 1 |
| `notes` | text nullable | Per-item special instructions |
| `line_total` | numeric | `(base_price + options) * quantity` |
| `added_from_upsell` | boolean | Tracks upsell conversion |

### 4.14 `order_item_options`
| Column | Type | Notes |
|---|---|---|
| `order_item_id` | uuid FK | |
| `option_group_name_snapshot` | text | Group name at order time |
| `option_name_snapshot` | text | Option name at order time |
| `additional_price_snapshot` | numeric | Price at order time |

### 4.15 `reservations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `customer_name` | text | |
| `customer_phone` | text | |
| `customer_email` | text nullable | |
| `party_size` | integer | 1–100 |
| `reservation_date` | date | `'YYYY-MM-DD'` |
| `reservation_time` | time | `'HH:MM:SS'` |
| `status` | text | `'pending'`, `'confirmed'`, `'declined'`, `'cancelled'`, `'completed'`, `'no_show'` |
| `notes` | text nullable | Customer notes |
| `internal_notes` | text nullable | Staff-only notes |
| `customer_user_id` | uuid nullable FK → auth.users | |

### 4.16 `customers`
Per-restaurant CRM record. A single person may have one record per restaurant they've ordered from.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK | |
| `auth_user_id` | uuid nullable FK → auth.users | Links to logged-in customer account |
| `name` | text | Full name (legacy/combined) |
| `first_name` | text nullable | |
| `last_name` | text nullable | |
| `email` | text nullable | |
| `phone` | text nullable | Normalized (10 digits, no country code) |
| `birthday` | date nullable | Used for birthday bonus points |
| `anniversary` | date nullable | |
| `preferred_contact_method` | text | `'email'`, `'sms'`, `'push'`, `'none'` |
| `marketing_opt_in` | boolean | |
| `marketing_opt_in_at` | timestamptz nullable | |
| `acquisition_source` | text | `'organic'`, `'google_ad'`, `'instagram_ad'`, `'facebook_ad'`, `'referral'`, `'qr_code'`, `'walk_in'`, `'loyalty_signup'`, `'other'` |
| `loyalty_points_balance` | integer | Current redeemable points |
| `tags` | text[] | Free-form labels |
| `notes` | text nullable | Internal staff notes |
| `is_blocked` | boolean | Blocked customers cannot order |
| `last_seen_at` | timestamptz nullable | |
| `churn_risk_score` | float nullable | AI placeholder |
| `ltv_predicted_90d` | numeric nullable | AI placeholder |
| `segment_ai_label` | text nullable | AI placeholder |

**Phone normalization:** On every order, phone is normalized to 10 digits (strip non-digits, remove leading `1` from 11-digit US numbers).  
**Customer matching on order:** Lookup priority: `auth_user_id` → normalized phone → raw phone → email (`ILIKE`) → create new.

### 4.17 `customer_profiles`
Platform-wide customer profile (shared across all restaurants).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK FK → auth.users | |
| `display_name` | text | |
| `phone` | text | |

### 4.18 `customer_addresses`
Saved delivery addresses per customer per restaurant.

### 4.19 `customer_segments`
Named groups of customers (e.g. "VIP", "Regulars").

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `color` | text | Hex color |
| `is_system` | boolean | System-generated vs. manual |

### 4.20 `customer_segment_members`
Join table: customers ↔ segments.

### 4.21 `customer_dietary_flags`
| Column | Type | Notes |
|---|---|---|
| `flag_type` | text | `'vegetarian'`, `'vegan'`, `'gluten_free'`, `'halal'`, `'kosher'`, `'nut_allergy'`, `'dairy_free'`, `'shellfish_allergy'`, `'other'` |
| `source` | text | `'self_reported'` or `'inferred_from_orders'` |

### 4.22 `customer_events`
Append-only behavioural event log for ML/AI pipelines.

| Column | Type | Notes |
|---|---|---|
| `event_type` | text | See full enum below |
| `event_at` | timestamptz | When the event occurred |
| `device_type` | text | `'mobile_web'`, `'desktop_web'`, `'ios_app'`, `'android_app'` |
| `source_id` | text nullable | e.g. order_id or reservation_id |
| `metadata` | jsonb | Event-specific payload |

Event types: `order_placed`, `order_cancelled`, `order_refunded`, `reservation_made`, `reservation_cancelled`, `cart_abandoned`, `item_viewed`, `promo_redeemed`, `promo_ignored`, `review_submitted`, `support_ticket_opened`, `loyalty_points_earned`, `loyalty_points_redeemed`, `email_opened`, `email_clicked`, `sms_opened`, `app_session_started`, `login`, `logout`

### 4.23 `loyalty_programs`
One row per restaurant.

| Column | Type | Notes |
|---|---|---|
| `is_enabled` | boolean | |
| `program_name` | text | e.g. `'Rewards Club'` |
| `points_per_dollar` | integer | Points earned per $1 subtotal |
| `points_to_redeem` | integer | Points needed per $1 discount |
| `minimum_points_to_redeem` | integer | Minimum balance to redeem |
| `welcome_bonus_points` | integer | Awarded on first completed order |
| `birthday_bonus_points` | integer | Awarded once per year in birth month |
| `points_expiry_days` | integer nullable | Inactive days before expiry |

### 4.24 `loyalty_transactions`
Append-only ledger of all point changes.

| Column | Type | Notes |
|---|---|---|
| `points_delta` | integer | Positive = earned, negative = redeemed/expired |
| `type` | text | `'order_earn'`, `'order_redeem'`, `'order_refund'`, `'welcome_bonus'`, `'birthday_bonus'`, `'manual_adjust'`, `'expiry'` |
| `note` | text nullable | Human-readable description |

### 4.25 `upsell_pairs`
Pre-computed item co-occurrence pairs used for AI upsell suggestions.

| Column | Type | Notes |
|---|---|---|
| `item_id` | uuid FK → menu_items | Trigger item (in cart) |
| `suggested_item_id` | uuid FK → menu_items | Suggested item |
| `co_occurrence_count` | integer | Times both appeared in same order |
| `confidence` | numeric | 0–1, higher = stronger suggestion |
| `last_computed_at` | timestamptz | |

### 4.26 `platform_admins`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK FK → auth.users | Users in this table have full admin access |

---

## 5. API Reference

All routes are Next.js App Router route handlers. Base URL: platform domain.

### 5.1 Authentication & User
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/user/role` | any | Returns `{ role }` for current user |
| GET | `/api/admin/check` | owner | `{ isAdmin: boolean }` |
| GET | `/api/auth/callback` | — | Supabase OAuth callback handler |

### 5.2 Restaurant (Owner)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/restaurant/current` | owner | Current restaurant data + license (reads `selected_restaurant_id` cookie). Returns `{ ...restaurant, restaurant_licenses: {...} }` |
| GET | `/api/restaurant/select?id=` | owner | Sets `selected_restaurant_id` cookie, redirects to `/dashboard` |
| GET | `/api/restaurants` | owner | All restaurants owned by current user, includes `license_status` and `trial_ends_at` |

### 5.3 Public Restaurant Data
| Method | Path | Auth | Description |
|---|---|---|---|
| GET (page) | `/restaurant/[slug]` | none | Full public restaurant page with menu, cart, checkout, reservations |

The public page fetches restaurant data client-side from Supabase directly including: `restaurants`, `restaurant_hours`, `categories` (with subcategories), `menu_items` (with tags and option_groups → options).

### 5.4 Orders
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | none | Create a new order (guest or logged-in) |
| GET | `/api/orders?restaurant_id=` | owner | All orders for a restaurant |
| PATCH | `/api/orders/[id]` | owner | Update order status (triggers loyalty on complete/cancel) |
| GET | `/api/customer/orders?restaurant_id=` | customer | Current customer's order history at a restaurant |

**POST /api/orders payload:**
```json
{
  "restaurant_id": "uuid",
  "order_type": "pickup|dine_in|delivery",
  "customer_name": "string",
  "customer_phone": "string",
  "customer_email": "string",
  "order_notes": "string|null",
  "delivery_address": "string|null",
  "delivery_instructions": "string|null",
  "subtotal": 0.00,
  "fee_amount": 0.00,
  "items": [
    {
      "menu_item_id": "uuid",
      "item_name_snapshot": "string",
      "base_price_snapshot": 0.00,
      "quantity": 1,
      "notes": "string|null",
      "line_total": 0.00,
      "added_from_upsell": false,
      "options": [
        {
          "option_group_name_snapshot": "string",
          "option_name_snapshot": "string",
          "additional_price_snapshot": 0.00
        }
      ]
    }
  ],
  "customer_user_id": "uuid|null",
  "marketing_opt_in": true,
  "loyalty_points_redeemed": 0,
  "loyalty_discount_amount": 0.00,
  "payment_method": "cash|stripe",
  "stripe_payment_intent_id": "string|null"
}
```

**Server-side validations:**
- Restaurant must exist, `is_active=true`, `online_ordering_enabled=true`
- If `payment_method='stripe'`, verifies PaymentIntent status = `succeeded` via Stripe API
- Tax recalculated server-side (never trusted from client)
- Loyalty discount validated against customer balance server-side
- CRM customer record resolved/created

### 5.5 Reservations
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reservations/availability?restaurant_id=&date=&party_size=` | none | Available time slots for a date |
| POST | `/api/reservations` | none | Create a reservation |
| GET | `/api/reservations/staff?restaurant_id=&date=` | owner | Staff view of reservations for a date |
| PATCH | `/api/reservations/[id]` | owner | Update reservation status |
| GET | `/api/customer/reservations?restaurant_id=` | customer | Customer's reservation history |

**Availability logic:**
1. Fetch `restaurant_hours` for the target date's day_of_week
2. Generate 30-minute time slots within open hours
3. Query existing `pending` + `confirmed` reservations for that date
4. For each slot: `remaining = capacity - sum(party_size of bookings in slot)`; `available = !isPast && remaining >= requested_party_size`
5. `isPast` enforces `reservation_min_notice_hours` using the restaurant's timezone

**POST /api/reservations payload:**
```json
{
  "restaurant_id": "uuid",
  "customer_name": "string",
  "customer_phone": "string",
  "customer_email": "string|null",
  "party_size": 2,
  "reservation_date": "YYYY-MM-DD",
  "reservation_time": "HH:MM",
  "notes": "string|null",
  "customer_user_id": "uuid|null"
}
```
If `reservation_auto_confirm=true`, status is set to `confirmed` immediately; otherwise `pending`.

### 5.6 Loyalty
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/loyalty/balance?restaurant_id=` | customer | Balance, recent transactions, program config. Also runs lazy point expiry check. |
| GET | `/api/loyalty/program?restaurant_id=` | owner | Full program config for owner |
| POST/PATCH | `/api/loyalty/program` | owner | Create/update loyalty program settings |

**Lazy expiry:** On every `/api/loyalty/balance` call, if `points_expiry_days` is set and the last earn transaction is older than that many days, points are zeroed and an `expiry` transaction is recorded.

### 5.7 Upsell
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/upsell?restaurant_id=&item_ids=id1,id2` | none | Returns up to 3 suggested items |

**Upsell algorithm:**
1. Look up `upsell_pairs` for all items in cart, sum confidence scores, exclude cart items
2. Fallback: top sellers from `order_items` in last 30 days
3. Return top 3 results with `has_required_options` flag

### 5.8 Stripe Payments
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/stripe/create-payment-intent` | none | Creates Stripe PaymentIntent for card checkout |
| GET | `/api/stripe/public-config?restaurant_id=` | none | Returns `{ publishableKey, isTestMode }` for Stripe.js init |
| GET | `/api/stripe/settings` | owner | Owner's Stripe connection status |
| POST | `/api/stripe/verify-keys` | owner | Validate Stripe keys |
| GET | `/api/stripe/connect/authorize` | owner | Start Stripe OAuth connect flow |
| GET | `/api/stripe/connect/callback` | owner | Handle Stripe OAuth callback |
| POST | `/api/stripe/connect/disconnect` | owner | Disconnect Stripe account |

**Payment flow (card):**
1. Customer selects "Pay by Card" in checkout
2. Client calls `GET /api/stripe/public-config?restaurant_id=` → gets publishable key
3. Stripe.js Elements rendered with `StripeCardCapture` component
4. On submit: client calls `POST /api/stripe/create-payment-intent` → gets `client_secret`
5. Stripe.js confirms payment with card details
6. On success: `stripe_payment_intent_id` sent with order POST
7. Server verifies PaymentIntent status before creating order

In live mode, funds route directly to the restaurant's connected Stripe account via `transfer_data.destination`.

### 5.9 Customer Profile (logged-in customers)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/customer/profile` | customer | Get `customer_profiles` row |
| POST | `/api/customer/profile` | customer | Create profile (display_name + phone) |
| PATCH | `/api/customer/profile` | customer | Update profile; syncs to `customers` CRM records |

### 5.10 CRM – Customers (owner)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/customers?restaurant_id=` | owner | Paginated customer list with stats |
| GET | `/api/customers/[id]` | owner | Single customer detail |
| PATCH | `/api/customers/[id]` | owner | Update customer fields |
| GET | `/api/customers/[id]/orders` | owner | Customer order history |
| GET | `/api/customers/[id]/reservations` | owner | Customer reservation history |
| GET | `/api/customers/[id]/events` | owner | Customer event log |
| POST | `/api/customers/[id]/block` | owner | Block/unblock customer |
| GET/POST | `/api/customers/[id]/tags` | owner | Customer tags |
| DELETE | `/api/customers/[id]/tags/[tag]` | owner | Remove tag |
| GET/POST | `/api/customers/[id]/segments` | owner | Segment memberships |
| DELETE | `/api/customers/[id]/segments/[segmentId]` | owner | Remove from segment |
| GET/POST | `/api/customers/[id]/dietary-flags` | owner | Dietary flags |
| DELETE | `/api/customers/[id]/dietary-flags/[flagType]` | owner | Remove dietary flag |
| GET | `/api/customers/export?restaurant_id=` | owner | CSV export |

### 5.11 Segments
| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST | `/api/segments?restaurant_id=` | owner | List/create segments |
| PATCH/DELETE | `/api/segments/[id]` | owner | Update/delete segment |

### 5.12 Dashboard Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/overview?period=` | owner | KPI snapshot. `period`: `today`, `yesterday`, `this_week` |
| GET | `/api/dashboard/queue?restaurant_id=` | owner | Live order queue (active orders) |
| GET | `/api/dashboard/reservations?restaurant_id=&date=` | owner | Reservations for a date |
| GET | `/api/analytics/revenue-impact` | owner | Upsell + loyalty revenue impact stats |

The `overview` endpoint calls a PostgreSQL function `get_dashboard_overview(p_restaurant_id, p_period_start, p_period_end, p_prior_start, p_prior_end)` for efficient aggregation. Returns revenue, order count, AOV, new customers, top items compared to a prior period.

### 5.13 Admin (Platform Admin only)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/restaurants` | admin | All restaurants with owner emails |
| POST | `/api/admin/restaurants` | admin | Create restaurant |
| PATCH | `/api/admin/restaurants/[id]` | admin | Update restaurant (is_active, owner, etc.) |
| DELETE | `/api/admin/restaurants/[id]` | admin | Delete restaurant |
| GET | `/api/admin/users` | admin | All auth users |
| POST | `/api/admin/users` | admin | Create user account |
| GET | `/api/admin/licenses` | admin | All licenses with restaurant info |
| PATCH | `/api/admin/licenses/[restaurantId]` | admin | Update/upsert license |
| GET | `/api/admin/stripe/restaurants` | admin | All restaurants with Stripe status |
| PATCH | `/api/admin/stripe/test-mode` | admin | Toggle test/live mode per restaurant |
| POST | `/api/admin/send-monthly-report` | admin | Manually trigger monthly report email |

---

## 6. Feature Modules

### 6.1 Public Restaurant Portal (`/restaurant/[slug]`)
The customer-facing single-page app. All loaded into one client component.

**What it displays:**
- Restaurant header: cover image, logo, name, cuisine types, address, phone, hours
- "Open/Closed" status badge (computed from `restaurant_hours` in restaurant's timezone)
- Order type selector (Pickup / Dine-in / Delivery) — only shows types that are enabled
- Menu search bar
- Category navigation (horizontal scroll tabs)
- Subcategory tabs within active category
- Menu items grid/list with image, name, description, price, tags
- Sticky cart button with item count

**Menu availability filtering (client-side):**
- Items filtered by selected `orderType` (checks item → subcategory → category `available_order_types`)
- Items filtered by happy hour time (checks item → subcategory → category `happy_hour_enabled/start/end/days`)
- Time computed in restaurant's IANA timezone using `Intl.DateTimeFormat`

**Cart (Zustand store):**
- Add/remove/update items with selected options
- Persists in-memory (not localStorage)
- Shows floating cart drawer

**Item modal:**
- Shows full description, image, option groups with radio/checkbox selectors
- Required groups must be selected before adding
- Per-item notes field

**Checkout flow:**
1. Customer fills name, phone, email (pre-filled if logged in)
2. Selects order type (pickup/dine-in/delivery)
3. If delivery: address + instructions fields
4. Tip selection (0%, 15%, 18%, 20%, 25%, custom)
5. Loyalty points redemption widget (if logged in and program enabled)
6. Payment method: Cash or Card (Stripe)
7. If Card: Stripe Elements card capture form
8. Submit → `POST /api/orders`
9. Upsell prompt shown after cart review (before checkout)
10. Success screen with order number

**Upsell prompt:**
- Triggered when customer opens cart
- Fetches `GET /api/upsell?restaurant_id=&item_ids=`
- Shows up to 3 suggested items; customer can add them with one tap
- Items with required options open the item modal; others add directly

**Customer account features (when logged in):**
- Order history panel
- Reservation history panel
- Loyalty points balance + transaction history
- Profile settings (name, phone)
- Marketing preferences

**Reservation flow:**
1. Customer clicks "Make a Reservation" button
2. `ReservationModal` opens
3. Selects date (up to `reservation_advance_days` ahead)
4. Selects party size (up to `reservation_max_party_size`)
5. Fetches `GET /api/reservations/availability` → shows available time slots
6. Fills name, phone, email, notes
7. Submit → `POST /api/reservations`

### 6.2 Dashboard – Overview (`/dashboard`)
Real-time KPI dashboard for restaurant owners.

**Metrics displayed:**
- Revenue (current period vs. prior period)
- Order count
- Average order value
- New customers
- Revenue progress bar toward `daily_revenue_target`
- Period selector: Today / Yesterday / This Week

**Live order queue:**
- Active orders (new, accepted, preparing, ready) displayed as cards
- Status update buttons on each card
- Real-time refresh

**Period comparison:** Each period compares against the equivalent prior period (e.g. Today vs. same weekday last week).

### 6.3 Dashboard – Menu Builder (`/menu`)
Full CRUD for the restaurant's menu.

**Hierarchy:** Categories → Subcategories → Items

**Categories/Subcategories:**
- Create, edit, reorder (drag-and-drop), toggle active
- Set `available_order_types` (all, or restrict to subset)
- Set Happy Hour: enable, select days of week, start/end times
- Restriction indicators (amber dot = has restriction)

**Menu Items:**
- Create, edit, duplicate, reorder, toggle availability
- Fields: name, description, price, image (upload to Supabase Storage), category, subcategory
- Same availability restrictions as categories (order types + happy hour)
- Tags: assign/remove colored label tags
- Option groups: add groups with min/max select, required flag
- Options within groups: name + additional price

**Tags:**
- Global tag management for the restaurant
- Name + hex color

### 6.4 Dashboard – Orders (`/orders`)
Live order management board.

- Lists all orders ordered by newest first
- Status filter tabs (All, New, Accepted, Preparing, Ready, Completed, Cancelled)
- Per-order card: order number, type, customer name, items summary, totals, payment status
- Click to expand full order detail
- Status update dropdown per order
- Real-time polling

### 6.5 Dashboard – Reservations (`/reservations`)
Staff reservation management.

- Calendar date picker
- List of reservations for selected date
- Status update (confirm, decline, complete, mark no-show)
- Internal notes field per reservation
- Party size and time display

### 6.6 Dashboard – Customers (`/customers`)
Full CRM for customer management.

**Customer list:**
- Sortable, searchable table
- Columns: name, phone, email, total orders, lifetime value, last order, loyalty balance
- Filter by segment, tag, blocked status
- CSV export

**Customer detail (`/customers/[id]`):**
- Full profile (name, phone, email, birthday, anniversary)
- Marketing opt-in status
- Acquisition source
- Order history
- Reservation history
- Loyalty transaction ledger
- Dietary flags
- Segment memberships
- Tags
- Internal notes
- AI fields (churn risk, LTV prediction — placeholder for ML pipeline)
- Block/unblock action

### 6.7 Dashboard – Analytics (`/analytics`)
Performance reporting.

- Revenue and order trends
- Peak days and hours charts
- Top and bottom menu items by quantity/revenue
- Customer retention metrics (new vs. returning, repeat rate)
- Upsell and loyalty revenue impact panels
- Monthly report email (can be triggered manually)
- Period selection

### 6.8 Dashboard – Restaurant Setup (`/setup`)
Restaurant configuration with multiple sections:

1. **Basic Info:** name, description, cuisine types
2. **Contact & Location:** address, phone, email, website
3. **Branding:** logo upload, cover image upload (Supabase Storage)
4. **Hours:** per-day open/close times or mark closed
5. **Ordering Settings:** enable/disable online ordering, pickup, dine-in, delivery, tax rate
6. **Reservations:** enable reservations, capacity, max party size, advance days, min notice hours, auto-confirm toggle
7. **Timezone:** IANA timezone selection (includes `America/Phoenix` for MST year-round)
8. **Payment Settings:** Stripe connection, test/live mode
9. **Loyalty Program:** enable, configure program name, earn/redeem rates, bonuses, expiry
10. **Notifications:** real-time order notification settings (bell sound, browser push)

### 6.9 Platform Admin (`/admin`)
Accessible only to users in `platform_admins` table.

**Tabs:**

**Restaurants:**
- Full list of all restaurants with owner email
- Toggle `is_active`
- Change owner
- Enter dashboard as that restaurant
- Delete restaurant
- Create new restaurant

**Users:**
- All auth users with their restaurant assignments

**Payments:**
- All restaurants with Stripe connection status
- Toggle test/live mode per restaurant

**Licenses:**
- All restaurants with license status and feature flags
- "Manage" modal per restaurant:
  - Status: Trial / Active / Suspended / Cancelled
  - Trial end date picker (shown only for Trial status)
  - Feature flag toggles (Menu, Orders, Reservations, Customers, Analytics)
  - Internal notes

---

## 7. Notifications System

**In-browser order notifications:**
- New orders trigger audio bell (`lib/utils/bellSound.ts`) and browser push notification
- Notification state managed in Zustand (`store/notifications.ts`)
- Settings (sound on/off, push on/off) in Zustand (`store/notificationSettings.ts`)
- `NotificationBell` component shows unread count badge in dashboard header
- Real-time via Supabase Realtime subscription on `orders` table

---

## 8. Email System

All emails sent via Resend SDK. From: `Wehanda <noreply@updates.simplidone.com>`.

| Email | Trigger | Recipient | Template |
|---|---|---|---|
| Order confirmation | After successful `POST /api/orders` | Customer email | `lib/email/orderConfirmation.ts` |
| Reservation confirmation | After successful `POST /api/reservations` (customer-placed) | Customer email | `lib/email/reservationConfirmation.ts` |
| Reservation status update | After staff confirms/declines | Customer email | `lib/email/reservationConfirmed.ts` |
| Monthly performance report | 1st of month 9 AM UTC (Vercel Cron) | Restaurant owner | `lib/email/monthlyReport.ts` |
| Trial expiry warning | Daily 9 AM UTC (Vercel Cron), 7 days before trial end | Restaurant contact email or owner auth email | `lib/email/trialExpiryWarning.ts` |

**Trial expiry warning details:**
- Cron: `GET /api/cron/trial-expiry-warning` (daily at 09:00 UTC)
- Finds licenses where `status='trial'` and `trial_ends_at` falls within today+7 (UTC day window)
- Email address priority: `restaurants.email` → owner's `auth.users.email`
- CTA links to `mailto:support@simplidone.com`

---

## 9. Cron Jobs (Vercel)

| Schedule | Path | Purpose |
|---|---|---|
| `0 9 1 * *` | `/api/cron/monthly-report` | Monthly performance report email to all restaurant owners |
| `0 3 * * *` | `/api/cron/compute-upsell` | Recompute `upsell_pairs` from last 90 days of order data |
| `0 9 * * *` | `/api/cron/trial-expiry-warning` | Send 7-day trial expiry warning emails |

All cron routes verify `Authorization: Bearer <CRON_SECRET>` header.

---

## 10. Key Business Logic

### 10.1 Availability Cascade
When filtering menu items on the customer portal, the system checks three levels:
1. **Item level:** `available_order_types` + happy hour
2. **Subcategory level:** same checks on the item's subcategory (if any)
3. **Category level:** same checks on the item's category (if any)

An item is hidden if ANY level excludes it. Time is evaluated in the restaurant's IANA timezone.

### 10.2 Loyalty Points Flow

**Earning:**
- Triggered when order status → `completed`
- Points = `floor(subtotal * points_per_dollar)`
- Welcome bonus: awarded on first-ever completed order (checked by absence of `welcome_bonus` transaction)
- Birthday bonus: awarded once per calendar year in the customer's birth month

**Redeeming:**
- Customer selects points to redeem at checkout
- Server validates: program enabled, customer has sufficient balance, meets `minimum_points_to_redeem`
- Points deducted immediately on order creation
- Dollar discount = `floor(points / points_to_redeem)`

**Cancellation refund:**
- If an order with redeemed points is cancelled, points are refunded via `order_refund` transaction

**Expiry (lazy):**
- Checked on every `GET /api/loyalty/balance` call
- If `points_expiry_days` is set and no earn transaction exists within that window, all points are zeroed

### 10.3 Customer Identity Resolution
On each order creation, the server resolves/creates a CRM `customers` record:

**Logged-in customer path:**
1. Find by `auth_user_id` → update
2. Else claim guest record: normalized phone → raw phone → email → create new; link `auth_user_id`

**Guest order path:**
1. Find by normalized phone (10 digits)
2. Else find by raw phone (backward compat)
3. Else find by email (`ILIKE`)
4. Else create new record

**Phone normalization:** `phone.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1')`

### 10.4 Upsell Engine
- `upsell_pairs` recomputed nightly by cron (`/api/cron/compute-upsell`)
- Algorithm: for every item pair that co-occurred in same order in last 90 days, compute `confidence = co_occurrence_count / total_orders_with_item`
- At checkout: query pairs for all cart items, sum confidence scores, rank, return top 3
- Fallback if no pairs: top sellers from last 30 days

### 10.5 Dashboard Period Comparison
- **Today:** current time window vs. same elapsed time the same weekday last week
- **Yesterday:** full day vs. same weekday previous week
- **This week:** Monday 00:00 to now vs. prior week same window

---

## 11. License & Access Control

| Status | Dashboard | Ordering Portal |
|---|---|---|
| `active` | Full access per feature flags | Always accessible |
| `trial` (not expired) | Full access per feature flags | Always accessible |
| `trial` (expired) | Redirect to `/suspended` | Always accessible |
| `suspended` | Redirect to `/suspended` | Always accessible |
| `cancelled` | Redirect to `/suspended` | Always accessible |

**Important:** License restrictions only affect the **owner dashboard**. The **customer ordering portal** (`/restaurant/[slug]`) is always publicly accessible regardless of license status (controlled separately by `restaurant.is_active` and `restaurant.online_ordering_enabled`).

**`/suspended` page shows:**
- Name of the suspended restaurant
- List of other restaurants the owner has access to (non-suspended) → one-click switch
- "Contact Support" button → `mailto:support@simplidone.com`
- "Sign Out" button

**Sidebar feature gating:** The sidebar fetches license from `/api/restaurant/current` (which includes `restaurant_licenses`). Nav items with a `feature` key are hidden if the corresponding flag is `false`. Dashboard and Restaurant Setup are always visible.

---

## 12. Multi-Tenancy Pattern

Every table row includes `restaurant_id`. All data is scoped to a restaurant. There is no cross-restaurant data sharing except:
- `customer_profiles` (platform-wide customer identity)
- `auth.users` (shared auth)
- `platform_admins` (admin access)

Restaurant owners access only their own data. The server validates ownership on every request by checking `restaurants.owner_user_id = auth.user.id`.

---

## 13. Storage

Supabase Storage buckets:
- `restaurant-images` — logos and cover images uploaded via Restaurant Setup
- Item images — uploaded via Menu Builder

Image URLs stored as full public URLs in `restaurants.logo_url`, `restaurants.cover_image_url`, and `menu_items.image_url`.

---

## 14. Mobile App Implementation Notes

### 14.1 Authentication
- Use Supabase Auth client SDK
- Two login flows: owner (restaurant dashboard) and customer (ordering portal)
- Session persists via Supabase's built-in token refresh
- Check `GET /api/user/role` after login to route user to correct app section

### 14.2 Customer App (primary mobile use case)
The customer ordering portal is the primary candidate for a mobile app. It currently lives at `/restaurant/[slug]`.

**Key screens needed:**
1. Restaurant discovery / search (not currently in web app — new feature)
2. Restaurant home (menu, hours, info)
3. Menu browsing (categories → items)
4. Item detail with options
5. Cart
6. Checkout (name/phone/email, order type, tip, loyalty redemption, payment)
7. Order confirmation
8. Order history
9. Reservation booking (date/time/party size picker)
10. Reservation history
11. Loyalty wallet (balance, transactions)
12. Profile settings

**All data available via existing APIs.** Mobile app should use the same endpoints the web app uses. No new backend work needed for the customer-facing flow.

### 14.3 Owner App (secondary mobile use case)
**Key screens needed:**
1. Live order queue (most critical for mobile)
2. Order status updates
3. Reservations for today
4. Basic daily revenue stats

**Push notifications for new orders** — currently uses browser push; native mobile would use FCM/APNs (new backend work needed).

### 14.4 Critical API Calls for Mobile

**Bootstrap a restaurant page:**
```
GET /api/restaurants  (owner) 
  OR
Supabase direct query: restaurants + restaurant_hours + categories + subcategories + menu_items + option_groups + options + tags
```

**Place an order:**
```
POST /api/orders
```

**Get loyalty info:**
```
GET /api/loyalty/balance?restaurant_id=
```

**Get upsell suggestions:**
```
GET /api/upsell?restaurant_id=&item_ids=id1,id2
```

**Check reservation availability:**
```
GET /api/reservations/availability?restaurant_id=&date=&party_size=
```

**Create reservation:**
```
POST /api/reservations
```

### 14.5 Real-time Features
Currently implemented via Supabase Realtime for the order queue. Mobile app can subscribe to the same Supabase channels using the Supabase mobile SDK.

### 14.6 Stripe Integration in Mobile
- Use Stripe mobile SDK (React Native: `@stripe/stripe-react-native`)
- Same payment flow: create PaymentIntent server-side, confirm client-side
- PaymentIntent creation: `POST /api/stripe/create-payment-intent { restaurant_id, amount_cents }`
- Get publishable key: `GET /api/stripe/public-config?restaurant_id=`

### 14.7 `device_type` Field
When logging `customer_events`, set `device_type` to `'ios_app'` or `'android_app'` as appropriate (currently all web events use `'desktop_web'` or `'mobile_web'`).

---

## 15. Data Flow Diagrams

### Order Placement
```
Customer selects items → Cart (local state)
→ Upsell prompt (GET /api/upsell)
→ Checkout form fill
→ [If card] POST /api/stripe/create-payment-intent → Stripe.js confirm
→ POST /api/orders
  → Server: validate restaurant, verify Stripe PI, recalc tax
  → Server: validate + deduct loyalty points
  → Server: resolve/create CRM customer record
  → Server: insert order + order_items + order_item_options
  → Server: insert loyalty_transactions (redemption)
  → Server: insert customer_events (order_placed)
  → Server: sendEmail (order confirmation)
→ Return { order_number, id }
→ Owner dashboard receives new order (Supabase Realtime)
→ Owner updates status → PATCH /api/orders/[id]
  → [On complete] Award loyalty points
  → [On cancel] Refund loyalty points
```

### Reservation Flow
```
Customer selects date + party size
→ GET /api/reservations/availability
→ Customer picks time slot
→ POST /api/reservations
  → Server: validate restaurant, capacity, time slot
  → Server: set status = pending or confirmed (auto_confirm)
  → Server: sendEmail (confirmation)
→ Owner sees in reservations dashboard
→ Owner updates status → PATCH /api/reservations/[id]
  → Server: sendEmail (status update to customer)
```

---

*Document generated from codebase analysis — Wehanda platform, May 2026*
