-- Update payments status constraint to allow 'postponed' status
-- First, drop the existing constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Recreate the constraint with the new allowed values
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'query_raised', 'postponed'));

-- Add comment to document the constraint
COMMENT ON CONSTRAINT payments_status_check ON payments IS 'Status must be one of: pending, approved, rejected, processed, query_raised, postponed';
