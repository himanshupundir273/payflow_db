/*
  # Initial Schema Setup for Payment Approval System

  1. New Tables
    - users
      - id (uuid, primary key)
      - email (text, unique)
      - name (text)
      - role (text)
      - company (text)
      - created_at (timestamp)
      
    - payments
      - id (uuid, primary key)
      - serial_number (bigint)
      - date (timestamp)
      - vendor_name (text)
      - total_outstanding (numeric)
      - payment_amount (numeric)
      - balance_amount (numeric)
      - item_description (text)
      - bill_number (text)
      - bill_date (timestamp)
      - requested_by (uuid, references users)
      - approved_by (uuid, references users)
      - company_name (text)
      - status (text)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access based on roles
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'admin', 'accounts')),
  company text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number bigint GENERATED ALWAYS AS IDENTITY,
  date timestamptz NOT NULL,
  vendor_name text NOT NULL,
  total_outstanding numeric NOT NULL CHECK (total_outstanding >= 0),
  payment_amount numeric NOT NULL CHECK (payment_amount >= 0),
  balance_amount numeric NOT NULL,
  item_description text NOT NULL,
  bill_number text NOT NULL,
  bill_date timestamptz NOT NULL,
  requested_by uuid REFERENCES users(id) NOT NULL,
  approved_by uuid REFERENCES users(id),
  company_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policies for payments table
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'accounts')
  );

CREATE POLICY "Users can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'user'
  );

CREATE POLICY "Admins can approve/reject payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
  );

CREATE POLICY "Accounts can process approved payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'accounts' AND
    status = 'approved'
  )
  WITH CHECK (
    status = 'processed'
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();