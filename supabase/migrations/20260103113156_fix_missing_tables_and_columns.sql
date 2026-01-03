/*
  # إصلاح الجداول والأعمدة المفقودة

  1. إضافة الجداول المفقودة:
    - investor_action_requests
    - b2f_contracts

  2. إضافة الأعمدة المفقودة:
    - staff_access_devices.is_active
    - staff_access_log.logged_in_at

  3. Security:
    - RLS enabled على الجداول الجديدة
*/

-- إضافة حقل is_active إلى staff_access_devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_access_devices' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE staff_access_devices ADD COLUMN is_active boolean DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_staff_access_devices_active ON staff_access_devices(is_active);
  END IF;
END $$;

-- إضافة حقل logged_in_at إلى staff_access_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_access_log' AND column_name = 'logged_in_at'
  ) THEN
    ALTER TABLE staff_access_log ADD COLUMN logged_in_at timestamptz DEFAULT now();
    CREATE INDEX IF NOT EXISTS idx_staff_access_log_logged_in ON staff_access_log(logged_in_at);
  END IF;
END $$;

-- إنشاء جدول investor_action_requests
CREATE TABLE IF NOT EXISTS investor_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  handled_by uuid REFERENCES platform_staff(id),
  handled_at timestamptz,
  notes text
);

-- فهارس لـ investor_action_requests
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_account ON investor_action_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_status ON investor_action_requests(status);
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_type ON investor_action_requests(request_type);

-- تفعيل RLS
ALTER TABLE investor_action_requests ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Anyone can read action requests"
  ON investor_action_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert action requests"
  ON investor_action_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update action requests"
  ON investor_action_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إنشاء جدول b2f_contracts
CREATE TABLE IF NOT EXISTS b2f_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES b2f_opportunities(id),
  farm_id uuid REFERENCES b2f_farms(id),
  
  -- معلومات العقد
  contract_type text NOT NULL DEFAULT 'tree_lease',
  status text NOT NULL DEFAULT 'active',
  
  -- المدة والتواريخ
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_years integer NOT NULL,
  
  -- المبالغ المالية
  total_amount decimal(12,2) NOT NULL,
  paid_amount decimal(12,2) DEFAULT 0,
  remaining_amount decimal(12,2),
  
  -- تفاصيل الاستثمار
  tree_count integer,
  tree_type text,
  location_details jsonb,
  
  -- حالة العمليات
  operation_status text DEFAULT 'pending',
  
  -- البيانات الوصفية
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  issued_by uuid REFERENCES platform_staff(id),
  pdf_url text,
  
  -- ملاحظات
  notes text,
  metadata jsonb
);

-- فهارس لـ b2f_contracts
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_account ON b2f_contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_status ON b2f_contracts(status);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_number ON b2f_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_opportunity ON b2f_contracts(opportunity_id);

-- تفعيل RLS
ALTER TABLE b2f_contracts ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Anyone can read contracts"
  ON b2f_contracts
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert contracts"
  ON b2f_contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update contracts"
  ON b2f_contracts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS b2f_contracts_updated_at ON b2f_contracts;
CREATE TRIGGER b2f_contracts_updated_at
  BEFORE UPDATE ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_contracts_updated_at();

-- منح الصلاحيات
GRANT SELECT, INSERT, UPDATE ON investor_action_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON b2f_contracts TO authenticated;

-- تعليقات
COMMENT ON TABLE investor_action_requests IS 'طلبات إجراءات المستثمرين';
COMMENT ON TABLE b2f_contracts IS 'عقود الاستثمار في الأشجار والمزارع';
