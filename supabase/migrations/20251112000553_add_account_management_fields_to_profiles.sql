/*
  # Add Account Management Fields to Profiles

  1. New Columns
    - `account_type`: Type of account (individual, farm, company)
    - `logo_url`: Profile logo/avatar URL
    - `hide_phone`: Hide phone number in public auctions
    - `verified_phone`: Phone verification badge
    - `verified_identity`: Identity verification badge
    - `notification_new_bids`: Enable notifications for new bids
    - `notification_new_offers`: Enable notifications for new offers
    - `notification_auction_ending`: Enable notifications for auction ending
    - `last_active_at`: Last activity timestamp
    
  2. Purpose
    - Enable full account management features
    - Support profile customization
    - Privacy controls
    - Notification preferences
    - Verification badges
*/

-- Add account management fields
DO $$
BEGIN
  -- Account type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN account_type text DEFAULT 'individual'
    CHECK (account_type IN ('individual', 'farm', 'company'));
  END IF;

  -- Logo/Avatar URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN logo_url text;
  END IF;

  -- Privacy: Hide phone number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hide_phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN hide_phone boolean DEFAULT false;
  END IF;

  -- Verification badges
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verified_phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verified_phone boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verified_identity'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verified_identity boolean DEFAULT false;
  END IF;

  -- Notification preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_new_bids'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_new_bids boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_new_offers'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_new_offers boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_auction_ending'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_auction_ending boolean DEFAULT true;
  END IF;

  -- Last activity tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing profiles to mark phone as verified if they have one
UPDATE profiles
SET verified_phone = true
WHERE phone_number IS NOT NULL AND phone_number != '';

-- Create index for last_active_at for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles(last_active_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN profiles.account_type IS 'Type of account: individual (فرد), farm (مزرعة), company (شركة)';
COMMENT ON COLUMN profiles.logo_url IS 'URL to user profile logo/avatar stored in Supabase Storage';
COMMENT ON COLUMN profiles.hide_phone IS 'Privacy setting to hide phone number in public auctions';
COMMENT ON COLUMN profiles.verified_phone IS 'Badge: Phone number verified via OTP';
COMMENT ON COLUMN profiles.verified_identity IS 'Badge: Identity verified (requires admin approval)';
COMMENT ON COLUMN profiles.notification_new_bids IS 'Receive notifications for new bids on user auctions';
COMMENT ON COLUMN profiles.notification_new_offers IS 'Receive notifications for new offers/auctions';
COMMENT ON COLUMN profiles.notification_auction_ending IS 'Receive notifications when auctions are ending soon';