-- Drop existing funds table if it exists
DROP TABLE IF EXISTS funds CASCADE;

-- Function to generate day_id (YYYY-MM-DD format based on 6PM cutoff)
CREATE OR REPLACE FUNCTION get_current_day_id()
RETURNS TEXT AS $$
DECLARE
    now_time TIMESTAMP WITH TIME ZONE;  -- Changed from current_time to avoid reserved keyword
    day_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current time in IST
    now_time := CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
    
    -- If current time is before 6 PM, use previous day
    -- This ensures that funds are grouped by business day (6PM to 6PM)
    IF EXTRACT(HOUR FROM now_time) < 18 THEN
        day_cutoff := DATE_TRUNC('day', now_time) - INTERVAL '1 day';
    ELSE
        day_cutoff := DATE_TRUNC('day', now_time);
    END IF;
    
    RETURN TO_CHAR(day_cutoff, 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql;

-- Create funds table with daily tracking
CREATE TABLE IF NOT EXISTS funds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    amount DECIMAL(15, 2) NOT NULL,
    added_by UUID REFERENCES users(id) NOT NULL,
    day_id TEXT NOT NULL DEFAULT get_current_day_id(),  -- Tracks which business day (6PM-6PM) the fund belongs to
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on day_id for faster queries on daily fund totals
CREATE INDEX idx_funds_day_id ON funds(day_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_funds_updated_at
    BEFORE UPDATE ON funds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

-- Create policies for funds table
-- Allow accounts users to insert funds
CREATE POLICY "Allow accounts users to insert funds" ON funds
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'accounts'
        )
    );

-- Allow viewing funds for authenticated users
CREATE POLICY "Allow viewing funds for authenticated users" ON funds
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow accounts users to update funds
CREATE POLICY "Allow accounts users to update funds" ON funds
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'accounts'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'accounts'
        )
    );

-- Allow accounts users to delete funds
CREATE POLICY "Allow accounts users to delete funds" ON funds
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'accounts'
        )
    ); 