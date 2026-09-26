-- Add item type to payment requests
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS item_type text;

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_item_type_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_item_type_check
CHECK (
  item_type IS NULL
  OR item_type IN ('Raw Materials', 'Consumable', 'Service', 'Payroll')
);

COMMENT ON COLUMN public.payments.item_type IS 'Item type: Raw Materials, Consumable, Service, or Payroll';
