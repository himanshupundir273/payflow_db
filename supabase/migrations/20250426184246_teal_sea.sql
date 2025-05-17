/*
  # Disable email confirmation requirement

  1. Changes
    - Disable email confirmation requirement for all users
    - Allow users to sign in without confirming their email

  2. Security Note
    - This is for demo purposes only
    - In production, email confirmation should typically be enabled
*/

-- Update auth settings to disable email confirmation
DO $$
BEGIN
  -- Update auth.users to mark all emails as confirmed
  UPDATE auth.users 
  SET email_confirmed_at = CURRENT_TIMESTAMP 
  WHERE email_confirmed_at IS NULL;

  -- Update auth settings in auth.config table if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'config'
  ) THEN
    UPDATE auth.config 
    SET confirm_email = false;
  END IF;

  -- If auth.config doesn't exist, we'll rely on the Supabase Dashboard
  -- settings for email confirmation configuration
END $$;