-- Add tax_rate column to restaurants
-- Run this in Supabase SQL Editor
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,3) NOT NULL DEFAULT 0;
