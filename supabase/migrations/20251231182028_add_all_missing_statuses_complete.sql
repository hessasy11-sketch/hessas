/*
  # إضافة جميع الحالات المفقودة

  1. المشكلة
    - الكود يستخدم حالات غير موجودة في constraint
    - يسبب خطأ عند رفض الإيصال من AI

  2. الحالات المضافة
    - receipt_uploaded_ai_review: بعد رفع الإيصال (قيد مراجعة AI)
    - receipt_duplicate_financial_review: يحتاج مراجعة يدوية من المالية
    - receipt_rejected: إيصال مرفوض بعد المراجعة
    - rejected_by_staff: مرفوض من الموظف
    - waiting_in_group: في انتظار المجموعة
    - group_full_pending_payment: المجموعة مكتملة تنتظر فتح الدفع
    - receipt_approved_pending_invoice: تم الموافقة على الإيصال بانتظار الفاتورة
    - invoice_issued: تم إصدار الفاتورة
    - operational: قيد التشغيل الفعلي
*/

-- حذف القيد القديم
ALTER TABLE b2f_sales_requests DROP CONSTRAINT IF EXISTS b2f_sales_requests_status_check;

-- إضافة القيد الجديد مع جميع الحالات
ALTER TABLE b2f_sales_requests ADD CONSTRAINT b2f_sales_requests_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'approved'::text,
  'collection_queue'::text,
  'waiting_in_group'::text,
  'group_full_pending_payment'::text,
  'payment_open'::text,
  'receipt_uploaded'::text,
  'receipt_uploaded_ai_review'::text,
  'receipt_needs_review'::text,
  'receipt_under_review'::text,
  'receipt_duplicate_financial_review'::text,
  'receipt_approved'::text,
  'receipt_needs_revision'::text,
  'receipt_rejected'::text,
  'auto_approved'::text,
  'auto_rejected'::text,
  'financial_review'::text,
  'receipt_approved_pending_invoice'::text,
  'invoice_issued'::text,
  'contract_issued'::text,
  'transferred_to_operations'::text,
  'operational'::text,
  'rejected'::text,
  'rejected_by_staff'::text
]));
