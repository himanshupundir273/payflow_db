-- Add postpone_date column to payments table
ALTER TABLE payments 
ADD COLUMN postpone_date TIMESTAMP WITH TIME ZONE NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_postpone_date ON payments(postpone_date);

-- Add comment to document the purpose
COMMENT ON COLUMN payments.postpone_date IS 'Date when postponed payment should be reactivated to pending status';
