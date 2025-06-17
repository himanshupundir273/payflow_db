-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branches_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_branches_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view branches
CREATE POLICY "Allow authenticated users to view branches"
    ON branches FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow admins and accounts to manage branches
CREATE POLICY "Allow admins and accounts to manage branches"
    ON branches FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'accounts')
        )
    );

-- Insert initial branch data
INSERT INTO branches (code, name) VALUES
    ('DL', 'Delhi'),
    ('MP', 'Madhya Pradesh'),
    ('UK', 'Uttarakhand'),
    ('UP', 'Uttar Pradesh')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP; 