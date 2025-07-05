-- Add recurring payment fields to scheduled_payments table
ALTER TABLE public.scheduled_payments
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN recurrence_pattern text NULL CHECK (
    recurrence_pattern = ANY (ARRAY['weekly', 'monthly', 'quarterly', 'yearly']::text[])
  ),
  ADD COLUMN recurrence_end_type text NULL CHECK (
    recurrence_end_type = ANY (ARRAY['after', 'on', 'never']::text[])
  ),
  ADD COLUMN recurrence_end_after integer NULL CHECK (
    recurrence_end_after >= 1 AND recurrence_end_after <= 100
  ),
  ADD COLUMN recurrence_end_date timestamp with time zone NULL,
  ADD COLUMN parent_payment_id uuid NULL REFERENCES scheduled_payments(id);

-- Add constraint to ensure recurring payment fields are properly set
ALTER TABLE public.scheduled_payments
  ADD CONSTRAINT recurring_payment_fields_check CHECK (
    (
      is_recurring = false AND
      recurrence_pattern IS NULL AND
      recurrence_end_type IS NULL AND
      recurrence_end_after IS NULL AND
      recurrence_end_date IS NULL AND
      parent_payment_id IS NULL
    ) OR (
      is_recurring = true AND
      recurrence_pattern IS NOT NULL AND
      recurrence_end_type IS NOT NULL AND
      (
        -- For 'after' end type, end_after is required and end_date is null
        (recurrence_end_type = 'after' AND recurrence_end_after IS NOT NULL AND recurrence_end_date IS NULL) OR
        -- For 'on' end type, end_date is required and end_after is null
        (recurrence_end_type = 'on' AND recurrence_end_date IS NOT NULL AND recurrence_end_after IS NULL) OR
        -- For 'never' end type, both end_after and end_date are null
        (recurrence_end_type = 'never' AND recurrence_end_after IS NULL AND recurrence_end_date IS NULL)
      )
    )
  ); 