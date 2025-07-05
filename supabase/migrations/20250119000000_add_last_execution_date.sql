-- Add last_execution_date field to scheduled_payments table
ALTER TABLE public.scheduled_payments
  ADD COLUMN last_execution_date timestamp with time zone NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.scheduled_payments.last_execution_date IS 'Timestamp of when this recurring payment was last executed/processed';

-- Create index for efficient queries on last execution date
CREATE INDEX idx_scheduled_payments_last_execution_date 
ON public.scheduled_payments(last_execution_date) 
WHERE last_execution_date IS NOT NULL;

-- Create index for recurring payments that need to be processed
CREATE INDEX idx_scheduled_payments_recurring_processing 
ON public.scheduled_payments(scheduled_for, is_recurring, last_execution_date) 
WHERE is_recurring = true AND schedule_status IN ('pending', 'approved'); 