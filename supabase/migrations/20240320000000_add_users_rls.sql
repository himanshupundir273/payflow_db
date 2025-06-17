-- Grant necessary permissions to authenticated users
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

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Only admin and accounts can modify users" ON public.users;

-- Policy to allow only admin and accounts users to modify users
CREATE POLICY "Only admin and accounts can modify users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'accounts')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'accounts')
  )
); 