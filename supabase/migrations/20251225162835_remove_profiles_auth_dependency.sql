/*
  # Remove Profiles Auth Dependency

  ## Changes Made
  1. Drop foreign key constraint `profiles_id_fkey` from profiles table
  2. Make profiles table independent from auth.users
  3. Allow PIN-based authentication without requiring Supabase Auth users
  
  ## Impact
  - Profiles can now be created directly without auth.users entries
  - PIN-based authentication system will work independently
  - Existing profiles remain unchanged
  
  ## Security
  - RLS policies remain in place for data protection
  - Phone number remains unique
*/

-- Drop the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verify the constraint was dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_id_fkey' 
    AND conrelid = 'profiles'::regclass
  ) THEN
    RAISE EXCEPTION 'Failed to drop profiles_id_fkey constraint';
  END IF;
END $$;
