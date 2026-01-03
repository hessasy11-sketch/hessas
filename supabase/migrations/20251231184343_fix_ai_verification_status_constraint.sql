/*
  # إصلاح constraint لـ ai_verification_status

  1. المشكلة
    - constraint يقبل فقط: pending, approved, rejected, needs_review
    - الكود يستخدم: processing, verified

  2. الحل
    - إضافة الحالات المستخدمة في الكود
*/

-- حذف القيد القديم
ALTER TABLE b2f_sales_requests DROP CONSTRAINT IF EXISTS b2f_sales_requests_ai_verification_status_check;

-- إضافة القيد الجديد مع جميع الحالات
ALTER TABLE b2f_sales_requests ADD CONSTRAINT b2f_sales_requests_ai_verification_status_check
CHECK (ai_verification_status = ANY (ARRAY[
  'pending'::text,
  'processing'::text,
  'verified'::text,
  'approved'::text,
  'rejected'::text,
  'needs_review'::text
]));
