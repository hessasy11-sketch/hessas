/*
  # إصلاح constraint حالات المدفوعات

  إضافة القيم المفقودة لـ finance_status:
  - manually_approved: عند الاعتماد اليدوي
  - auto_approved: عند الاعتماد التلقائي بالذكاء الصناعي
*/

-- حذف الـ constraint القديم
ALTER TABLE b2f_payment_documents
DROP CONSTRAINT IF EXISTS b2f_payment_documents_finance_status_check;

-- إضافة constraint جديد بجميع الحالات
ALTER TABLE b2f_payment_documents
ADD CONSTRAINT b2f_payment_documents_finance_status_check
CHECK (finance_status IN (
  'pending_review',
  'auto_approved',
  'manually_approved',
  'approved_for_contract',
  'rejected_final'
));