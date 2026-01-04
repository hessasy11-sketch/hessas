/*
  # إصلاح Views والجداول المفقودة

  ## المشكلة
  - العرض `v_b2f_investment_invoices` غير موجود
  - الجدول `b2f_payment_gateways_config` غير موجود

  ## الحل
  1. إنشاء العرض `v_b2f_investment_invoices`
  2. إنشاء الجدول `b2f_payment_gateways_config`
  3. منح الصلاحيات المناسبة
*/

-- ========================================
-- 1. إنشاء View لفواتير الاستثمار
-- ========================================

CREATE OR REPLACE VIEW v_b2f_investment_invoices AS
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  i.sales_request_id as request_id,
  i.investor_name,
  i.investor_phone,
  i.total_amount,
  i.status as invoice_status,
  i.payment_method,
  i.notes,
  i.issued_at,
  i.paid_at,
  i.created_at as invoice_created_at,
  r.tree_type,
  r.number_of_trees,
  r.status as request_status,
  r.created_at as request_created_at,
  f.name as farm_name,
  f.id as farm_id,
  o.title as opportunity_title,
  -- معلومات الإيصال إن وجد
  pr.id as payment_receipt_id,
  pr.receipt_url,
  pr.staff_decision as receipt_status,
  pr.uploaded_at as receipt_uploaded_at
FROM b2f_invoices i
LEFT JOIN b2f_sales_requests r ON i.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
LEFT JOIN b2f_payment_receipts pr ON r.id = pr.sales_request_id
ORDER BY i.created_at DESC;

-- ========================================
-- 2. إنشاء جدول تكوينات بوابات الدفع
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_payment_gateways_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL CHECK (code IN ('bank_transfer', 'stc_pay', 'mada', 'visa_master', 'apple_pay')),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text NOT NULL,
  is_enabled boolean DEFAULT false,
  is_available boolean DEFAULT true,
  display_order integer NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  account_number text,
  iban text,
  bank_name text,
  beneficiary_name text,
  merchant_id text,
  api_key_encrypted text,
  webhook_url text,
  test_mode boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- 3. تفعيل RLS وإنشاء السياسات
-- ========================================

ALTER TABLE b2f_payment_gateways_config ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة جميع البوابات
CREATE POLICY "Allow public read all gateways"
  ON b2f_payment_gateways_config FOR SELECT
  TO public
  USING (true);

-- السماح للمصادقين بالتحديث
CREATE POLICY "Allow authenticated update gateways"
  ON b2f_payment_gateways_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- السماح للمصادقين بالإدراج
CREATE POLICY "Allow authenticated insert gateways"
  ON b2f_payment_gateways_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================
-- 4. إدراج البيانات الافتراضية
-- ========================================

INSERT INTO b2f_payment_gateways_config (code, name_ar, name_en, icon, is_enabled, is_available, display_order, bank_name, beneficiary_name)
VALUES 
  ('bank_transfer', 'تحويل بنكي', 'Bank Transfer', 'building', true, true, 1, 'البنك الأهلي السعودي', 'شركة المزارع الاستثمارية'),
  ('stc_pay', 'STC Pay', 'STC Pay', 'smartphone', false, true, 2, NULL, NULL),
  ('mada', 'مدى', 'Mada', 'credit-card', false, true, 3, NULL, NULL),
  ('visa_master', 'فيزا / ماستركارد', 'Visa/Mastercard', 'credit-card', false, true, 4, NULL, NULL),
  ('apple_pay', 'Apple Pay', 'Apple Pay', 'smartphone', false, true, 5, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 5. منح الصلاحيات
-- ========================================

GRANT SELECT ON v_b2f_investment_invoices TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON b2f_payment_gateways_config TO authenticated;
GRANT SELECT ON b2f_payment_gateways_config TO anon;

-- ========================================
-- 6. Trigger للتحديث التلقائي
-- ========================================

CREATE OR REPLACE FUNCTION update_gateway_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gateways_updated_at ON b2f_payment_gateways_config;

CREATE TRIGGER update_gateways_updated_at
  BEFORE UPDATE ON b2f_payment_gateways_config
  FOR EACH ROW
  EXECUTE FUNCTION update_gateway_updated_at();
