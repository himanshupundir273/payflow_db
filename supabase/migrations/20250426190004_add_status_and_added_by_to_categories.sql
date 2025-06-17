-- Add status and added_by columns to categories table

ALTER TABLE categories
ADD COLUMN status text NOT NULL DEFAULT 'pending',
ADD COLUMN added_by uuid REFERENCES auth.users(id);

UPDATE categories
SET added_by = (
  SELECT id FROM users 
  WHERE name = 'Accounts' 
  LIMIT 1
);

-- Set default value for existing records
UPDATE categories
SET status = 'approved';

-- Add check constraint to ensure only valid status values
ALTER TABLE categories
ADD CONSTRAINT categories_status_check 
CHECK (status IN ('approved', 'pending'));

-- Make the column NOT NULL after setting default values
ALTER TABLE categories
ALTER COLUMN status SET NOT NULL;

-- Set default value for new records
ALTER TABLE categories
ALTER COLUMN status SET DEFAULT 'pending';

-- Add comment to document the purpose of the column
COMMENT ON COLUMN categories.status IS 'Status of the categories record (approved/pending)';