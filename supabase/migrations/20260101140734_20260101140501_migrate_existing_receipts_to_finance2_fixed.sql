/*
  # ربط الإيصالات القديمة مع نظام مالية 2 - محسن

  ## الهدف
  إنشاء فواتير ومعاملات دفع للطلبات القديمة لضمان ظهورها في نظام مالية 2
*/

-- ========================================
-- 1. إنشاء فواتير للطلبات التي ليس لها فواتير
-- ========================================

INSERT INTO b2f_invoices (
  request_id,
  invoice_number,
  amount,
  status,
  issued_at,
  created_at
)
SELECT 
  r.id,
  'INV-' || TO_CHAR(r.created_at, 'YYYYMMDD') || '-' || SUBSTRING(r.id::text, 1, 8),
  r.total_amount,
  CASE 
    WHEN r.status = 'approved' THEN 'paid'
    WHEN r.status IN ('receipt_under_review', 'receipt_uploaded') THEN 'pending_review'
    WHEN r.status = 'payment_rejected' THEN 'payment_rejected'
    ELSE 'unpaid'
  END,
  r.created_at,
  NOW()
FROM b2f_sales_requests r
WHERE NOT EXISTS (
  SELECT 1 FROM b2f_invoices i WHERE i.request_id = r.id
);

-- ========================================
-- 2. إنشاء معاملات دفع للطلبات التي لديها إيصال أو في حالة مراجعة
-- ========================================

INSERT INTO b2f_payment_transactions (
  transaction_number,
  invoice_id,
  sales_request_id,
  investor_name,
  investor_phone,
  payment_method,
  amount,
  status,
  receipt_url,
  created_at,
  updated_at
)
SELECT 
  'TXN-' || TO_CHAR(r.created_at, 'YYYYMMDD') || '-' || SUBSTRING(r.id::text, 1, 8),
  i.id,
  r.id,
  r.investor_name,
  r.investor_phone,
  'bank_transfer',
  r.total_amount,
  CASE 
    WHEN r.status = 'approved' THEN 'approved'
    WHEN r.status IN ('receipt_under_review', 'receipt_uploaded') THEN 'under_review'
    WHEN r.status = 'payment_rejected' THEN 'rejected'
    ELSE 'pending'
  END,
  COALESCE(r.payment_receipt_url, ''),
  r.created_at,
  NOW()
FROM b2f_sales_requests r
JOIN b2f_invoices i ON i.request_id = r.id
WHERE (
  r.payment_receipt_url IS NOT NULL 
  OR r.status IN ('receipt_under_review', 'receipt_uploaded', 'approved', 'payment_rejected')
)
AND NOT EXISTS (
  SELECT 1 FROM b2f_payment_transactions t WHERE t.sales_request_id = r.id
);

-- ========================================
-- 3. تحديث حالات الطلبات لضمان التوافق
-- ========================================

UPDATE b2f_sales_requests
SET status = 'receipt_under_review'
WHERE payment_receipt_url IS NOT NULL 
  AND status NOT IN ('approved', 'payment_rejected', 'receipt_under_review', 'receipt_uploaded');

UPDATE b2f_sales_requests
SET ready_for_contract = true
WHERE status = 'approved' 
  AND (ready_for_contract IS NULL OR ready_for_contract = false);
