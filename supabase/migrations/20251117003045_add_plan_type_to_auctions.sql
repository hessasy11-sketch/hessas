/*
  # Add Plan Type to Auctions

  1. Changes
    - Add `seller_plan_type` column to auctions table
    - Add `is_featured` column for gold plan highlighting
    - Add `priority_score` for sorting by plan type
    
  2. Purpose
    - Track which plan the seller had when creating the auction
    - Enable plan-based features and display
    - Allow priority sorting for gold/silver plans
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'seller_plan_type'
  ) THEN
    ALTER TABLE auctions ADD COLUMN seller_plan_type text DEFAULT 'free';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE auctions ADD COLUMN is_featured boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'priority_score'
  ) THEN
    ALTER TABLE auctions ADD COLUMN priority_score integer DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN auctions.seller_plan_type IS 'The subscription plan of the seller when auction was created: free, silver, gold';
COMMENT ON COLUMN auctions.is_featured IS 'Whether this auction is featured (gold plan)';
COMMENT ON COLUMN auctions.priority_score IS 'Priority score for sorting: gold=100, silver=50, free=0';
