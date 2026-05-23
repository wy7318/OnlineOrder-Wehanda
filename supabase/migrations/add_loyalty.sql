-- Loyalty program configuration (one per restaurant)
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id            uuid NOT NULL UNIQUE
                             REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_enabled               boolean NOT NULL DEFAULT false,
  program_name             text NOT NULL DEFAULT 'Rewards Club',
  points_per_dollar        integer NOT NULL DEFAULT 1,
  points_to_redeem         integer NOT NULL DEFAULT 100,  -- X points = $1 off
  minimum_points_to_redeem integer NOT NULL DEFAULT 100,
  welcome_bonus_points     integer NOT NULL DEFAULT 0,
  birthday_bonus_points    integer NOT NULL DEFAULT 0,
  points_expiry_days       integer,                       -- NULL = never expire
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Append-only points ledger
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES public.customers(id)   ON DELETE CASCADE,
  order_id      uuid REFERENCES public.orders(id),
  points_delta  integer NOT NULL,  -- positive = earned, negative = redeemed/expired
  type          text NOT NULL CHECK (type = ANY (ARRAY[
                  'order_earn', 'order_redeem',
                  'welcome_bonus', 'birthday_bonus',
                  'manual_adjust', 'expiry'
                ])),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_tx_customer_idx
  ON public.loyalty_transactions (restaurant_id, customer_id, created_at DESC);

-- Track loyalty redemption directly on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount  numeric  NOT NULL DEFAULT 0;
