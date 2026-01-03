/*
  # إنشاء Views لنظام مالية 2

  ## Views المطلوبة
  1. v_payments_under_review - المدفوعات قيد المراجعة
  2. v_invoices_summary - ملخص الفواتير
*/

-- ========================================
-- 1. View للمدفوعات قيد المراجعة
-- ========================================

CREATE OR REPLACE VIEW v_payments_under_review AS
SELECT 
  t.id as transaction_id,
  t.transaction_number,
  i.id as invoice_id,
  i.invoice_number,
  r.id as request_id,
  r.investor_name,
  r.investor_phone,
  r.investor_email,
  f.name as farm_name,
  r.number_of_trees,
  r.tree_type,
  t.amount,
  COALESCE(NULLIF(t.receipt_url, ''), r.payment_receipt_url) as receipt_url,
  t.created_at as receipt_uploaded_at,
  t.status as transaction_status,
  i.status as invoice_status,
  r.status as request_status
FROM b2f_payment_transactions t
JOIN b2f_invoices i ON t.invoice_id = i.id
JOIN b2f_sales_requests r ON t.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE t.status = 'under_review'
ORDER BY t.created_at DESC;

-- ========================================
-- 2. View لملخص الفواتير
-- ========================================

CREATE OR REPLACE VIEW v_invoices_summary AS
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  i.status as invoice_status,
  i.amount,
  r.id as request_id,
  r.investor_name,
  r.investor_phone,
  r.number_of_trees,
  r.tree_type,
  f.name as farm_name,
  i.issued_at,
  i.updated_at,
  COALESCE(
    (SELECT COUNT(*) 
     FROM b2f_payment_transactions 
     WHERE invoice_id = i.id AND status = 'under_review'),
    0
  ) as pending_transactions_count
FROM b2f_invoices i
JOIN b2f_sales_requests r ON i.request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
ORDER BY i.created_at DESC;

-- منح الصلاحيات
GRANT SELECT ON v_payments_under_review TO authenticated, anon;
GRANT SELECT ON v_invoices_summary TO authenticated, anon;
