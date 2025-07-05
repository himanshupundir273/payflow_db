-- Create table to track scheduled payment executions
CREATE TABLE public.scheduled_payment_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scheduled_payment_id uuid NOT NULL REFERENCES scheduled_payments(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  execution_date timestamp with time zone NOT NULL DEFAULT now(),
  execution_number integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT scheduled_payment_executions_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_payment_executions_unique UNIQUE (scheduled_payment_id, payment_id),
  CONSTRAINT scheduled_payment_executions_execution_number_check CHECK (execution_number >= 1)
);

-- Create indexes for better query performance
CREATE INDEX idx_scheduled_payment_executions_scheduled_payment_id 
ON public.scheduled_payment_executions(scheduled_payment_id);

CREATE INDEX idx_scheduled_payment_executions_payment_id 
ON public.scheduled_payment_executions(payment_id);

CREATE INDEX idx_scheduled_payment_executions_execution_date 
ON public.scheduled_payment_executions(execution_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_payment_executions_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_payment_executions_updated_at
  BEFORE UPDATE ON public.scheduled_payment_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_payment_executions_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.scheduled_payment_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view executions for their scheduled payments"
ON public.scheduled_payment_executions
FOR SELECT
TO authenticated
USING (
  scheduled_payment_id IN (
    SELECT id FROM scheduled_payments WHERE requested_by = auth.uid()
  )
);

CREATE POLICY "Admins and accounts can view all executions"
ON public.scheduled_payment_executions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'accounts')
  )
);

CREATE POLICY "System can insert executions"
ON public.scheduled_payment_executions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.scheduled_payment_executions IS 'Tracks the relationship between scheduled payments and the payments generated from them';
COMMENT ON COLUMN public.scheduled_payment_executions.scheduled_payment_id IS 'Reference to the scheduled payment that was executed';
COMMENT ON COLUMN public.scheduled_payment_executions.payment_id IS 'Reference to the payment record created from the scheduled payment';
COMMENT ON COLUMN public.scheduled_payment_executions.execution_date IS 'Date when the scheduled payment was executed';
COMMENT ON COLUMN public.scheduled_payment_executions.execution_number IS 'Sequential number of this execution (1st, 2nd, 3rd, etc.)'; 