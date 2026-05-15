-- ── Reservation settings on restaurants ───────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS reservations_enabled         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_capacity         integer     NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS reservation_max_party_size   integer     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS reservation_advance_days     integer     NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS reservation_min_notice_hours integer     NOT NULL DEFAULT 1;

-- ── Reservations table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name     text        NOT NULL,
  customer_phone    text        NOT NULL,
  customer_email    text,
  party_size        integer     NOT NULL CHECK (party_size >= 1 AND party_size <= 100),
  reservation_date  date        NOT NULL,
  reservation_time  time        NOT NULL,
  status            text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','declined','cancelled','completed','no_show')),
  notes             text,
  internal_notes    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservations_restaurant_date_idx
  ON public.reservations(restaurant_id, reservation_date);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Customers can create reservations
CREATE POLICY "Public can create reservations"
  ON public.reservations FOR INSERT WITH CHECK (true);

-- Public can read for availability checks
CREATE POLICY "Public can read reservations"
  ON public.reservations FOR SELECT USING (true);

-- Owners can update their restaurant's reservations
CREATE POLICY "Owners can update reservations"
  ON public.reservations FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- Owners can delete their restaurant's reservations
CREATE POLICY "Owners can delete reservations"
  ON public.reservations FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- ── Realtime (run separately in Supabase SQL editor if realtime push is needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
