-- ═══════════════════════════════════════════════════════════════════════
-- Customer Management Module — AI-Ready Schema
-- Extends existing customers table; creates 5 new tables.
-- Uses restaurant_id (not tenant_id) to match existing conventions.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Extend existing customers table ───────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name                text,
  ADD COLUMN IF NOT EXISTS last_name                 text,
  ADD COLUMN IF NOT EXISTS birthday                  date,
  ADD COLUMN IF NOT EXISTS anniversary               date,
  ADD COLUMN IF NOT EXISTS preferred_contact_method  text NOT NULL DEFAULT 'none'
    CHECK (preferred_contact_method IN ('email', 'sms', 'push', 'none')),
  ADD COLUMN IF NOT EXISTS marketing_opt_in          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at       timestamptz,
  ADD COLUMN IF NOT EXISTS acquisition_source        text NOT NULL DEFAULT 'organic'
    CHECK (acquisition_source IN (
      'organic','google_ad','instagram_ad','facebook_ad',
      'referral','qr_code','walk_in','loyalty_signup','other'
    )),
  ADD COLUMN IF NOT EXISTS acquisition_campaign_id   text,
  ADD COLUMN IF NOT EXISTS acquisition_source_detail text,
  ADD COLUMN IF NOT EXISTS loyalty_points_balance    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags                      text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes                     text,
  ADD COLUMN IF NOT EXISTS is_blocked                boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at              timestamptz,
  ADD COLUMN IF NOT EXISTS auth_user_id              uuid REFERENCES auth.users(id),
  -- AI placeholder columns (populate later via ML pipeline)
  ADD COLUMN IF NOT EXISTS churn_risk_score          float,
  ADD COLUMN IF NOT EXISTS ltv_predicted_90d         decimal,
  ADD COLUMN IF NOT EXISTS segment_ai_label          text,
  ADD COLUMN IF NOT EXISTS last_ai_scored_at         timestamptz,
  ADD COLUMN IF NOT EXISTS data_version              integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at                timestamptz NOT NULL DEFAULT now();

-- Indexes on customers
CREATE INDEX IF NOT EXISTS customers_restaurant_id_idx
  ON public.customers(restaurant_id);
CREATE INDEX IF NOT EXISTS customers_restaurant_acquisition_idx
  ON public.customers(restaurant_id, acquisition_source);
CREATE INDEX IF NOT EXISTS customers_restaurant_last_seen_idx
  ON public.customers(restaurant_id, last_seen_at);
CREATE INDEX IF NOT EXISTS customers_auth_user_id_idx
  ON public.customers(auth_user_id);

-- Index on existing orders.customer_id (may already exist from add_customer_auth.sql)
CREATE INDEX IF NOT EXISTS orders_customer_id_idx
  ON public.orders(customer_id);

-- Updated_at trigger for customers (reuse function from add_customer_auth.sql)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'customers_updated_at'
  ) THEN
    CREATE TRIGGER customers_updated_at
      BEFORE UPDATE ON public.customers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS on customers (owners manage their restaurant's customers)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_customers"
  ON public.customers FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

CREATE POLICY "owners_insert_customers"
  ON public.customers FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

CREATE POLICY "owners_update_customers"
  ON public.customers FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- Service role (admin client) bypasses RLS — existing order placement still works.

-- ── 2. customer_addresses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id    uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label            text        NOT NULL DEFAULT 'Home',
  address_line_1   text        NOT NULL,
  address_line_2   text,
  city             text        NOT NULL,
  state            text        NOT NULL,
  zip              text        NOT NULL,
  country          text        NOT NULL DEFAULT 'US',
  latitude         decimal,
  longitude        decimal,
  is_default       boolean     NOT NULL DEFAULT false,
  delivery_zone_id text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_addresses"
  ON public.customer_addresses FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

CREATE TRIGGER customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. customer_events (append-only — AI training data) ───────────────────
CREATE TABLE IF NOT EXISTS public.customer_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_type    text        NOT NULL CHECK (event_type IN (
    'order_placed','order_cancelled','order_refunded',
    'cart_abandoned','item_viewed','promo_redeemed',
    'promo_ignored','review_submitted','support_ticket_opened',
    'loyalty_points_earned','loyalty_points_redeemed',
    'email_opened','email_clicked','sms_opened',
    'app_session_started','login','logout'
  )),
  event_at      timestamptz NOT NULL,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  session_id    text,
  device_type   text        NOT NULL DEFAULT 'desktop_web'
    CHECK (device_type IN ('mobile_web','desktop_web','ios_app','android_app')),
  source_id     text,
  metadata      jsonb       NOT NULL DEFAULT '{}'
);

-- Append-only: no UPDATE or DELETE policies are created intentionally.
CREATE INDEX IF NOT EXISTS customer_events_customer_id_event_at_idx
  ON public.customer_events(customer_id, event_at DESC);
CREATE INDEX IF NOT EXISTS customer_events_restaurant_type_event_at_idx
  ON public.customer_events(restaurant_id, event_type, event_at DESC);

ALTER TABLE public.customer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_events"
  ON public.customer_events FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- INSERT via service role (admin client) only — enforced in application code.

-- ── 4. customer_segments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  color         text        NOT NULL DEFAULT '#6B7280',
  is_system     boolean     NOT NULL DEFAULT false,
  created_by    uuid        REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_segments"
  ON public.customer_segments FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

CREATE TRIGGER customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. customer_segment_members ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_segment_members (
  segment_id    uuid        NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  customer_id   uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  added_at      timestamptz NOT NULL DEFAULT now(),
  added_by      text        NOT NULL DEFAULT 'manual',
  PRIMARY KEY (segment_id, customer_id)
);

ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_segment_members"
  ON public.customer_segment_members FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- ── 6. customer_dietary_flags ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_dietary_flags (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  flag_type     text        NOT NULL CHECK (flag_type IN (
    'vegetarian','vegan','gluten_free','halal',
    'kosher','nut_allergy','dairy_free','shellfish_allergy','other'
  )),
  source        text        NOT NULL DEFAULT 'self_reported'
    CHECK (source IN ('self_reported','inferred_from_orders')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, flag_type)
);

ALTER TABLE public.customer_dietary_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_dietary_flags"
  ON public.customer_dietary_flags FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- ── 7. Backfill: create order_placed events for existing orders ───────────
INSERT INTO public.customer_events (
  customer_id, restaurant_id, event_type,
  event_at, recorded_at, source_id, device_type, metadata
)
SELECT
  o.customer_id,
  o.restaurant_id,
  'order_placed',
  o.created_at,
  now(),
  o.id::text,
  'desktop_web',
  jsonb_build_object(
    'order_id',      o.id,
    'order_total',   o.total_amount,
    'item_count',    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id),
    'order_type',    o.order_type,
    'channel',       'web',
    'promo_applied', false,
    'tip_amount',    o.fee_amount,
    'tip_pct',       CASE WHEN o.subtotal > 0
                       THEN ROUND((o.fee_amount / o.subtotal * 100)::numeric, 1)
                       ELSE 0 END
  )
FROM public.orders o
WHERE o.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_events ce
    WHERE ce.source_id = o.id::text
      AND ce.event_type = 'order_placed'
  );
