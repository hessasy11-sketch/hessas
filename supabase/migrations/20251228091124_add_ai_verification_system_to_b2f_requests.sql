/*
  # إضافة نظام التحقق بالذكاء الصناعي لطلبات الاستثمار

  ## الأعمدة الجديدة
  
  ### أعمدة تحليل الذكاء الصناعي:
  - `ai_verified_amount` - المبلغ المستخرج من الإيصال بواسطة AI
  - `ai_verification_status` - حالة التحقق (verified, mismatch, manual_review, pending)
  - `ai_verification_notes` - ملاحظات الذكاء الصناعي
  - `ai_extracted_date` - التاريخ المستخرج من الإيصال
  - `expected_amount` - المبلغ المتوقع (من العقد)
  - `amount_difference` - الفرق بين المبلغ المكتشف والمتوقع
  - `ai_verified_at` - تاريخ التحقق بواسطة AI
  - `ai_verification_result` - نتائج التحليل الكاملة (JSON)
  
  ### أعمدة حالة الدفع:
  - `payment_verified` - تم التحقق من الدفع
  - `payment_verified_at` - تاريخ التحقق من الدفع
  
  ### أعمدة العقد والشهادة:
  - `contract_generated` - تم إصدار العقد
  - `contract_generated_at` - تاريخ إصدار العقد
  - `contract_pdf_url` - رابط ملف العقد
  - `certificate_issued` - تم إصدار الشهادة
  - `certificate_issued_at` - تاريخ إصدار الشهادة
  
  ### أعمدة التشغيل:
  - `transferred_to_operations` - تم النقل للتشغيل
  - `transferred_to_operations_at` - تاريخ النقل
  - `operational_status` - الحالة التشغيلية

  ## الفهارس
  - فهرس على ai_verification_status للبحث السريع
  - فهرس على payment_verified للتصفية
  - فهرس على operational_status
*/

-- إضافة أعمدة تحليل الذكاء الصناعي
ALTER TABLE b2f_investment_requests 
ADD COLUMN IF NOT EXISTS ai_verified_amount numeric,
ADD COLUMN IF NOT EXISTS ai_verification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_verification_notes text,
ADD COLUMN IF NOT EXISTS ai_extracted_date text,
ADD COLUMN IF NOT EXISTS expected_amount numeric,
ADD COLUMN IF NOT EXISTS amount_difference numeric,
ADD COLUMN IF NOT EXISTS ai_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS ai_verification_result jsonb;

-- إضافة أعمدة حالة الدفع
ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

-- إضافة أعمدة العقد والشهادة
ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS contract_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_pdf_url text,
ADD COLUMN IF NOT EXISTS certificate_issued boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_issued_at timestamptz;

-- إضافة أعمدة التشغيل
ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS transferred_to_operations boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transferred_to_operations_at timestamptz,
ADD COLUMN IF NOT EXISTS operational_status text DEFAULT 'not_started';

-- إضافة constraint لحالة التحقق
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'b2f_investment_requests_ai_verification_status_check'
  ) THEN
    ALTER TABLE b2f_investment_requests
    ADD CONSTRAINT b2f_investment_requests_ai_verification_status_check
    CHECK (ai_verification_status IN ('pending', 'verified', 'mismatch', 'manual_review', 'rejected'));
  END IF;
END $$;

-- إضافة constraint للحالة التشغيلية
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'b2f_investment_requests_operational_status_check'
  ) THEN
    ALTER TABLE b2f_investment_requests
    ADD CONSTRAINT b2f_investment_requests_operational_status_check
    CHECK (operational_status IN ('not_started', 'pending', 'in_progress', 'completed', 'on_hold'));
  END IF;
END $$;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_b2f_requests_ai_verification_status 
ON b2f_investment_requests(ai_verification_status);

CREATE INDEX IF NOT EXISTS idx_b2f_requests_payment_verified 
ON b2f_investment_requests(payment_verified);

CREATE INDEX IF NOT EXISTS idx_b2f_requests_operational_status 
ON b2f_investment_requests(operational_status);

CREATE INDEX IF NOT EXISTS idx_b2f_requests_transferred_to_operations 
ON b2f_investment_requests(transferred_to_operations);

-- تحديث الحالات الموجودة
UPDATE b2f_investment_requests
SET expected_amount = total_amount
WHERE expected_amount IS NULL;

-- إضافة تعليقات للتوثيق
COMMENT ON COLUMN b2f_investment_requests.ai_verification_status IS 'حالة التحقق بالذكاء الصناعي: pending, verified, mismatch, manual_review, rejected';
COMMENT ON COLUMN b2f_investment_requests.operational_status IS 'الحالة التشغيلية: not_started, pending, in_progress, completed, on_hold';
COMMENT ON COLUMN b2f_investment_requests.amount_difference IS 'الفرق بين المبلغ المكتشف والمتوقع (موجب = زيادة، سالب = نقص)';