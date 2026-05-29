ALTER TABLE public.restaurant_licenses
  ADD COLUMN IF NOT EXISTS feature_revenue_boost boolean NOT NULL DEFAULT true;
