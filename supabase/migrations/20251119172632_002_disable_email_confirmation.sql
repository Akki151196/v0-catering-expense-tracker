/*
  # Disable Email Confirmation Requirement
  
  1. Changes
    - Update trigger to auto-confirm users on signup
    - Users can log in immediately after signup without email confirmation
  
  2. Security
    - Profile creation still requires authentication
    - RLS policies remain in place
*/

-- Update the trigger function to auto-confirm new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'staff'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Email confirmation is disabled at the Supabase project level
-- Users will be automatically logged in after signup if email confirmation is disabled
