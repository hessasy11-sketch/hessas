/*
  # إضافة حالات الذكاء الصناعي الجديدة

  1. التغييرات
    - إضافة حالات: `auto_approved` و `auto_rejected`
    - الإبقاء على الحالات القديمة مؤقتاً للانتقال السلس
*/

-- تحديث constraint لإضافة الحالات الجديدة مع الإبقاء على القديمة
ALTER TABLE b2f_sales_requests
DROP CONSTRAINT IF EXISTS b2f_sales_requests_status_check;

ALTER TABLE b2f_sales_requests
ADD CONSTRAINT b2f_sales_requests_status_check
CHECK (status IN (
  'pending',
  'approved',
  'payment_open',
  'receipt_uploaded',
  'receipt_needs_review',
  'receipt_under_review',
  'receipt_approved',
  'receipt_needs_revision',
  'auto_approved',
  'auto_rejected',
  'financial_review',
  'contract_issued',
  'transferred_to_operations',
  'rejected'
));

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_sales_requests_auto_approved
ON b2f_sales_requests(status, ai_verified_at)
WHERE status = 'auto_approved';

CREATE INDEX IF NOT EXISTS idx_sales_requests_auto_rejected
ON b2f_sales_requests(status, ai_verified_at)
WHERE status = 'auto_rejected';
