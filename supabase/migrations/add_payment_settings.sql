-- restaurant_payment_settings: Stripe Connect integration per restaurant.
-- The PLATFORM holds API keys in environment variables.
-- Restaurants connect their own Stripe account via OAuth (one click).
CREATE TABLE IF NOT EXISTS public.restaurant_payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE,
  stripe_enabled boolean NOT NULL DEFAULT false,
  stripe_account_id text,                          -- connected Stripe account (acct_...)
  stripe_mode text NOT NULL DEFAULT 'live'
    CHECK (stripe_mode IN ('live', 'test')),
  connected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_payment_settings_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_payment_settings_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE
);

-- Track how each order was paid
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'stripe')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));
