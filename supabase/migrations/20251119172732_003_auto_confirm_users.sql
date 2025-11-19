/*
  # Auto-confirm Users on Signup
  
  1. Changes
    - Create trigger to automatically confirm user emails on signup
    - Users can login immediately after signup without email verification
  
  2. Security
    - This is for internal team use where email verification is not required
    - All RLS policies remain in place for data security
*/

-- Create function to auto-confirm users
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the email if it's not already confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmation_token = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;

-- Create trigger that runs BEFORE INSERT to auto-confirm users
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- Confirm any existing unconfirmed users
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmation_token = NULL
WHERE email_confirmed_at IS NULL;
