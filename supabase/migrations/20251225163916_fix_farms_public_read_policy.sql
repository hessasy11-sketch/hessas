/*
  # Fix Farms Public Read Policy

  ## Changes
  1. Drop existing "Anyone can view active farms" policy (which incorrectly only allows authenticated)
  2. Create new PUBLIC policy that truly allows anyone (including anon) to view active farms
  
  ## Security
  - Only affects SELECT operations
  - Only shows active farms (is_active = true)
  - Maintains all other RLS policies
*/

-- Drop the incorrectly configured policy
DROP POLICY IF EXISTS "Anyone can view active farms" ON farms;

-- Create correct PUBLIC policy for viewing active farms
CREATE POLICY "Anyone can view active farms"
  ON farms FOR SELECT
  TO PUBLIC
  USING (is_active = true);
