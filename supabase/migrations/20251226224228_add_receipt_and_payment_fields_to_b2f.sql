/*
  # إضافة حقول الإيصال والدفع لنظام B2F

  1. التعديلات على الجداول:
    - إضافة حقول رفع الإيصال إلى `b2f_investment_requests`
    - إضافة حقول رفع الإيصال إلى `investment_reservations`
    
  2. الحقول الجديدة:
    - `receipt_url`: رابط الإيصال المرفوع
    - `receipt_uploaded_at`: تاريخ رفع الإيصال
    - `payment_verified`: هل تم التحقق من الدفع
    - `payment_verified_by`: المستخدم الذي قام بالتحقق
    - `payment_verified_at`: تاريخ التحقق من الدفع
    - `ai_verification_result`: نتيجة التحقق بالذكاء الصناعي
    - `admin_notes`: ملاحظات الإدارة

  3. حالات الطلب الجديدة:
    - `receipt_uploaded`: تم رفع الإيصال - بانتظار المراجعة
    - `payment_verified`: تم التحقق من الدفع
    - `payment_rejected`: تم رفض الإيصال
*/

-- إضافة حقول الإيصال والدفع إلى b2f_investment_requests
DO $$
BEGIN
  -- إضافة receipt_url إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN receipt_url TEXT;
  END IF;

  -- إضافة receipt_uploaded_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'receipt_uploaded_at'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN receipt_uploaded_at TIMESTAMPTZ;
  END IF;

  -- إضافة payment_verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'payment_verified'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN payment_verified BOOLEAN DEFAULT false;
  END IF;

  -- إضافة payment_verified_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'payment_verified_by'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN payment_verified_by UUID REFERENCES profiles(id);
  END IF;

  -- إضافة payment_verified_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'payment_verified_at'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN payment_verified_at TIMESTAMPTZ;
  END IF;

  -- إضافة ai_verification_result
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'ai_verification_result'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN ai_verification_result JSONB;
  END IF;

  -- إضافة admin_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- التعليق على الحقول الجديدة
COMMENT ON COLUMN b2f_investment_requests.receipt_url IS 'رابط إيصال الدفع المرفوع من قبل المستثمر';
COMMENT ON COLUMN b2f_investment_requests.receipt_uploaded_at IS 'تاريخ رفع الإيصال';
COMMENT ON COLUMN b2f_investment_requests.payment_verified IS 'هل تم التحقق من الدفع من قبل الإدارة';
COMMENT ON COLUMN b2f_investment_requests.payment_verified_by IS 'معرّف المستخدم الذي قام بالتحقق من الدفع';
COMMENT ON COLUMN b2f_investment_requests.payment_verified_at IS 'تاريخ التحقق من الدفع';
COMMENT ON COLUMN b2f_investment_requests.ai_verification_result IS 'نتيجة التحقق الآلي من الإيصال باستخدام الذكاء الصناعي';
COMMENT ON COLUMN b2f_investment_requests.admin_notes IS 'ملاحظات الإدارة حول الطلب والإيصال';
