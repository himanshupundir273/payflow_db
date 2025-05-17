/*
  # Fix admin and accounts visibility

  1. Changes
    - Drop existing policies that might conflict
    - Add new policies to allow admin and accounts to see all data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and accounts can view all users" ON users;
DROP POLICY IF EXISTS "Admin and accounts can view all payments" ON payments;
DROP POLICY IF EXISTS "Admin and accounts can view all payment history" ON payment_history;

-- Add policy for users table
CREATE POLICY "Admin and accounts can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'accounts')
    )
  );

-- Add policy for payments table
CREATE POLICY "Admin and accounts can view all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'accounts')
    )
  );

-- Add policy for payment_history table
CREATE POLICY "Admin and accounts can view all payment history"
  ON payment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'accounts')
    )
  );

-- Add policy to allow viewing user details for payments
CREATE POLICY "Allow viewing user details for payments"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'accounts')
    )
  ); 