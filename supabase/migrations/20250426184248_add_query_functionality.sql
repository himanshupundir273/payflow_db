-- Add query_raised status to payments table
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_status_check,
  ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'query_raised'));

-- Add query_raised status to payment_history table
ALTER TABLE payment_history
  DROP CONSTRAINT IF EXISTS payment_history_status_check,
  ADD CONSTRAINT payment_history_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'query_raised')); 