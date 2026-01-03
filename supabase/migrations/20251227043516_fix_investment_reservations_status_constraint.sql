/*
  # إصلاح قيد حالات الحجوزات الاستثمارية

  1. المشكلة
    - الـ CHECK constraint الحالي يحتوي على حالات قديمة لا تطابق الحالات الجديدة

  2. الحل
    - حذف القيد القديم
    - إنشاء قيد جديد يحتوي على جميع الحالات الصحيحة:
      - pending_payment: بانتظار الدفع
      - receipt_uploaded: تم رفع الإيصال
      - ai_verification: تحت التحقق الآلي
      - needs_review: يحتاج مراجعة مالية
      - activated: تم التفعيل
      - rejected: مرفوض
      - cancelled: ملغي
*/

-- حذف القيد القديم
ALTER TABLE investment_reservations
  DROP CONSTRAINT IF EXISTS check_status_valid;

-- إنشاء القيد الجديد مع الحالات الصحيحة
ALTER TABLE investment_reservations
  ADD CONSTRAINT check_status_valid
  CHECK (status IN (
    'pending_payment',
    'receipt_uploaded',
    'ai_verification',
    'needs_review',
    'activated',
    'rejected',
    'cancelled'
  ));

-- التعليق على الحقل
COMMENT ON COLUMN investment_reservations.status IS
  'حالات الحجز المدعومة:
  - pending_payment: بانتظار الدفع (الحالة الافتراضية)
  - receipt_uploaded: تم رفع الإيصال (تلقائية)
  - ai_verification: تحت التحقق الآلي (تلقائية)
  - needs_review: يحتاج مراجعة مالية (تلقائية إذا لم يتطابق المبلغ)
  - activated: تم التفعيل (تلقائية إذا تطابق المبلغ + إصدار شهادة)
  - rejected: مرفوض (يدوية)
  - cancelled: ملغي (يدوية)';