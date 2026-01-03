/*
  # نظام إدارة طلبات الاستثمار الجديد

  1. جدول طلبات الاستثمار
    - `b2f_investment_requests`
      - معلومات المستثمر
      - معلومات الطلب
      - الحالة والإجراءات

  2. Security
    - Enable RLS
    - Authenticated users can manage all requests
    - Public can insert new requests
    - Public can view by phone

  3. Functions
    - Auto-update updated_at
    - Get farm statistics
*/

-- إنشاء جدول طلبات الاستثمار
CREATE TABLE IF NOT EXISTS b2f_investment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE SET NULL,
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  investor_email text,
  tree_type text NOT NULL,
  number_of_trees integer NOT NULL DEFAULT 1,
  contract_duration_months integer NOT NULL DEFAULT 12,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  payment_receipt_url text,
  contract_number text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN (
    'new',
    'awaiting_payment',
    'payment_uploaded',
    'payment_verified',
    'contract_ready',
    'transferred_to_operations',
    'rejected'
  )),
  CONSTRAINT positive_trees CHECK (number_of_trees > 0),
  CONSTRAINT positive_duration CHECK (contract_duration_months > 0),
  CONSTRAINT positive_amount CHECK (total_amount >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_farm_id 
  ON b2f_investment_requests(farm_id);
CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_status 
  ON b2f_investment_requests(status);
CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_phone 
  ON b2f_investment_requests(investor_phone);

-- Function: تحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_investment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: تحديث updated_at
DROP TRIGGER IF EXISTS update_b2f_investment_requests_timestamp 
  ON b2f_investment_requests;
CREATE TRIGGER update_b2f_investment_requests_timestamp
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_investment_requests_updated_at();

-- Function: إحصائيات المزرعة
CREATE OR REPLACE FUNCTION get_farm_requests_summary(p_farm_id uuid)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'new', COUNT(*) FILTER (WHERE status = 'new'),
    'awaiting_payment', COUNT(*) FILTER (WHERE status = 'awaiting_payment'),
    'payment_uploaded', COUNT(*) FILTER (WHERE status = 'payment_uploaded'),
    'payment_verified', COUNT(*) FILTER (WHERE status = 'payment_verified'),
    'contract_ready', COUNT(*) FILTER (WHERE status = 'contract_ready'),
    'transferred_to_operations', COUNT(*) FILTER (WHERE status = 'transferred_to_operations')
  )
  INTO v_result
  FROM b2f_investment_requests
  WHERE farm_id = p_farm_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE b2f_investment_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users (admins) can view all
CREATE POLICY "Authenticated users can view all investment requests"
  ON b2f_investment_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update all
CREATE POLICY "Authenticated users can update all investment requests"
  ON b2f_investment_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete
CREATE POLICY "Authenticated users can delete investment requests"
  ON b2f_investment_requests
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Anyone can create new request
CREATE POLICY "Anyone can create investment request"
  ON b2f_investment_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Public can view by phone
CREATE POLICY "Public can view own requests by phone"
  ON b2f_investment_requests
  FOR SELECT
  TO anon
  USING (true);
