/*
  # بناء نظام استثمار أشجار المزارع (B2F) من الصفر

  ## نظرة عامة
  نظام منفصل تماماً عن المزادات، مخصص لاستثمار أشجار المزارع
  
  ## الجداول الجديدة
  
  ### 1. b2f_farms (المزارع)
  - معلومات المزرعة الأساسية
  - الأشجار المتاحة والمحجوزة
  - الصور والوصف
  
  ### 2. b2f_opportunities (العروض الاستثمارية)
  - مرتبطة بمزرعة واحدة
  - تفاصيل العرض والأسعار
  - المدة والعائد المتوقع
  
  ### 3. b2f_investment_requests (طلبات الاستثمار)
  - طلبات من المستثمرين
  - مرتبطة بعرض استثماري
  - حالة الطلب (معلق/مقبول/مرفوض)
  
  ### 4. b2f_contracts (العقود)
  - عقد لكل طلب مقبول
  - تواريخ البداية والنهاية
  - شروط العقد
  
  ### 5. b2f_payment_receipts (إيصالات الدفع)
  - إيصالات الدفع للعقود
  - صور الإيصالات
  - حالة التحقق
  
  ### 6. b2f_certificates (شهادات الاستثمار)
  - تصدر بعد التحقق من الدفع
  - تحتوي على QR Code
  - قابلة للطباعة
  
  ### 7. b2f_settings (إعدادات القسم)
  - إعدادات عامة للنظام
  
  ## العلاقات
  - مزرعة → عرض (one-to-many)
  - عرض → طلب (one-to-many)
  - طلب → عقد (one-to-one)
  - عقد → إيصال (one-to-many)
  - إيصال → شهادة (one-to-one)
  
  ## الأمان
  - RLS مفعل على جميع الجداول
  - قراءة عامة للبيانات النشطة
  - تعديل محدود للمشرفين المسجلين
*/

-- ===============================================
-- 1. جدول المزارع
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  total_trees integer NOT NULL DEFAULT 0,
  available_trees integer NOT NULL DEFAULT 0,
  description text,
  images text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active farms"
  ON b2f_farms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage farms"
  ON b2f_farms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 2. جدول العروض الاستثمارية
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_per_tree numeric(10,2) NOT NULL,
  min_trees integer NOT NULL DEFAULT 1,
  max_trees integer NOT NULL DEFAULT 100,
  duration_years integer NOT NULL DEFAULT 1,
  expected_return text,
  images text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active opportunities"
  ON b2f_opportunities FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage opportunities"
  ON b2f_opportunities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 3. جدول طلبات الاستثمار
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_investment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  investor_email text,
  requested_trees integer NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_investment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create investment requests"
  ON b2f_investment_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view and manage requests"
  ON b2f_investment_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update requests"
  ON b2f_investment_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 4. جدول العقود
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  contract_number text UNIQUE NOT NULL,
  contract_date date NOT NULL DEFAULT CURRENT_DATE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  terms text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contracts"
  ON b2f_contracts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 5. جدول إيصالات الدفع
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  receipt_number text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  receipt_image text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage receipts"
  ON b2f_payment_receipts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 6. جدول شهادات الاستثمار
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES b2f_payment_receipts(id) ON DELETE CASCADE,
  certificate_number text UNIQUE NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  investor_name text NOT NULL,
  farm_name text NOT NULL,
  trees_count integer NOT NULL,
  investment_amount numeric(10,2) NOT NULL,
  duration_years integer NOT NULL,
  qr_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active certificates"
  ON b2f_certificates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage certificates"
  ON b2f_certificates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 7. جدول الإعدادات
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  setting_type text DEFAULT 'text',
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON b2f_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage settings"
  ON b2f_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- دالة لتحديث updated_at تلقائياً
-- ===============================================

CREATE OR REPLACE FUNCTION update_b2f_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على الجداول المناسبة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_b2f_farms_updated_at'
  ) THEN
    CREATE TRIGGER update_b2f_farms_updated_at
      BEFORE UPDATE ON b2f_farms
      FOR EACH ROW
      EXECUTE FUNCTION update_b2f_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_b2f_opportunities_updated_at'
  ) THEN
    CREATE TRIGGER update_b2f_opportunities_updated_at
      BEFORE UPDATE ON b2f_opportunities
      FOR EACH ROW
      EXECUTE FUNCTION update_b2f_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_b2f_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_b2f_requests_updated_at
      BEFORE UPDATE ON b2f_investment_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_b2f_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_b2f_contracts_updated_at'
  ) THEN
    CREATE TRIGGER update_b2f_contracts_updated_at
      BEFORE UPDATE ON b2f_contracts
      FOR EACH ROW
      EXECUTE FUNCTION update_b2f_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_b2f_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_b2f_settings_updated_at
      BEFORE UPDATE ON b2f_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_b2f_updated_at();
  END IF;
END $$;

-- ===============================================
-- إدراج إعدادات افتراضية
-- ===============================================

INSERT INTO b2f_settings (setting_key, setting_value, setting_type, description) VALUES
  ('system_name', 'نظام استثمار أشجار المزارع', 'text', 'اسم النظام'),
  ('welcome_message', 'مرحباً بك في نظام استثمار أشجار المزارع', 'text', 'رسالة الترحيب'),
  ('contact_email', 'info@farms.com', 'text', 'البريد الإلكتروني للتواصل'),
  ('contact_phone', '0500000000', 'text', 'رقم الهاتف للتواصل'),
  ('min_investment_trees', '10', 'number', 'الحد الأدنى للاستثمار'),
  ('max_investment_trees', '1000', 'number', 'الحد الأقصى للاستثمار')
ON CONFLICT (setting_key) DO NOTHING;
