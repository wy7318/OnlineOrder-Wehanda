-- ═══════════════════════════════════════════════════════════════════════
-- AI Marketing Campaigns — Attribution & Automation
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. campaigns (one row per batch send) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id      uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  campaign_type      text        NOT NULL CHECK (campaign_type IN (
    'birthday', 'after_order', 'new_item_launch',
    'quiet_day', 'milestone', 'win_back', 'cart_recovery', 'loyalty_nudge'
  )),
  name               text        NOT NULL,
  status             text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  sent_count         integer     NOT NULL DEFAULT 0,
  click_count        integer     NOT NULL DEFAULT 0,
  order_count        integer     NOT NULL DEFAULT 0,
  revenue_attributed numeric     NOT NULL DEFAULT 0,
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_restaurant_type_idx
  ON public.campaigns(restaurant_id, campaign_type, created_at DESC);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_campaigns"
  ON public.campaigns FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- ── 2. campaign_contacts (one row per customer-send) ─────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id        uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  restaurant_id      uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id        uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status             text        NOT NULL DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'failed', 'clicked', 'converted')),
  click_token        uuid        NOT NULL DEFAULT gen_random_uuid(),
  subject            text,
  sent_at            timestamptz,
  clicked_at         timestamptz,
  converted_at       timestamptz,
  order_id           uuid        REFERENCES public.orders(id),
  revenue_attributed numeric     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_contacts_click_token_idx
  ON public.campaign_contacts(click_token);
CREATE INDEX IF NOT EXISTS campaign_contacts_customer_idx
  ON public.campaign_contacts(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_contacts_campaign_idx
  ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_contacts_restaurant_sent_idx
  ON public.campaign_contacts(restaurant_id, sent_at DESC);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_campaign_contacts"
  ON public.campaign_contacts FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- ── 3. Tag orders with the campaign that drove them ───────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS campaign_contact_id uuid
    REFERENCES public.campaign_contacts(id);

CREATE INDEX IF NOT EXISTS orders_campaign_contact_idx
  ON public.orders(campaign_contact_id)
  WHERE campaign_contact_id IS NOT NULL;

-- ── 4. Per-restaurant automation on/off toggles ───────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_automation_settings (
  restaurant_id       uuid    PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  birthday_enabled    boolean NOT NULL DEFAULT true,
  after_order_enabled boolean NOT NULL DEFAULT true,
  quiet_day_enabled   boolean NOT NULL DEFAULT true,
  milestone_enabled   boolean NOT NULL DEFAULT true,
  new_item_enabled    boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_automation_settings"
  ON public.campaign_automation_settings FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- ── 5. Expand ai_messages_log to cover new campaign types ─────────────────
ALTER TABLE public.ai_messages_log
  DROP CONSTRAINT IF EXISTS ai_messages_log_message_type_check;

ALTER TABLE public.ai_messages_log
  ADD CONSTRAINT ai_messages_log_message_type_check
  CHECK (message_type = ANY (ARRAY[
    'cart_recovery', 'win_back', 'loyalty_nudge',
    'birthday', 'after_order', 'new_item_launch', 'quiet_day', 'milestone'
  ]));
