/*
  # Update payments table with vendor and category foreign keys

  1. Add vendor_id column referencing vendors table
  2. Change category and subcategory to be UUID foreign keys
  3. Add appropriate foreign key constraints
*/

-- First, drop the existing category and subcategory columns
ALTER TABLE payments
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS subcategory;

-- Add vendor_id column
ALTER TABLE payments
ADD COLUMN vendor_id uuid REFERENCES vendors(id);

-- Add new category_id and subcategory_id columns
ALTER TABLE payments
ADD COLUMN category_id uuid REFERENCES categories(id),
ADD COLUMN subcategory_id uuid REFERENCES subcategories(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_category_id ON payments(category_id);
CREATE INDEX IF NOT EXISTS idx_payments_subcategory_id ON payments(subcategory_id);

-- Add comments to document the purpose of the columns
COMMENT ON COLUMN payments.vendor_id IS 'Reference to the vendor record';
COMMENT ON COLUMN payments.category_id IS 'Reference to the category record';
COMMENT ON COLUMN payments.subcategory_id IS 'Reference to the subcategory record'; 