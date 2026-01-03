/*
  # إضافة حقول مهمة لجدول الشهادات B2F

  1. الحقول الجديدة:
    - `investor_phone` (text): رقم جوال المستثمر للربط مع حسابه
    - `contract_start_date` (date): تاريخ بداية العقد
    - `contract_end_date` (date): تاريخ نهاية العقد
    - `status` (text): حالة الشهادة (active, expired, suspended)
    - `pdf_url` (text): رابط ملف PDF للشهادة
    - `public_share_url` (text): رابط عام لمشاركة الشهادة

  2. التعديلات:
    - تحديث is_active إلى status لتوضيح الحالة بشكل أفضل
    - إضافة مؤشر على investor_phone لتسريع البحث

  3. ملاحظات:
    - الحقول الجديدة تساعد على ربط الشهادات بحسابات المستثمرين
    - يمكن حساب contract_end_date تلقائياً من start + duration_years
*/

-- إضافة حقل رقم الجوال للمستثمر
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'investor_phone'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN investor_phone text;
  END IF;
END $$;

-- إضافة تاريخ بداية العقد
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'contract_start_date'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN contract_start_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- إضافة تاريخ نهاية العقد
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'contract_end_date'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN contract_end_date date;
  END IF;
END $$;

-- إضافة حقل الحالة (status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'status'
  ) THEN
    ALTER TABLE b2f_certificates 
    ADD COLUMN status text DEFAULT 'active' 
    CHECK (status IN ('active', 'expired', 'suspended', 'under_review'));
  END IF;
END $$;

-- إضافة رابط ملف PDF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN pdf_url text;
  END IF;
END $$;

-- إضافة رابط المشاركة العام
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_certificates' AND column_name = 'public_share_url'
  ) THEN
    ALTER TABLE b2f_certificates ADD COLUMN public_share_url text;
  END IF;
END $$;

-- إنشاء مؤشر على investor_phone لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_b2f_certificates_investor_phone 
ON b2f_certificates(investor_phone);

-- إنشاء مؤشر على status
CREATE INDEX IF NOT EXISTS idx_b2f_certificates_status 
ON b2f_certificates(status);

-- تحديث البوليسي ليسمح للمستثمرين برؤية شهاداتهم
DROP POLICY IF EXISTS "Investors can view their own certificates" ON b2f_certificates;

CREATE POLICY "Investors can view their own certificates"
  ON b2f_certificates FOR SELECT
  USING (investor_phone IS NOT NULL);

-- Function لحساب تاريخ نهاية العقد تلقائياً
CREATE OR REPLACE FUNCTION calculate_contract_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_end_date IS NULL AND NEW.contract_start_date IS NOT NULL THEN
    NEW.contract_end_date := NEW.contract_start_date + (NEW.duration_years * INTERVAL '1 year');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لحساب تاريخ النهاية تلقائياً
DROP TRIGGER IF EXISTS auto_calculate_contract_end_date ON b2f_certificates;

CREATE TRIGGER auto_calculate_contract_end_date
  BEFORE INSERT OR UPDATE ON b2f_certificates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_contract_end_date();
