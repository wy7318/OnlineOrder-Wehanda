-- Add availability restriction columns to categories and subcategories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS available_order_types text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS happy_hour_start time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_end time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_days integer[] DEFAULT NULL;

ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS available_order_types text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS happy_hour_start time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_end time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_days integer[] DEFAULT NULL;
