
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to view all users
CREATE POLICY "Anyone can view users"
ON public.users
FOR SELECT
TO public
USING (true);

-- Policy to allow only admin and accounts users to modify users
CREATE POLICY "Only admin and accounts can modify users"
ON public.users
FOR ALL
TO authenticated
USING (
  CASE 
    -- Allow if the user is modifying their own row (for initial creation)
    WHEN auth.uid() = id THEN true
    -- Otherwise check for admin/accounts role
    ELSE (auth.jwt() ->> 'role')::text IN ('admin', 'accounts')
  END
)
WITH CHECK (
  CASE 
    -- Allow if the user is modifying their own row (for initial creation)
    WHEN auth.uid() = id THEN true
    -- Otherwise check for admin/accounts role
    ELSE (auth.jwt() ->> 'role')::text IN ('admin', 'accounts')
  END
);  



ALTER TABLE payments
ADD COLUMN quantity_checked_by UUID REFERENCES users(id),
ADD COLUMN quality_checked_by UUID REFERENCES users(id),
ADD COLUMN purchase_owner UUID REFERENCES users(id),
ADD COLUMN price_check_guaranteed_by UUID REFERENCES users(id);

-- Add indexes for better query performance
CREATE INDEX idx_payments_quantity_checked_by ON payments(quantity_checked_by);
CREATE INDEX idx_payments_quality_checked_by ON payments(quality_checked_by);
CREATE INDEX idx_payments_purchase_owner ON payments(purchase_owner);
CREATE INDEX idx_payments_price_check_guaranteed_by ON payments(price_check_guaranteed_by);

-- Add comments to document the purpose of each column
COMMENT ON COLUMN payments.quantity_checked_by IS 'User who verified the quantity of items';
COMMENT ON COLUMN payments.quality_checked_by IS 'User who verified the quality of items';
COMMENT ON COLUMN payments.purchase_owner IS 'User who owns the purchase process';
COMMENT ON COLUMN payments.price_check_guaranteed_by IS 'User who guaranteed the price check (required)';




-- Add category and subcategory columns to payments table
ALTER TABLE payments
ADD COLUMN category VARCHAR(255),
ADD COLUMN subcategory VARCHAR(255);



ALTER TABLE payments 
ADD COLUMN accounts_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
CHECK (accounts_verification_status IN ('pending', 'verified'));


-- 1. Add missing columns
ALTER TABLE public.payments
ADD COLUMN quantity_checked_by uuid null,
ADD COLUMN quality_checked_by uuid null,
ADD COLUMN purchase_owner uuid null,
ADD COLUMN price_check_guaranteed_by uuid null,
ADD COLUMN vendor_id uuid null,
ADD COLUMN category_id uuid null,
ADD COLUMN subcategory_id uuid null,
ADD COLUMN accounts_verification_status character varying(20) not null default 'pending',
ADD COLUMN amount_change_reason text null;

-- 2. Add missing foreign key constraints
ALTER TABLE public.payments
ADD CONSTRAINT payments_quality_checked_by_fkey FOREIGN KEY (quality_checked_by) REFERENCES users (id),
ADD CONSTRAINT payments_quantity_checked_by_fkey FOREIGN KEY (quantity_checked_by) REFERENCES users (id),
ADD CONSTRAINT payments_purchase_owner_fkey FOREIGN KEY (purchase_owner) REFERENCES users (id),
ADD CONSTRAINT payments_price_check_guaranteed_by_fkey FOREIGN KEY (price_check_guaranteed_by) REFERENCES users (id),
ADD CONSTRAINT payments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors (id),
ADD CONSTRAINT payments_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories (id),
ADD CONSTRAINT payments_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES subcategories (id);

-- 3. Add missing check constraint for accounts_verification_status
ALTER TABLE public.payments
ADD CONSTRAINT payments_accounts_verification_status_check CHECK (
  (accounts_verification_status)::text = ANY (
    ARRAY['pending'::text, 'verified'::text]
  )
);

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_quantity_checked_by ON public.payments (quantity_checked_by);
CREATE INDEX IF NOT EXISTS idx_payments_quality_checked_by ON public.payments (quality_checked_by);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_owner ON public.payments (purchase_owner);
CREATE INDEX IF NOT EXISTS idx_payments_price_check_guaranteed_by ON public.payments (price_check_guaranteed_by);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON public.payments (vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_category_id ON public.payments (category_id);
CREATE INDEX IF NOT EXISTS idx_payments_subcategory_id ON public.payments (subcategory_id);
