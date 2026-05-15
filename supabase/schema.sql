-- ============================================================
--  OrderFlow SaaS — Database Schema
--  Run this entire file in Supabase SQL Editor (once)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
--  RESTAURANTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.restaurants (
  id                        uuid primary key default gen_random_uuid(),
  owner_user_id             uuid not null references auth.users(id) on delete cascade,
  name                      text not null,
  slug                      text not null unique,
  logo_url                  text,
  cover_image_url           text,
  address                   text,
  phone                     text,
  email                     text,
  website                   text,
  description               text,
  timezone                  text not null default 'America/New_York',
  online_ordering_enabled   boolean not null default true,
  pickup_enabled            boolean not null default true,
  dine_in_enabled           boolean not null default false,
  delivery_enabled          boolean not null default false,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  RESTAURANT HOURS
-- ────────────────────────────────────────────────────────────
create table if not exists public.restaurant_hours (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  open_time     text not null default '09:00',
  close_time    text not null default '21:00',
  is_closed     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, day_of_week)
);

-- ────────────────────────────────────────────────────────────
--  CATEGORIES
-- ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  SUBCATEGORIES
-- ────────────────────────────────────────────────────────────
create table if not exists public.subcategories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  name          text not null,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  TAGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.tags (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  color         text not null default '#f97316',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  MENU ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  category_id    uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  name           text not null,
  description    text,
  price          numeric(10,2) not null default 0,
  image_url      text,
  is_available   boolean not null default true,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  MENU ITEM TAGS (many-to-many)
-- ────────────────────────────────────────────────────────────
create table if not exists public.menu_item_tags (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id  uuid not null references public.menu_items(id) on delete cascade,
  tag_id        uuid not null references public.tags(id) on delete cascade,
  unique (menu_item_id, tag_id)
);

-- ────────────────────────────────────────────────────────────
--  OPTION GROUPS
-- ────────────────────────────────────────────────────────────
create table if not exists public.option_groups (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id  uuid not null references public.menu_items(id) on delete cascade,
  name          text not null,
  is_required   boolean not null default false,
  min_select    integer not null default 0,
  max_select    integer not null default 1,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  OPTIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.options (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  option_group_id  uuid not null references public.option_groups(id) on delete cascade,
  name             text not null,
  additional_price numeric(10,2) not null default 0,
  is_active        boolean not null default true,
  display_order    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  CUSTOMERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, phone)
);

-- ────────────────────────────────────────────────────────────
--  ORDERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  restaurant_id           uuid not null references public.restaurants(id) on delete cascade,
  customer_id             uuid references public.customers(id) on delete set null,
  order_number            text not null unique,
  status                  text not null default 'new'
    check (status in ('new','accepted','preparing','ready','completed','cancelled')),
  order_type              text not null default 'pickup'
    check (order_type in ('pickup','dine_in','delivery')),
  subtotal                numeric(10,2) not null default 0,
  tax_amount              numeric(10,2) not null default 0,
  fee_amount              numeric(10,2) not null default 0,
  total_amount            numeric(10,2) not null default 0,
  customer_name           text not null,
  customer_phone          text not null,
  customer_email          text not null default '',
  order_notes             text,
  delivery_address        text,
  delivery_instructions   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  ORDER ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references public.restaurants(id) on delete cascade,
  order_id              uuid not null references public.orders(id) on delete cascade,
  menu_item_id          uuid references public.menu_items(id) on delete set null,
  item_name_snapshot    text not null,
  base_price_snapshot   numeric(10,2) not null,
  quantity              integer not null default 1 check (quantity > 0),
  notes                 text,
  line_total            numeric(10,2) not null,
  created_at            timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  ORDER ITEM OPTIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.order_item_options (
  id                          uuid primary key default gen_random_uuid(),
  restaurant_id               uuid not null references public.restaurants(id) on delete cascade,
  order_item_id               uuid not null references public.order_items(id) on delete cascade,
  option_group_name_snapshot  text not null,
  option_name_snapshot        text not null,
  additional_price_snapshot   numeric(10,2) not null default 0,
  created_at                  timestamptz not null default now()
);

-- ============================================================
--  INDEXES FOR PERFORMANCE
-- ============================================================
create index if not exists idx_restaurants_slug on public.restaurants(slug);
create index if not exists idx_restaurants_owner on public.restaurants(owner_user_id);
create index if not exists idx_categories_restaurant on public.categories(restaurant_id);
create index if not exists idx_subcategories_category on public.subcategories(category_id);
create index if not exists idx_menu_items_restaurant on public.menu_items(restaurant_id);
create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_option_groups_item on public.option_groups(menu_item_id);
create index if not exists idx_options_group on public.options(option_group_id);
create index if not exists idx_orders_restaurant on public.orders(restaurant_id);
create index if not exists idx_orders_status on public.orders(restaurant_id, status);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_item_options_item on public.order_item_options(order_item_id);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.restaurants          enable row level security;
alter table public.restaurant_hours     enable row level security;
alter table public.categories           enable row level security;
alter table public.subcategories        enable row level security;
alter table public.tags                 enable row level security;
alter table public.menu_items           enable row level security;
alter table public.menu_item_tags       enable row level security;
alter table public.option_groups        enable row level security;
alter table public.options              enable row level security;
alter table public.customers            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_item_options   enable row level security;

-- ────────────────────────────────────────────────────────────
--  Helper: is current user the owner of a restaurant?
-- ────────────────────────────────────────────────────────────
create or replace function public.is_restaurant_owner(p_restaurant_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.restaurants
    where id = p_restaurant_id and owner_user_id = auth.uid()
  );
$$;

-- ────────────────────────────────────────────────────────────
--  RESTAURANTS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Public restaurants are viewable by everyone" on public.restaurants;
create policy "Public restaurants are viewable by everyone"
  on public.restaurants for select using (is_active = true);

drop policy if exists "Owners can manage their own restaurant" on public.restaurants;
create policy "Owners can manage their own restaurant"
  on public.restaurants for all using (owner_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
--  RESTAURANT HOURS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Hours are publicly readable" on public.restaurant_hours;
create policy "Hours are publicly readable"
  on public.restaurant_hours for select using (true);

drop policy if exists "Owners manage hours" on public.restaurant_hours;
create policy "Owners manage hours"
  on public.restaurant_hours for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  CATEGORIES policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable"
  on public.categories for select using (is_active = true);

drop policy if exists "Owners manage categories" on public.categories;
create policy "Owners manage categories"
  on public.categories for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  SUBCATEGORIES policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Subcategories are publicly readable" on public.subcategories;
create policy "Subcategories are publicly readable"
  on public.subcategories for select using (is_active = true);

drop policy if exists "Owners manage subcategories" on public.subcategories;
create policy "Owners manage subcategories"
  on public.subcategories for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  TAGS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Tags are publicly readable" on public.tags;
create policy "Tags are publicly readable"
  on public.tags for select using (true);

drop policy if exists "Owners manage tags" on public.tags;
create policy "Owners manage tags"
  on public.tags for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  MENU ITEMS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Available menu items are publicly readable" on public.menu_items;
create policy "Available menu items are publicly readable"
  on public.menu_items for select using (is_available = true);

drop policy if exists "Owners manage menu items" on public.menu_items;
create policy "Owners manage menu items"
  on public.menu_items for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  MENU ITEM TAGS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Item tags are publicly readable" on public.menu_item_tags;
create policy "Item tags are publicly readable"
  on public.menu_item_tags for select using (true);

drop policy if exists "Owners manage item tags" on public.menu_item_tags;
create policy "Owners manage item tags"
  on public.menu_item_tags for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  OPTION GROUPS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Option groups are publicly readable" on public.option_groups;
create policy "Option groups are publicly readable"
  on public.option_groups for select using (true);

drop policy if exists "Owners manage option groups" on public.option_groups;
create policy "Owners manage option groups"
  on public.option_groups for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  OPTIONS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Options are publicly readable" on public.options;
create policy "Options are publicly readable"
  on public.options for select using (is_active = true);

drop policy if exists "Owners manage options" on public.options;
create policy "Owners manage options"
  on public.options for all using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  CUSTOMERS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Owners manage customers" on public.customers;
create policy "Owners manage customers"
  on public.customers for all using (is_restaurant_owner(restaurant_id));

drop policy if exists "Anyone can upsert customer via API" on public.customers;
create policy "Anyone can upsert customer via API"
  on public.customers for insert with check (true);

-- ────────────────────────────────────────────────────────────
--  ORDERS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Anyone can insert an order" on public.orders;
create policy "Anyone can insert an order"
  on public.orders for insert with check (true);

drop policy if exists "Owners view their orders" on public.orders;
create policy "Owners view their orders"
  on public.orders for select using (is_restaurant_owner(restaurant_id));

drop policy if exists "Owners update their orders" on public.orders;
create policy "Owners update their orders"
  on public.orders for update using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  ORDER ITEMS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Anyone can insert order items" on public.order_items;
create policy "Anyone can insert order items"
  on public.order_items for insert with check (true);

drop policy if exists "Owners view order items" on public.order_items;
create policy "Owners view order items"
  on public.order_items for select using (is_restaurant_owner(restaurant_id));

-- ────────────────────────────────────────────────────────────
--  ORDER ITEM OPTIONS policies
-- ────────────────────────────────────────────────────────────
drop policy if exists "Anyone can insert order item options" on public.order_item_options;
create policy "Anyone can insert order item options"
  on public.order_item_options for insert with check (true);

drop policy if exists "Owners view order item options" on public.order_item_options;
create policy "Owners view order item options"
  on public.order_item_options for select using (is_restaurant_owner(restaurant_id));

-- ============================================================
--  STORAGE BUCKET for menu images
-- ============================================================
insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true)
  on conflict do nothing;

drop policy if exists "Anyone can view menu images" on storage.objects;
create policy "Anyone can view menu images"
  on storage.objects for select using (bucket_id = 'menu-images');

drop policy if exists "Authenticated users can upload menu images" on storage.objects;
create policy "Authenticated users can upload menu images"
  on storage.objects for insert with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update menu images" on storage.objects;
create policy "Authenticated users can update menu images"
  on storage.objects for update using (bucket_id = 'menu-images' and auth.role() = 'authenticated');
