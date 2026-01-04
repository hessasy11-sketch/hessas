/*
  # إنشاء Views للمدفوعات في تبويبات المالية

  ## المشكلة
  - التبويبات في قسم المالية تحاول قراءة views غير موجودة
  - الإيصالات موجودة في `b2f_payment_receipts` لكن لا توجد views لعرضها

  ## الحل
  1. إنشاء view `v_b2f_payments_under_review` للإيصالات قيد المراجعة
  2. إنشاء view `v_b2f_approved_payments` للإيصالات المعتمدة
  3. إنشاء functions لاعتماد ورفض الإيصالات
*/

-- ========================================
-- 1. View للإيصالات قيد المراجعة
-- ========================================

CREATE OR REPLACE VIEW v_b2f_payments_under_review AS
SELECT 
  pr.id as payment_document_id,
  pr.sales_request_id as request_id,
  pr.receipt_url,
  pr.staff_decision as finance_status,
  r.total_amount as amount_expected,
  NULL::numeric as amount_detected,
  pr.ai_confidence_score as ai_confidence,
  pr.ai_classification as ai_decision,
  pr.staff_comment as ai_analysis_notes,
  pr.uploaded_at,
  pr.created_at as updated_at,
  r.investor_name,
  r.investor_phone,
  r.investor_email,
  r.number_of_trees,
  r.tree_type,
  r.total_amount,
  r.status as request_status,
  f.name as farm_name,
  f.id as farm_id,
  o.title as opportunity_title
FROM b2f_payment_receipts pr
INNER JOIN b2f_sales_requests r ON pr.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
WHERE pr.staff_decision = 'pending'
ORDER BY pr.uploaded_at DESC;

-- ========================================
-- 2. View للإيصالات المعتمدة
-- ========================================

CREATE OR REPLACE VIEW v_b2f_approved_payments AS
SELECT 
  pr.id as payment_document_id,
  pr.sales_request_id as request_id,
  pr.receipt_url,
  pr.staff_decision as finance_status,
  r.total_amount as amount_expected,
  NULL::numeric as amount_detected,
  pr.reviewed_at,
  pr.reviewed_by,
  pr.staff_decision,
  pr.staff_comment as staff_notes,
  r.investor_name,
  r.investor_phone,
  r.number_of_trees,
  r.tree_type,
  r.total_amount,
  r.status as request_status,
  f.name as farm_name
FROM b2f_payment_receipts pr
INNER JOIN b2f_sales_requests r ON pr.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE pr.staff_decision = 'approved'
ORDER BY pr.reviewed_at DESC;

-- ========================================
-- 3. Function لاعتماد الإيصال
-- ========================================

CREATE OR REPLACE FUNCTION approve_payment_document(
  p_document_id UUID,
  p_approved_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
  v_invoice_id UUID;
BEGIN
  -- تحديث حالة الإيصال
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'approved',
    staff_comment = 'تم الاعتماد من قبل ' || p_approved_by,
    reviewed_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;
  
  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt not found');
  END IF;
  
  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_approved',
    updated_at = NOW()
  WHERE id = v_request_id;
  
  -- تحديث حالة الفاتورة إن وجدت
  UPDATE b2f_invoices
  SET 
    status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE sales_request_id = v_request_id
  RETURNING id INTO v_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'invoice_id', v_invoice_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. Function لرفض الإيصال
-- ========================================

CREATE OR REPLACE FUNCTION reject_payment_document(
  p_document_id UUID,
  p_rejection_reason TEXT,
  p_rejected_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- تحديث حالة الإيصال
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'rejected',
    staff_comment = p_rejection_reason,
    reviewed_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;
  
  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt not found');
  END IF;
  
  -- إعادة الطلب لحالة payment_open ليرفع المستثمر إيصال جديد
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    updated_at = NOW()
  WHERE id = v_request_id;
  
  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. منح الصلاحيات
-- ========================================

GRANT SELECT ON v_b2f_payments_under_review TO authenticated, anon;
GRANT SELECT ON v_b2f_approved_payments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION approve_payment_document TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reject_payment_document TO authenticated, anon;
