/*
  # نظام العقود الاستثمارية B2F
  
  1. جدول العقود
    - `id` - معرف فريد
    - `reservation_id` - ربط بالحجز (investment_reservations)
    - `contract_number` - رقم العقد الفريد
    - `investor_name` - اسم المستثمر
    - `investor_phone` - هاتف المستثمر
    - `farm_name` - اسم المزرعة
    - `opportunity_title` - عنوان الفرصة
    - `tree_type` - نوع الأشجار
    - `tree_count` - عدد الأشجار
    - `total_amount` - المبلغ الإجمالي
    - `contract_date` - تاريخ العقد
    - `start_date` - تاريخ البداية
    - `end_date` - تاريخ النهاية
    - `contract_duration_years` - مدة العقد بالسنوات
    - `terms` - شروط العقد
    - `contract_url` - رابط ملف العقد PDF
    - `status` - حالة العقد
    
  2. الأمان
    - RLS مفعّل
    - المستخدمون المصادق عليهم يمكنهم الإدارة
*/

-- إنشاء جدول العقود
CREATE TABLE IF NOT EXISTS b2f_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- الربط مع الحجز
  reservation_id uuid REFERENCES investment_reservations(id) ON DELETE CASCADE,
  
  -- رقم العقد
  contract_number TEXT UNIQUE NOT NULL,
  
  -- معلومات المستثمر
  investor_name TEXT NOT NULL,
  investor_phone TEXT NOT NULL,
  
  -- معلومات الفرصة
  farm_name TEXT,
  opportunity_title TEXT NOT NULL,
  tree_type TEXT NOT NULL,
  tree_count INTEGER NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  
  -- التواريخ
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_duration_years INTEGER NOT NULL DEFAULT 10,
  
  -- شروط وملفات العقد
  terms TEXT,
  contract_url TEXT,
  
  -- الحالة
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  
  -- التتبع
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE b2f_contracts ENABLE ROW LEVEL SECURITY;

-- المستخدمون المصادق عليهم يمكنهم القراءة
CREATE POLICY "Authenticated users can read contracts"
  ON b2f_contracts FOR SELECT
  TO authenticated
  USING (true);

-- المستخدمون يمكنهم إدارة العقود
CREATE POLICY "Authenticated users can manage contracts"
  ON b2f_contracts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_reservation_id 
ON b2f_contracts(reservation_id);

CREATE INDEX IF NOT EXISTS idx_b2f_contracts_contract_number 
ON b2f_contracts(contract_number);

CREATE INDEX IF NOT EXISTS idx_b2f_contracts_status 
ON b2f_contracts(status);

CREATE INDEX IF NOT EXISTS idx_b2f_contracts_investor_phone 
ON b2f_contracts(investor_phone);

-- دالة لتوليد رقم عقد فريد
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- توليد رقم عقد بصيغة: CONTRACT-YYYY-XXXXXX
    new_number := 'CONTRACT-' || 
                  TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                  LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- التحقق من عدم وجود هذا الرقم
    SELECT EXISTS(
      SELECT 1 FROM b2f_contracts WHERE contract_number = new_number
    ) INTO exists_check;
    
    -- إذا لم يكن موجوداً، استخدمه
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE b2f_contracts IS 'جدول العقود الاستثمارية';
COMMENT ON COLUMN b2f_contracts.reservation_id IS 'ربط بحجز من investment_reservations';
COMMENT ON COLUMN b2f_contracts.contract_number IS 'رقم العقد الفريد';
COMMENT ON COLUMN b2f_contracts.status IS 'حالة العقد: draft (مسودة), active (نشط), completed (مكتمل), cancelled (ملغي)';
