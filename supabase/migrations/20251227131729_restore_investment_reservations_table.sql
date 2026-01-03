/*
  # إعادة جدول الحجوزات المؤقتة للاستثمار

  1. الجدول الجديد:
    - `investment_reservations` - الحجوزات المؤقتة
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, foreign key)
      - `investor_account_id` (uuid, foreign key)
      - `investor_name` (text)
      - `investor_phone` (text)
      - `number_of_trees` (integer)
      - `status` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. الأمان:
    - تمكين RLS
    - السماح للجميع بالقراءة والإنشاء
*/

-- Create investment_reservations table
CREATE TABLE IF NOT EXISTS investment_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE CASCADE,
  investor_account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  number_of_trees integer NOT NULL CHECK (number_of_trees > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes')
);

-- Enable RLS
ALTER TABLE investment_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow anon to insert reservations"
  ON investment_reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to read reservations by phone"
  ON investment_reservations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to read all reservations"
  ON investment_reservations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update reservations"
  ON investment_reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investment_reservations_opportunity ON investment_reservations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_investment_reservations_investor_account ON investment_reservations(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_investment_reservations_phone ON investment_reservations(investor_phone);
CREATE INDEX IF NOT EXISTS idx_investment_reservations_status ON investment_reservations(status);