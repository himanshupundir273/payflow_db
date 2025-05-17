-- Add query_details column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS query_details TEXT;

-- Update the status enum to include 'query_raised'
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments
ADD CONSTRAINT payments_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'query_raised'));

-- Update the database type definition
COMMENT ON COLUMN payments.query_details IS 'Stores the query details when a payment has a query raised'; 