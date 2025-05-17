/*
  # Add payment history tracking

  1. New Tables
    - `payment_history`
      - `id` (uuid, primary key)
      - `payment_id` (uuid, references payments)
      - `status` (text)
      - `changed_by` (uuid, references users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `payment_history` table
    - Add policies for authenticated users
*/

-- Create payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  changed_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_history
CREATE POLICY "Users can view payment history for their payments"
  ON payment_history
  FOR SELECT
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM payments WHERE requested_by = auth.uid()
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'accounts')
  );

CREATE POLICY "System can insert payment history"
  ON payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger function to track payment status changes
CREATE OR REPLACE FUNCTION track_payment_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO payment_history (payment_id, status, changed_by)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.approved_by, NEW.requested_by));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER track_payment_status
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION track_payment_status_changes();