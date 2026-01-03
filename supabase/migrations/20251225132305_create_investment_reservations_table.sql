/*
  # إنشاء جدول حجوزات الفرص الاستثمارية

  1. New Tables
    - `investment_reservations`
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, foreign key to investment_opportunities)
      - `user_id` (uuid, foreign key to profiles)
      - `customer_name` (text)
      - `customer_phone` (text)
      - `number_of_trees` (integer)
      - `total_amount` (numeric)
      - `status` (text)
      - `agreed_to_terms` (boolean)
      - `notes` (text)
      - `receipt_url` (text)
      - `contract_url` (text)
      - `payment_verified` (boolean)
      - `admin_notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `investment_reservations` table
    - Add policies for users to manage their own reservations

  3. Indexes
    - Index on opportunity_id for faster lookups
    - Index on user_id for faster user queries
    - Index on status for filtering
*/

-- Create investment_reservations table
CREATE TABLE IF NOT EXISTS investment_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  number_of_trees integer NOT NULL DEFAULT 1,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_review',
  agreed_to_terms boolean NOT NULL DEFAULT false,
  notes text,
  receipt_url text,
  receipt_uploaded_at timestamptz,
  contract_url text,
  contract_issued_at timestamptz,
  payment_verified boolean DEFAULT false,
  payment_verified_by uuid REFERENCES profiles(id),
  payment_verified_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE investment_reservations ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view own investment reservations"
  ON investment_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own investment reservations"
  ON investment_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment reservations"
  ON investment_reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investment_reservations_opportunity 
  ON investment_reservations(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_investment_reservations_user 
  ON investment_reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_investment_reservations_status 
  ON investment_reservations(status);

CREATE INDEX IF NOT EXISTS idx_investment_reservations_created 
  ON investment_reservations(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_investment_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_investment_reservations_updated_at ON investment_reservations;

CREATE TRIGGER trigger_update_investment_reservations_updated_at
  BEFORE UPDATE ON investment_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_reservations_updated_at();

-- Add check constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_number_of_trees_positive'
  ) THEN
    ALTER TABLE investment_reservations 
      ADD CONSTRAINT check_number_of_trees_positive 
      CHECK (number_of_trees > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_total_amount_positive'
  ) THEN
    ALTER TABLE investment_reservations 
      ADD CONSTRAINT check_total_amount_positive 
      CHECK (total_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_status_valid'
  ) THEN
    ALTER TABLE investment_reservations 
      ADD CONSTRAINT check_status_valid 
      CHECK (status IN (
        'pending_review',
        'awaiting_payment',
        'payment_submitted',
        'payment_verified',
        'contract_issued',
        'active',
        'completed',
        'cancelled',
        'rejected'
      ));
  END IF;
END $$;
