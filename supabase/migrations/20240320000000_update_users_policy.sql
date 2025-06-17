-- Drop existing policy
drop policy if exists "Only admin and accounts can modify users" on "public"."users";
drop policy if exists "Only admin and accounts can insert users" on "public"."users";
drop policy if exists "Only admin and accounts can update users" on "public"."users";

-- Create policy for insert operations
create policy "Allow user creation and admin/accounts inserts"
on "public"."users"
for insert
to authenticated
with check (
  -- Allow if the user is creating their own record (for initial signup)
  auth.uid() = id
  OR
  -- Or if the user is admin/accounts
  exists (
    select 1 from users u
    where u.id = auth.uid()
    and u.role in ('admin', 'accounts')
  )
);

-- Create policy for update operations
create policy "Only admin and accounts can update users"
on "public"."users"
for update
to authenticated
using (
  exists (
    select 1 from users u
    where u.id = auth.uid()
    and u.role in ('admin', 'accounts')
  )
)
with check (
  exists (
    select 1 from users u
    where u.id = auth.uid()
    and u.role in ('admin', 'accounts')
  )
); 