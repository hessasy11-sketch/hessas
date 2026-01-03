/*
  # تحديث القيمة الافتراضية للحالة في نظام B2F

  ## التغييرات
  1. تحديث القيمة الافتراضية للحقل `status` من 'new' إلى 'pending'
  2. إزالة الحالة 'new' من constraint الحالات المسموحة
  3. التأكد من أن جميع الطلبات الموجودة بحالة 'new' يتم تحديثها إلى 'pending'

  ## السبب
  - النظام الجديد يستخدم 'pending' كحالة أولية بدلاً من 'new'
  - هذا جزء من إعادة هيكلة نظام B2F الكامل للعمل بقانون المجموعات فقط
*/

-- تحديث جميع السجلات الموجودة من 'new' إلى 'pending' (إن وجدت)
UPDATE b2f_investment_requests
SET status = 'pending'
WHERE status = 'new';

-- تحديث القيمة الافتراضية للعمود
ALTER TABLE b2f_investment_requests
ALTER COLUMN status SET DEFAULT 'pending';

-- إعادة إنشاء constraint الحالات المسموحة بدون 'new'
ALTER TABLE b2f_investment_requests
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE b2f_investment_requests
ADD CONSTRAINT valid_status CHECK (
  status IN (
    'pending',
    'waiting_in_group',
    'group_full_pending_payment',
    'payment_open',
    'receipt_uploaded_ai_review',
    'receipt_duplicate_financial_review',
    'receipt_approved_pending_invoice',
    'invoice_issued',
    'contract_issued',
    'operational',
    'rejected',
    'cancelled'
  )
);
