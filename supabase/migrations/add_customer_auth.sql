-- ── Customer profiles (platform-wide, not restaurant-scoped) ──────────────
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  phone        text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Customers can read and write only their own profile
DROP POLICY IF EXISTS "customer_own_profile" ON public.customer_profiles;
CREATE POLICY "customer_own_profile"
  ON public.customer_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Link orders to authenticated customer accounts ─────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS orders_customer_user_id_idx
  ON public.orders(customer_user_id);

-- Authenticated customers can read their own orders
DROP POLICY IF EXISTS "customers_read_own_orders" ON public.orders;
CREATE POLICY "customers_read_own_orders"
  ON public.orders FOR SELECT
  USING (customer_user_id = auth.uid());

-- ── Link reservations to authenticated customer accounts ──────────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS reservations_customer_user_id_idx
  ON public.reservations(customer_user_id);

-- ── Updated_at trigger for customer_profiles ───────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
