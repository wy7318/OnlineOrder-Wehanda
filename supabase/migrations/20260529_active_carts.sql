-- Persists cart state for logged-in customers so we can detect abandonment.
-- One row per (restaurant, user) pair — upserted on every cart change.

create table if not exists public.active_carts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  auth_user_id   uuid not null references auth.users(id) on delete cascade,
  items          jsonb not null default '[]',
  updated_at     timestamptz not null default now(),
  -- Set when the cart_abandoned event is fired; prevents duplicate events
  abandoned_at   timestamptz,
  constraint active_carts_restaurant_user_unique unique (restaurant_id, auth_user_id)
);

create index if not exists active_carts_updated_at_idx on public.active_carts (updated_at);
create index if not exists active_carts_restaurant_idx on public.active_carts (restaurant_id);

-- Customers can only read/write their own cart row
alter table public.active_carts enable row level security;

create policy "customer owns cart"
  on public.active_carts
  for all
  using (auth_user_id = auth.uid());
