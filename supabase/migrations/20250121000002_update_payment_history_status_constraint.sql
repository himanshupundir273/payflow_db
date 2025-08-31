-- Update payment_history status constraint to allow 'postponed' status
-- First, drop the existing constraint
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_status_check;

-- Recreate the constraint with the new allowed values
ALTER TABLE payment_history ADD CONSTRAINT payment_history_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'query_raised', 'postponed'));

-- Add comment to document the constraint
COMMENT ON CONSTRAINT payment_history_status_check ON payment_history IS 'Status must be one of: pending, approved, rejected, processed, query_raised, postponed';
