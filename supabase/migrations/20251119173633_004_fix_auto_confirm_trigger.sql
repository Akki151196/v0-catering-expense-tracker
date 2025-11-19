/*
  # Fix Auto-Confirm Trigger
  
  1. Changes
    - Remove BEFORE INSERT trigger that was causing conflicts
    - Use AFTER INSERT trigger to confirm users immediately after creation
    - This prevents interference with Supabase's internal auth flow
  
  2. Security
    - Users are confirmed immediately after signup
    - No email verification required for internal team use
*/

-- Drop the problematic BEFORE INSERT trigger
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user();

-- Create new AFTER INSERT function to confirm users
CREATE OR REPLACE FUNCTION public.confirm_user_after_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user to confirm email immediately after creation
  UPDATE auth.users
  SET 
    email_confirmed_at = NOW(),
    confirmation_token = NULL
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create AFTER INSERT trigger
DROP TRIGGER IF EXISTS confirm_user_after_signup_trigger ON auth.users;
CREATE TRIGGER confirm_user_after_signup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.confirm_user_after_signup();
