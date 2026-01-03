/*
  # Add Registration Status to Profiles

  1. Changes
    - Add `registration_status` column to profiles table
      - Values: 'partial' (جزئي) or 'complete' (مكتمل)
      - Default: 'partial'
    - Add function to automatically update status based on profile completeness
    
  2. Purpose
    - Track user registration completion
    - Enable smart reminders for incomplete profiles
    - Support unified registration flow from sidebar
*/

-- Add registration_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'registration_status'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN registration_status text DEFAULT 'partial' 
    CHECK (registration_status IN ('partial', 'complete'));
  END IF;
END $$;

-- Update existing profiles based on their data completeness
UPDATE profiles
SET registration_status = CASE
  WHEN display_name IS NOT NULL 
    AND phone_number IS NOT NULL 
    AND city IS NOT NULL 
    AND bio IS NOT NULL
  THEN 'complete'
  ELSE 'partial'
END
WHERE registration_status IS NULL OR registration_status = 'partial';

-- Create function to auto-update registration status
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all required fields are filled
  IF NEW.display_name IS NOT NULL 
    AND NEW.phone_number IS NOT NULL 
    AND NEW.city IS NOT NULL 
    AND NEW.bio IS NOT NULL 
  THEN
    NEW.registration_status := 'complete';
  ELSE
    NEW.registration_status := 'partial';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update registration status
DROP TRIGGER IF EXISTS trigger_update_registration_status ON profiles;
CREATE TRIGGER trigger_update_registration_status
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_status();