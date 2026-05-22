-- Add cuisine_types array to restaurants for multi-select restaurant categorisation
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS cuisine_types text[] NOT NULL DEFAULT '{}';
