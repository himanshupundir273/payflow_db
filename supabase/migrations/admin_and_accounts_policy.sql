-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can view all payments" ON payments;
DROP POLICY IF EXISTS "Users can view all payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Admin and accounts can view all users" ON users;
DROP POLICY IF EXISTS "Admin and accounts can view all payments" ON payments;
DROP POLICY IF EXISTS "Admin and accounts can view all payment history" ON payment_history;
DROP POLICY IF EXISTS "Allow viewing user details for payments" ON users;

-- Create new policies
CREATE POLICY "Users can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all payment history"
  ON payment_history
  FOR SELECT
  TO authenticated
  USING (true);