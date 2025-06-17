-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view companies
CREATE POLICY "Allow authenticated users to view companies"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow admins and accounts to manage companies
CREATE POLICY "Allow admins and accounts to manage companies"
    ON companies FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'accounts')
        )
    );

-- Insert initial company data
INSERT INTO companies (name, code) VALUES
    ('Atlanta', 'ATC'),
    ('Atlanta (L)', 'ATCL'),
    ('Bestco', 'BTC'),
    ('Copperlite', 'CLITE'),
    ('NotoFire', 'NOTO'),
    ('Valuecon', 'VCON'),
    ('Satguru', 'SGC'),
    ('New', 'NCCE'),
    ('New', 'GJ-SB')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP; 