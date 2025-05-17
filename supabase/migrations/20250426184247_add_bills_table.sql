-- Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    bill_number TEXT NOT NULL,
    bill_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_payment_id ON public.bills(payment_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON public.bills(bill_number);

-- Remove bill_number and bill_date columns from payments table
ALTER TABLE public.payments DROP COLUMN IF EXISTS bill_number;
ALTER TABLE public.payments DROP COLUMN IF EXISTS bill_date;

-- Add RLS policies for bills table
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Policy for users to view bills
CREATE POLICY "Users can view bills for their payments"
    ON public.bills
    FOR SELECT
    USING (
        payment_id IN (
            SELECT id FROM public.payments 
            WHERE requested_by = auth.uid()
        )
    );

-- Policy for admins and accounts to view all bills
CREATE POLICY "Admins and accounts can view all bills"
    ON public.bills
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'accounts')
        )
    );

-- Policy for users to insert bills
CREATE POLICY "Users can insert bills for their payments"
    ON public.bills
    FOR INSERT
    WITH CHECK (
        payment_id IN (
            SELECT id FROM public.payments 
            WHERE requested_by = auth.uid()
        )
    );

-- Policy for admins and accounts to insert bills
CREATE POLICY "Admins and accounts can insert bills"
    ON public.bills
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'accounts')
        )
    );

-- Policy for users to update bills
CREATE POLICY "Users can update bills for their payments"
    ON public.bills
    FOR UPDATE
    USING (
        payment_id IN (
            SELECT id FROM public.payments 
            WHERE requested_by = auth.uid()
        )
    );

-- Policy for admins and accounts to update bills
CREATE POLICY "Admins and accounts can update bills"
    ON public.bills
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'accounts')
        )
    );

-- Policy for users to delete bills
CREATE POLICY "Users can delete bills for their payments"
    ON public.bills
    FOR DELETE
    USING (
        payment_id IN (
            SELECT id FROM public.payments 
            WHERE requested_by = auth.uid()
        )
    );

-- Policy for admins and accounts to delete bills
CREATE POLICY "Admins and accounts can delete bills"
    ON public.bills
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'accounts')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 