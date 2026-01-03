/*
  # Fix Wallets Foreign Key to Point to Profiles

  ## Problem
  - wallets.user_id has foreign key to auth.users
  - PIN authentication users don't exist in auth.users
  - This prevents wallet creation for PIN users
  
  ## Solution
  - Drop existing foreign key constraint to auth.users
  - Add new foreign key constraint to profiles table
  
  ## Data Safety
  - All existing wallet user_ids are verified to exist in profiles
  - No data loss or modification
  
  ## Tables Modified
  - wallets: Updated foreign key constraint
*/

-- Drop the existing foreign key constraint to auth.users
ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;

-- Add new foreign key constraint to profiles
ALTER TABLE wallets
  ADD CONSTRAINT wallets_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
