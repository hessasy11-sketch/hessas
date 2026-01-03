/*
  # إضافة طريقة الدفع والحالة الجديدة
  
  1. التعديلات
    - إضافة عمود `payment_method` لتخزين طريقة الدفع (مدى، Apple Pay، STC Pay، تابي، تمارا، تحويل بنكي)
    - إضافة حالة `payment_confirmed` للدفعات الإلكترونية المؤكدة فوراً
    - إضافة حالة `payment_pending_verification` للدفعات التي تحتاج تحقق
  
  2. الهدف
    - تمكين المستثمرين من اختيار طريقة الدفع
    - التمييز بين الدفع الإلكتروني (مؤكد فوراً) والتحويل البنكي (يحتاج مراجعة)
*/

-- إضافة عمود طريقة الدفع
ALTER TABLE b2f_sales_requests
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- تحديث constraint الحالات لإضافة الحالات الجديدة
ALTER TABLE b2f_sales_requests
DROP CONSTRAINT IF EXISTS b2f_sales_requests_status_check;

ALTER TABLE b2f_sales_requests
ADD CONSTRAINT b2f_sales_requests_status_check
CHECK (status IN (
  'pending',
  'payment_open',
  'receipt_uploaded',
  'receipt_under_review',
  'receipt_approved',
  'receipt_rejected',
  'contract_issued',
  'transferred_to_operations',
  'payment_confirmed',
  'payment_pending_verification'
));

-- إضافة index لطريقة الدفع
CREATE INDEX IF NOT EXISTS idx_sales_requests_payment_method 
ON b2f_sales_requests(payment_method);

-- إضافة تعليق
COMMENT ON COLUMN b2f_sales_requests.payment_method IS 'طريقة الدفع: mada, apple_pay, stc_pay, tabby, tamara, bank_transfer';
