-- Allow admin users to add, update, and delete funds (same as accounts)

DROP POLICY IF EXISTS "Allow accounts users to insert funds" ON funds;
DROP POLICY IF EXISTS "Allow accounts users to update funds" ON funds;
DROP POLICY IF EXISTS "Allow accounts users to delete funds" ON funds;

CREATE POLICY "Allow admin and accounts users to insert funds" ON funds
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'accounts')
        )
    );

CREATE POLICY "Allow admin and accounts users to update funds" ON funds
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'accounts')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'accounts')
        )
    );

CREATE POLICY "Allow admin and accounts users to delete funds" ON funds
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'accounts')
        )
    );
