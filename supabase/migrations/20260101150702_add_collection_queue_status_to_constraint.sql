/*
  # إضافة حالة collection_queue للـ check constraint

  ## المشكلة
  - الكود يستخدم حالة 'collection_queue' لكنها غير موجودة في الـ constraint
  - هذا يسبب خطأ عند إنشاء طلبات حجز جديدة
  
  ## الحل
  - إضافة 'collection_queue' إلى قائمة الحالات المسموح بها
*/

-- حذف القيد القديم
ALTER TABLE b2f_sales_requests DROP CONSTRAINT IF EXISTS b2f_sales_requests_status_check;

-- إنشاء القيد الجديد مع collection_queue
ALTER TABLE b2f_sales_requests ADD CONSTRAINT b2f_sales_requests_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'collection_queue'::text,
  'payment_open'::text,
  'receipt_uploaded'::text,
  'receipt_under_review'::text,
  'receipt_approved'::text,
  'receipt_rejected'::text,
  'contract_issued'::text,
  'transferred_to_operations'::text,
  'payment_confirmed'::text,
  'payment_pending_verification'::text
]));