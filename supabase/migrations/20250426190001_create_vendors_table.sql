/*
  # Create vendors table

  1. New Table
    - vendors
      - id (uuid, primary key)
      - name (text, unique)
      - account_number (text)
      - ifsc_code (text)
      - added_by (uuid, references users(id))
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on vendors table
    - Add policies for authenticated users
*/

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  account_number text NOT NULL,
  ifsc_code text NOT NULL,
  added_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create policies for vendors table
CREATE POLICY "Users can view all vendors"
  ON vendors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vendors"
  ON vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' or role = 'accounts'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' or role = 'accounts'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
