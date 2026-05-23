-- Add order_refund type to loyalty_transactions
-- Required for the cancellation refund flow added after initial migration.

ALTER TABLE public.loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;

ALTER TABLE public.loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'order_earn', 'order_redeem', 'order_refund',
    'welcome_bonus', 'birthday_bonus',
    'manual_adjust', 'expiry'
  ]));
