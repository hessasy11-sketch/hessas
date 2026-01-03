/*
  # إنشاء نظام سجل التحقق من الإيصالات

  ## الجداول الجديدة
  
  ### `receipt_verification_logs`
  جدول لتسجيل كل محاولة تحقق من إيصال مع التفاصيل الكاملة
  
  الأعمدة:
  - `id` (uuid, primary key)
  - `request_id` (uuid) - معرف الطلب
  - `receipt_url` (text) - رابط الإيصال
  - `verification_status` (text) - حالة التحقق: verified, rejected, needs_review
  - `confidence_score` (integer) - نسبة الثقة (0-100)
  - `rejection_reason` (text) - سبب الرفض إن وجد
  
  ### بيانات مستخرجة من الإيصال:
  - `is_valid_receipt` (boolean) - هل الملف إيصال حقيقي؟
  - `detected_amount` (numeric) - المبلغ المكتشف
  - `expected_amount` (numeric) - المبلغ المتوقع
  - `amount_difference` (numeric) - الفرق بين المبلغين
  - `detected_date` (date) - تاريخ العملية المكتشف
  - `detected_bank` (text) - اسم البنك/الجهة المكتشف
  - `detected_beneficiary` (text) - اسم المستفيد المكتشف
  - `has_transaction_id` (boolean) - هل يوجد رقم عملية؟
  - `has_bank_logo` (boolean) - هل يوجد شعار البنك؟
  - `has_official_stamp` (boolean) - هل يوجد ختم رسمي؟
  
  ### نتيجة التحليل:
  - `analysis_result` (jsonb) - النتيجة الكاملة من AI
  - `ai_notes` (text) - ملاحظات الذكاء الصناعي
  - `manual_review_required` (boolean) - يحتاج مراجعة يدوية؟
  - `manual_reviewer_id` (uuid) - معرف المراجع اليدوي
  - `manual_review_notes` (text) - ملاحظات المراجعة اليدوية
  - `manual_reviewed_at` (timestamptz) - وقت المراجعة اليدوية
  
  ### التواريخ:
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## الأمان
  - تفعيل RLS
  - النظام (service_role) يستطيع الكتابة والقراءة
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS receipt_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات الطلب
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  receipt_url text NOT NULL,
  
  -- حالة التحقق
  verification_status text NOT NULL CHECK (verification_status IN ('verified', 'rejected', 'needs_review', 'processing')),
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  rejection_reason text,
  
  -- بيانات التحقق الأساسية
  is_valid_receipt boolean DEFAULT false,
  detected_amount numeric(12, 2),
  expected_amount numeric(12, 2),
  amount_difference numeric(12, 2),
  detected_date date,
  detected_bank text,
  detected_beneficiary text,
  
  -- عناصر الإيصال
  has_transaction_id boolean DEFAULT false,
  has_bank_logo boolean DEFAULT false,
  has_official_stamp boolean DEFAULT false,
  
  -- نتيجة التحليل
  analysis_result jsonb,
  ai_notes text,
  
  -- المراجعة اليدوية
  manual_review_required boolean DEFAULT false,
  manual_reviewer_id uuid,
  manual_review_notes text,
  manual_reviewed_at timestamptz,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_receipt_logs_request ON receipt_verification_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_status ON receipt_verification_logs(verification_status);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_review ON receipt_verification_logs(manual_review_required) WHERE manual_review_required = true;
CREATE INDEX IF NOT EXISTS idx_receipt_logs_created ON receipt_verification_logs(created_at DESC);

-- تفعيل RLS
ALTER TABLE receipt_verification_logs ENABLE ROW LEVEL SECURITY;

-- سياسة الكتابة للنظام
CREATE POLICY "Service role can manage verification logs"
  ON receipt_verification_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- وظيفة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_receipt_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_receipt_logs_updated_at ON receipt_verification_logs;
CREATE TRIGGER set_receipt_logs_updated_at
  BEFORE UPDATE ON receipt_verification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_logs_updated_at();

-- إضافة حقول جديدة لجدول b2f_investment_requests للتكامل
DO $$
BEGIN
  -- نسبة الثقة من التحقق
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'verification_confidence_score'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN verification_confidence_score integer CHECK (verification_confidence_score >= 0 AND verification_confidence_score <= 100);
  END IF;
  
  -- هل الإيصال صالح؟
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'is_valid_receipt'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN is_valid_receipt boolean DEFAULT false;
  END IF;
  
  -- سبب الرفض
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN rejection_reason text;
  END IF;
  
  -- يحتاج مراجعة يدوية
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'requires_manual_review'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN requires_manual_review boolean DEFAULT false;
  END IF;
END $$;