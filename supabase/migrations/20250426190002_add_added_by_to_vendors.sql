/*
  # Add added_by column to vendors table

  1. Add new column
    - added_by (uuid, references users(id))
*/

-- Add added_by column to vendors table
ALTER TABLE vendors
ADD COLUMN added_by uuid REFERENCES users(id);

-- Update existing records to set added_by to a default admin user
-- You may want to modify this to set it to a specific admin user's ID
UPDATE vendors
SET added_by = (
  SELECT id FROM users 
  WHERE name = 'Accounts' 
  LIMIT 1
);

-- Make the column NOT NULL after setting default values
ALTER TABLE vendors
ALTER COLUMN added_by SET NOT NULL;

-- Add comment to document the purpose of the column
COMMENT ON COLUMN vendors.added_by IS 'User who added the vendor record'; 


ALTER TABLE vendors
ADD COLUMN status text;

-- Set default value for existing records
UPDATE vendors
SET status = 'approved';

-- Add check constraint to ensure only valid status values
ALTER TABLE vendors
ADD CONSTRAINT vendors_status_check 
CHECK (status IN ('approved', 'pending'));

-- Make the column NOT NULL after setting default values
ALTER TABLE vendors
ALTER COLUMN status SET NOT NULL;

-- Set default value for new records
ALTER TABLE vendors
ALTER COLUMN status SET DEFAULT 'pending';

-- Add comment to document the purpose of the column
COMMENT ON COLUMN vendors.status IS 'Status of the vendor record (approved/pending)'; 