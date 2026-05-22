-- Smart upsell: co-occurrence pairs computed nightly by /api/cron/compute-upsell

CREATE TABLE IF NOT EXISTS public.upsell_pairs (
  restaurant_id       uuid NOT NULL,
  item_id             uuid NOT NULL,
  suggested_item_id   uuid NOT NULL,
  co_occurrence_count integer NOT NULL DEFAULT 0,
  confidence          numeric(6,4) NOT NULL DEFAULT 0,
  last_computed_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upsell_pairs_pkey
    PRIMARY KEY (restaurant_id, item_id, suggested_item_id),
  CONSTRAINT upsell_pairs_restaurant_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  CONSTRAINT upsell_pairs_item_fkey
    FOREIGN KEY (item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE,
  CONSTRAINT upsell_pairs_suggested_fkey
    FOREIGN KEY (suggested_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE
);

-- Index for the query pattern: given cart item IDs, find suggestions
CREATE INDEX IF NOT EXISTS upsell_pairs_lookup_idx
  ON public.upsell_pairs (restaurant_id, item_id);

-- Track which order items were added via the upsell prompt (for reporting)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS added_from_upsell boolean NOT NULL DEFAULT false;
