-- Add next_execution column to scheduled_payments table
ALTER TABLE public.scheduled_payments
  ADD COLUMN next_execution timestamp with time zone NULL;

COMMENT ON COLUMN public.scheduled_payments.next_execution IS 'The next scheduled execution date for recurring or processed payments. Used for upcoming logic.';

-- Create index for efficient queries on next_execution
CREATE INDEX idx_scheduled_payments_next_execution
  ON public.scheduled_payments(next_execution)
  WHERE next_execution IS NOT NULL;

-- Trigger function to update next_execution when execution count or recurrence changes
CREATE OR REPLACE FUNCTION update_next_execution()
RETURNS TRIGGER AS $$
DECLARE
  next_date timestamptz;
BEGIN
  -- Only calculate for recurring payments
  IF NEW.is_recurring THEN
    IF NEW.recurrence_pattern = 'weekly' THEN
      next_date := COALESCE(NEW.last_execution_date, NEW.scheduled_for) + INTERVAL '1 week';
    ELSIF NEW.recurrence_pattern = 'monthly' THEN
      next_date := COALESCE(NEW.last_execution_date, NEW.scheduled_for) + INTERVAL '1 month';
    ELSIF NEW.recurrence_pattern = 'quarterly' THEN
      next_date := COALESCE(NEW.last_execution_date, NEW.scheduled_for) + INTERVAL '3 months';
    ELSIF NEW.recurrence_pattern = 'yearly' THEN
      next_date := COALESCE(NEW.last_execution_date, NEW.scheduled_for) + INTERVAL '1 year';
    ELSE
      next_date := NULL;
    END IF;
    NEW.next_execution := next_date;
  ELSE
    NEW.next_execution := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update next_execution on insert or update of relevant columns
DROP TRIGGER IF EXISTS trg_update_next_execution ON public.scheduled_payments;
CREATE TRIGGER trg_update_next_execution
  BEFORE INSERT OR UPDATE OF last_execution_date, recurrence_pattern, is_recurring, execution_count
  ON public.scheduled_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_next_execution(); 