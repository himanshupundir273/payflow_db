-- Create the trigger function to update balance amount
CREATE OR REPLACE FUNCTION update_balance_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance_amount when payment_amount changes
    NEW.balance_amount := NEW.total_outstanding - NEW.payment_amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_balance_amount_trigger
    BEFORE INSERT OR UPDATE OF payment_amount
    ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_amount();