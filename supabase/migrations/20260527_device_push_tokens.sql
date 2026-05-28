-- Mobile app push notification device registration
-- Run this in the Supabase SQL editor or via `supabase db push`

create table if not exists public.device_push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  expo_push_token text not null,
  platform        text not null default 'unknown', -- 'ios' | 'android'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One row per physical device token; upsert on conflict refreshes updated_at
  constraint device_push_tokens_token_unique unique (expo_push_token)
);

-- Index so the orders/reservations routes can quickly fetch tokens by restaurant
create index if not exists device_push_tokens_restaurant_id_idx
  on public.device_push_tokens (restaurant_id);

-- Owners can only see their own restaurant's tokens
alter table public.device_push_tokens enable row level security;

create policy "owner can manage own tokens"
  on public.device_push_tokens
  for all
  using (
    restaurant_id in (
      select id from public.restaurants where owner_user_id = auth.uid()
    )
  );
