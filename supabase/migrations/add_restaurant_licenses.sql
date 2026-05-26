CREATE TABLE IF NOT EXISTS public.restaurant_licenses (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  feature_menu boolean NOT NULL DEFAULT true,
  feature_orders boolean NOT NULL DEFAULT true,
  feature_reservations boolean NOT NULL DEFAULT true,
  feature_customers boolean NOT NULL DEFAULT true,
  feature_analytics boolean NOT NULL DEFAULT true,
  trial_ends_at timestamptz DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-populate a default active license for every existing restaurant
INSERT INTO public.restaurant_licenses (restaurant_id)
SELECT id FROM public.restaurants
ON CONFLICT (restaurant_id) DO NOTHING;
