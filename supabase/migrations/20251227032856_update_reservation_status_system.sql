/*
  # تحديث نظام الحالات للحجوزات الاستثمارية

  1. التغييرات
    - تحديث الحالة الافتراضية إلى 'pending_payment'
    - إضافة حقل ai_verification_result لتخزين نتيجة التحليل الآلي
    - إضافة حقل certificate_url لتخزين رابط الشهادة
    - إضافة حقل certificate_issued_at لتاريخ إصدار الشهادة

  2. الحالات المدعومة
    - pending_payment: بانتظار الدفع (الحالة الافتراضية عند إنشاء الحجز)
    - receipt_uploaded: تم رفع الإيصال (تلقائية عند رفع الإيصال)
    - ai_verification: تحت التحقق الآلي (تلقائية بعد رفع الإيصال)
    - needs_review: يحتاج مراجعة مالية (تلقائية إذا لم يتطابق المبلغ)
    - activated: تم التفعيل (تلقائية إذا تطابق المبلغ + إصدار الشهادة)
    - rejected: مرفوض (يدوية من الإدارة)
*/

-- تحديث الحالة الافتراضية
ALTER TABLE investment_reservations
  ALTER COLUMN status SET DEFAULT 'pending_payment';

-- إضافة حقل ai_verification_result
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_reservations' AND column_name = 'ai_verification_result'
  ) THEN
    ALTER TABLE investment_reservations
      ADD COLUMN ai_verification_result jsonb;
  END IF;
END $$;

-- إضافة حقل certificate_url
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_reservations' AND column_name = 'certificate_url'
  ) THEN
    ALTER TABLE investment_reservations
      ADD COLUMN certificate_url text;
  END IF;
END $$;

-- إضافة حقل certificate_issued_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_reservations' AND column_name = 'certificate_issued_at'
  ) THEN
    ALTER TABLE investment_reservations
      ADD COLUMN certificate_issued_at timestamptz;
  END IF;
END $$;

-- تحديث الحجوزات الموجودة من 'pending_review' إلى 'pending_payment'
UPDATE investment_reservations
  SET status = 'pending_payment'
  WHERE status = 'pending_review';

-- إضافة comment للتوضيح
COMMENT ON COLUMN investment_reservations.status IS
  'حالة الحجز: pending_payment (بانتظار الدفع), receipt_uploaded (تم رفع الإيصال), ai_verification (تحت التحقق الآلي), needs_review (يحتاج مراجعة), activated (تم التفعيل), rejected (مرفوض)';

COMMENT ON COLUMN investment_reservations.ai_verification_result IS
  'نتيجة التحليل الآلي للإيصال: {detectedAmount, detectedDate, matchScore, analysisResult, aiNotes}';

COMMENT ON COLUMN investment_reservations.certificate_url IS
  'رابط شهادة التأجير PDF (يتم إنشاؤها تلقائياً عند التفعيل)';

COMMENT ON COLUMN investment_reservations.certificate_issued_at IS
  'تاريخ إصدار شهادة التأجير';
