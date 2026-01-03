/*
  # إضافة حالة collection_queue

  1. التغييرات
    - إضافة حالة 'collection_queue' إلى قائمة الحالات المسموحة
    
  2. الهدف
    - السماح بإنشاء طلبات بحالة collection_queue
*/

-- حذف القيد القديم
ALTER TABLE b2f_sales_requests DROP CONSTRAINT IF EXISTS b2f_sales_requests_status_check;

-- إضافة القيد الجديد مع collection_queue
ALTER TABLE b2f_sales_requests ADD CONSTRAINT b2f_sales_requests_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'approved'::text,
  'payment_open'::text,
  'receipt_uploaded'::text,
  'receipt_needs_review'::text,
  'receipt_under_review'::text,
  'receipt_approved'::text,
  'receipt_needs_revision'::text,
  'auto_approved'::text,
  'auto_rejected'::text,
  'financial_review'::text,
  'contract_issued'::text,
  'transferred_to_operations'::text,
  'rejected'::text,
  'collection_queue'::text
]));
