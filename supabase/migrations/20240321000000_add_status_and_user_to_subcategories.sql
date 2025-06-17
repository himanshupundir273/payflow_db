-- Add status and added_by columns to subcategories table
ALTER TABLE subcategories
ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending')),
ADD COLUMN added_by uuid REFERENCES users(id);

-- Update existing records to set added_by to Accounts user
UPDATE subcategories
SET added_by = (
  SELECT id FROM users 
  WHERE name = 'Accounts' 
  LIMIT 1
);

-- Make added_by column NOT NULL after setting values
ALTER TABLE subcategories
ALTER COLUMN added_by SET NOT NULL;

-- Create an index on the status column for better query performance
CREATE INDEX idx_subcategories_status ON subcategories(status);

-- Create an index on the added_by column for better join performance
CREATE INDEX idx_subcategories_added_by ON subcategories(added_by);

-- Add a comment to explain the status column
COMMENT ON COLUMN subcategories.status IS 'Status of the subcategory: approved or pending';
COMMENT ON COLUMN subcategories.added_by IS 'Reference to the user who created this subcategory'; 