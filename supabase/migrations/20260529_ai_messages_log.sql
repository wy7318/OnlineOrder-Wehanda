CREATE TABLE public.ai_messages_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  customer_id uuid,
  message_type text NOT NULL CHECK (message_type = ANY (ARRAY[
    'cart_recovery'::text,
    'win_back'::text,
    'loyalty_nudge'::text
  ])),
  channel text NOT NULL DEFAULT 'email' CHECK (channel = ANY (ARRAY['email'::text, 'push'::text])),
  reference_id text,
  subject text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_messages_log_pkey PRIMARY KEY (id),
  CONSTRAINT ai_messages_log_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT ai_messages_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

CREATE INDEX idx_ai_messages_log_lookup
  ON public.ai_messages_log (customer_id, message_type, sent_at DESC);

CREATE INDEX idx_ai_messages_log_restaurant
  ON public.ai_messages_log (restaurant_id, sent_at DESC);

ALTER TABLE public.ai_messages_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_ai_messages_log"
  ON public.ai_messages_log
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
    )
  );
