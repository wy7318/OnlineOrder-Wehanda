ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS reservation_auto_confirm boolean NOT NULL DEFAULT false;
