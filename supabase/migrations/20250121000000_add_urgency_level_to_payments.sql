-- Add urgency_level field to payments table
ALTER TABLE public.payments
ADD COLUMN urgency_level text NOT NULL DEFAULT 'medium'
CHECK (urgency_level IN ('low', 'medium', 'high'));

-- Add urgency_level field to scheduled_payments table
ALTER TABLE public.scheduled_payments
ADD COLUMN urgency_level text NOT NULL DEFAULT 'medium'
CHECK (urgency_level IN ('low', 'medium', 'high'));

-- Add comments to document the purpose of the columns
COMMENT ON COLUMN public.payments.urgency_level IS 'Priority level of the payment: low, medium, high';
COMMENT ON COLUMN public.scheduled_payments.urgency_level IS 'Priority level of the scheduled payment: low, medium, high';

-- Create indexes for better query performance
CREATE INDEX idx_payments_urgency_level ON public.payments(urgency_level);
CREATE INDEX idx_scheduled_payments_urgency_level ON public.scheduled_payments(urgency_level);
