/*
  # إنشاء نظام إدارة النصوص ورسوم التشغيل B2F (نسخة محدثة)

  1. جداول جديدة:
    - `b2f_text_management`: نظام إدارة النصوص الديناميكية
    - `b2f_operation_fees`: رسوم التشغيل والصيانة لكل شهادة

  2. الميزات:
    - نصوص قابلة للتعديل بالكامل من لوحة التحكم
    - دعم متغيرات في النصوص (placeholders)
    - تاريخ فعالية الرسوم (from/to)
    - حالات مختلفة للرسوم
    - ربط مباشر مع الشهادات
*/

-- ===============================================
-- 1. إضافة أعمدة مفقودة لجدول الشهادات
-- ===============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'farm_name'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN farm_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'trees_count'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN trees_count integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'duration_years'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN duration_years integer;
  END IF;
END $$;

-- ===============================================
-- 2. جدول إدارة النصوص
-- ===============================================
CREATE TABLE IF NOT EXISTS b2f_text_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  category text DEFAULT 'operation_fees',
  description text,
  supports_placeholders boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_text_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read text management"
  ON b2f_text_management FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage texts"
  ON b2f_text_management FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_b2f_text_management_key 
  ON b2f_text_management(key);

CREATE INDEX IF NOT EXISTS idx_b2f_text_management_category 
  ON b2f_text_management(category);

-- ===============================================
-- 3. جدول رسوم التشغيل
-- ===============================================
CREATE TABLE IF NOT EXISTS b2f_operation_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES b2f_certificates(id) ON DELETE CASCADE,
  investor_phone text,
  farm_name text NOT NULL,
  certificate_number text,
  trees_count integer NOT NULL,
  fee_per_tree numeric(10,2) NOT NULL,
  total_fee numeric(10,2) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'will_change_soon', 'under_review', 'suspended')),
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_operation_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view their operation fees"
  ON b2f_operation_fees FOR SELECT
  USING (investor_phone IS NOT NULL);

CREATE POLICY "Authenticated users can manage operation fees"
  ON b2f_operation_fees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_b2f_operation_fees_investor_phone 
  ON b2f_operation_fees(investor_phone);

CREATE INDEX IF NOT EXISTS idx_b2f_operation_fees_certificate_id 
  ON b2f_operation_fees(certificate_id);

CREATE INDEX IF NOT EXISTS idx_b2f_operation_fees_status 
  ON b2f_operation_fees(status);

-- ===============================================
-- 4. Trigger لحساب إجمالي الرسوم تلقائياً
-- ===============================================
CREATE OR REPLACE FUNCTION calculate_operation_total_fee()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_fee := NEW.trees_count * NEW.fee_per_tree;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_operation_total_fee ON b2f_operation_fees;

CREATE TRIGGER auto_calculate_operation_total_fee
  BEFORE INSERT OR UPDATE ON b2f_operation_fees
  FOR EACH ROW
  EXECUTE FUNCTION calculate_operation_total_fee();

-- ===============================================
-- 5. إدراج النصوص الافتراضية
-- ===============================================
INSERT INTO b2f_text_management (key, value, category, description, supports_placeholders) VALUES
  ('operation_fees.title', 'رسوم التشغيل والصيانة للأشجار', 'operation_fees', 'عنوان الصفحة الرئيسي', false),
  ('operation_fees.subtitle', 'هذه الرسوم تغطي العناية والتشغيل للأشجار طوال مدة العقد، ويمكن تعديلها من قبل الإدارة حسب السياسة.', 'operation_fees', 'نص تعريفي تحت العنوان', false),
  ('operation_fees.note_bottom', 'قد يتم تحديث رسوم التشغيل من حين لآخر بما يتوافق مع تكاليف التشغيل الفعلية.', 'operation_fees', 'ملاحظة في أسفل الصفحة', false),
  ('operation_fees.label_per_tree', 'رسوم التشغيل لكل شجرة', 'operation_fees', 'تسمية الرسوم للشجرة الواحدة', false),
  ('operation_fees.label_total', 'إجمالي رسوم التشغيل لهذا العقد', 'operation_fees', 'تسمية الإجمالي', false),
  ('operation_fees.label_status', 'حالة الرسوم', 'operation_fees', 'تسمية الحالة', false),
  ('operation_fees.button_details', 'تفاصيل الرسوم', 'operation_fees', 'نص زر التفاصيل', false),
  ('operation_fees.details_paragraph', 'رسوم التشغيل تشمل خدمات الري، التسميد، المتابعة الدورية، وبعض أعمال الصيانة الأساسية. قد تتغير هذه الرسوم وفقًا لتكاليف التشغيل الفعلية، ويتم إعلامك بأي تغيير مهم.', 'operation_fees', 'فقرة التفاصيل في Modal', false),
  ('operation_fees.validity_text', 'هذه الرسوم مطبقة ابتداءً من {from_date} وحتى إشعار آخر.', 'operation_fees', 'نص صلاحية الرسوم', true),
  ('operation_fees.status.active', 'سارية', 'operation_fees', 'حالة: نشطة', false),
  ('operation_fees.status.will_change_soon', 'سيتم تحديثها قريبًا', 'operation_fees', 'حالة: ستتغير قريباً', false),
  ('operation_fees.status.under_review', 'قيد المراجعة', 'operation_fees', 'حالة: تحت المراجعة', false),
  ('operation_fees.badge_recently_updated', 'محدّثة مؤخرًا', 'operation_fees', 'شارة التحديث الأخير', false),
  ('operation_fees.last_update_label', 'آخر تحديث للرسوم', 'operation_fees', 'تسمية آخر تحديث', false),
  ('operation_fees.empty_state_title', 'لا توجد رسوم تشغيل', 'operation_fees', 'عنوان الحالة الفارغة', false),
  ('operation_fees.empty_state_message', 'لم يتم تحديد رسوم تشغيل لعقودك بعد.', 'operation_fees', 'رسالة الحالة الفارغة', false)
ON CONFLICT (key) DO NOTHING;

-- ===============================================
-- 6. Function لاسترجاع النصوص مع دعم placeholders
-- ===============================================
CREATE OR REPLACE FUNCTION get_text_value(text_key text, replacements jsonb DEFAULT '{}'::jsonb)
RETURNS text AS $$
DECLARE
  text_value text;
  placeholder text;
  replacement text;
BEGIN
  SELECT value INTO text_value
  FROM b2f_text_management
  WHERE key = text_key;
  
  IF text_value IS NULL THEN
    RETURN text_key;
  END IF;
  
  FOR placeholder, replacement IN SELECT * FROM jsonb_each_text(replacements)
  LOOP
    text_value := replace(text_value, '{' || placeholder || '}', replacement);
  END LOOP;
  
  RETURN text_value;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 7. View للحصول على نظرة شاملة
-- ===============================================
CREATE OR REPLACE VIEW b2f_operation_fees_with_certificates AS
SELECT 
  of.*,
  c.investor_name,
  c.issue_date as certificate_issue_date,
  c.contract_start_date,
  c.contract_end_date,
  CASE 
    WHEN of.updated_at > (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN true
    ELSE false
  END as is_recently_updated
FROM b2f_operation_fees of
LEFT JOIN b2f_certificates c ON of.certificate_id = c.id;
