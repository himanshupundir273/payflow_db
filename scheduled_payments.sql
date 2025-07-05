create table public.scheduled_payments (
  id uuid not null default gen_random_uuid() primary key,
  scheduled_for timestamp with time zone not null,
  schedule_status text not null default 'pending',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  promoted_date timestamp with time zone null,
  payment_id uuid null references payments(id),
  vendor_name text not null,
  vendor_id uuid not null references vendors(id),
  company_name text not null,
  company_branch text null,
  category_id uuid not null references categories(id),
  subcategory_id uuid not null references subcategories(id),
  bank_name text null,
  payment_mode text null,
  advance_details text null,
  total_outstanding numeric not null,
  payment_amount numeric not null,
  balance_amount numeric not null,
  quantity_checked_by uuid null references users(id),
  quality_checked_by uuid null references users(id),
  purchase_owner uuid null references users(id),
  price_check_guaranteed_by uuid null references users(id),
  item_description text not null,
  lpr text null,
  ioa text null,
  cpp text null,
  requested_by uuid not null references users(id),
  constraint scheduled_payments_schedule_status_check check (
    schedule_status = any (
      array[
        'pending'::text,
        'processed'::text,
        'cancelled'::text
      ]
    )
  ),
  constraint scheduled_payments_payment_amount_check check ((payment_amount >= (0)::numeric)),
  constraint scheduled_payments_total_outstanding_check check ((total_outstanding >= (0)::numeric))
);

-- Trigger to update updated_at on row update
create or replace function update_scheduled_payments_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_scheduled_payments_updated_at
before update on public.scheduled_payments
for each row
execute function update_scheduled_payments_updated_at_column();

-- RLS and policies for scheduled_payments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_payments TO authenticated;
ALTER TABLE public.scheduled_payments ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own scheduled payments
CREATE POLICY "Users can view their own scheduled payments"
  ON public.scheduled_payments
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'accounts')
    )
  );

-- Allow users to update their own scheduled payments
CREATE POLICY "Users can update their own scheduled payments"
  ON public.scheduled_payments
  FOR UPDATE
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'accounts')
    )
  )
  WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'accounts')
    )
  );

-- Allow users to delete their own scheduled payments
CREATE POLICY "Users can delete their own scheduled payments"
  ON public.scheduled_payments
  FOR DELETE
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'accounts')
    )
  );

-- Allow all authenticated users to insert, but enforce requested_by = auth.uid() unless admin/accounts
CREATE POLICY "Users can insert their own scheduled payments"
  ON public.scheduled_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'accounts')
    )
  );


ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.subcategories TO authenticated;
CREATE POLICY "Authenticated users can read, insert, and update subcategories"
ON public.subcategories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.categories TO authenticated;
CREATE POLICY "Authenticated users can read, insert, and update categories"
ON public.categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
