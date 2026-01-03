/*
  # تصحيح منطق الفواتير والمدفوعات

  ## المشكلة
  - يتم إنشاء فواتير ومعاملات دفع تلقائياً لجميع الطلبات
  - يجب أن تظهر المعاملات في "المدفوعات والتحصيل" فقط عند رفع إيصال فعلي

  ## الحل
  1. حذف المعاملات التي ليس لها إيصالات فعلية
  2. حذف الفواتير التي تم إنشاؤها تلقائياً بدون سبب
  3. تعديل Views لتعرض فقط البيانات الصحيحة
*/

-- ========================================
-- 1. حذف المعاملات التي ليس لها إيصالات فعلية
-- ========================================

DELETE FROM b2f_payment_transactions
WHERE (receipt_url IS NULL OR receipt_url = '')
  AND sales_request_id IN (
    SELECT id FROM b2f_sales_requests
    WHERE payment_receipt_url IS NULL OR payment_receipt_url = ''
  );

-- ========================================
-- 2. حذف الفواتير غير المرتبطة بمعاملات دفع
-- ========================================

DELETE FROM b2f_invoices
WHERE id NOT IN (
  SELECT DISTINCT invoice_id 
  FROM b2f_payment_transactions 
  WHERE invoice_id IS NOT NULL
)
AND status IN ('unpaid', 'pending_review');

-- ========================================
-- 3. إعادة إنشاء View للمدفوعات قيد المراجعة
-- (فقط التي لديها إيصالات فعلية)
-- ========================================

DROP VIEW IF EXISTS v_payments_under_review CASCADE;

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
  r.status as request_status,
  t.updated_at
FROM b2f_payment_transactions t
JOIN b2f_invoices i ON t.invoice_id = i.id
JOIN b2f_sales_requests r ON t.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE t.status = 'under_review'
  AND (
    (t.receipt_url IS NOT NULL AND t.receipt_url != '')
    OR (r.payment_receipt_url IS NOT NULL AND r.payment_receipt_url != '')
  )
ORDER BY t.created_at DESC;

-- ========================================
-- 4. إعادة إنشاء View لملخص الفواتير
-- (فقط الفواتير المرتبطة بمعاملات فعلية)
-- ========================================

DROP VIEW IF EXISTS v_invoices_summary CASCADE;

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
     FROM b2f_payment_transactions pt
     WHERE pt.invoice_id = i.id 
       AND pt.status = 'under_review'
       AND (
         (pt.receipt_url IS NOT NULL AND pt.receipt_url != '')
         OR EXISTS (
           SELECT 1 FROM b2f_sales_requests sr 
           WHERE sr.id = pt.sales_request_id 
             AND (sr.payment_receipt_url IS NOT NULL AND sr.payment_receipt_url != '')
         )
       )
    ),
    0
  ) as pending_transactions_count
FROM b2f_invoices i
JOIN b2f_sales_requests r ON i.request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE EXISTS (
  SELECT 1 FROM b2f_payment_transactions pt
  WHERE pt.invoice_id = i.id
    AND (
      (pt.receipt_url IS NOT NULL AND pt.receipt_url != '')
      OR (r.payment_receipt_url IS NOT NULL AND r.payment_receipt_url != '')
    )
)
ORDER BY i.created_at DESC;

-- ========================================
-- 5. إنشاء View لقسم المبيعات (الطلبات فقط)
-- ========================================

DROP VIEW IF EXISTS v_sales_requests CASCADE;

CREATE OR REPLACE VIEW v_sales_requests AS
SELECT 
  r.id as request_id,
  r.investor_name,
  r.investor_phone,
  r.investor_email,
  r.number_of_trees,
  r.tree_type,
  r.total_amount,
  r.status,
  f.name as farm_name,
  o.title as opportunity_title,
  r.created_at,
  r.updated_at,
  -- التحقق من وجود فاتورة
  CASE WHEN EXISTS (
    SELECT 1 FROM b2f_invoices WHERE request_id = r.id
  ) THEN true ELSE false END as has_invoice,
  -- التحقق من وجود معاملة دفع
  CASE WHEN EXISTS (
    SELECT 1 FROM b2f_payment_transactions WHERE sales_request_id = r.id
  ) THEN true ELSE false END as has_payment
FROM b2f_sales_requests r
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
ORDER BY r.created_at DESC;

-- منح الصلاحيات
GRANT SELECT ON v_payments_under_review TO authenticated, anon;
GRANT SELECT ON v_invoices_summary TO authenticated, anon;
GRANT SELECT ON v_sales_requests TO authenticated, anon;
