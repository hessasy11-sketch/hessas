/*
  # التطبيق الجذري: توحيد منطق المبيعات والفواتير والمدفوعات

  ## المشكلة
  - يوجد نظامان متناقضان:
    1. النظام القديم: b2f_invoices + b2f_payment_transactions (8 فواتير، 8 معاملات)
    2. النظام الجديد: b2f_payment_documents (فارغ تماماً)
  - الواجهة الأمامية تستخدم النظامين بشكل متناقض
  
  ## الحل الجذري
  1. حذف النظام القديم بالكامل (b2f_invoices, b2f_payment_transactions)
  2. الاعتماد فقط على b2f_payment_documents
  3. إنشاء Views جديدة تعمل مع b2f_payment_documents
  4. المنطق الجديد:
     - قسم المبيعات: الطلبات فقط (لا فواتير أو مدفوعات)
     - فواتير الاستثمار: تُنشأ فقط عند رفع إيصال
     - المدفوعات والتحصيل: فقط الإيصالات المرفوعة
*/

-- ========================================
-- 1. حذف النظام القديم بالكامل
-- ========================================

-- حذف Views القديمة أولاً
DROP VIEW IF EXISTS v_payments_under_review CASCADE;
DROP VIEW IF EXISTS v_invoices_summary CASCADE;
DROP VIEW IF EXISTS v_sales_requests CASCADE;

-- حذف الجداول القديمة
DROP TABLE IF EXISTS b2f_payment_transactions CASCADE;
DROP TABLE IF EXISTS b2f_invoices CASCADE;

-- ========================================
-- 2. إنشاء View لقسم المبيعات (الطلبات فقط)
-- ========================================

CREATE OR REPLACE VIEW v_b2f_sales_requests AS
SELECT 
  r.id as request_id,
  r.investor_name,
  r.investor_phone,
  r.investor_email,
  r.number_of_trees,
  r.tree_type,
  r.total_amount,
  r.status,
  r.created_at,
  r.updated_at,
  r.payment_opened_at,
  f.name as farm_name,
  f.id as farm_id,
  o.title as opportunity_title,
  o.id as opportunity_id,
  -- التحقق من وجود إيصال
  CASE WHEN EXISTS (
    SELECT 1 FROM b2f_payment_documents 
    WHERE sales_request_id = r.id
  ) THEN true ELSE false END as has_receipt
FROM b2f_sales_requests r
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
ORDER BY r.created_at DESC;

-- ========================================
-- 3. إنشاء View لفواتير الاستثمار
-- (فقط الطلبات التي تم رفع إيصالات لها)
-- ========================================

CREATE OR REPLACE VIEW v_b2f_investment_invoices AS
SELECT 
  r.id as request_id,
  r.investor_name,
  r.investor_phone,
  r.investor_email,
  r.number_of_trees,
  r.tree_type,
  r.total_amount,
  r.status as request_status,
  r.created_at as request_created_at,
  f.name as farm_name,
  f.id as farm_id,
  o.title as opportunity_title,
  pd.id as payment_document_id,
  pd.finance_status,
  pd.document_url as receipt_url,
  pd.amount_detected,
  pd.ai_confidence,
  pd.ai_decision,
  pd.staff_decision,
  pd.created_at as receipt_uploaded_at,
  pd.reviewed_at,
  pd.reviewed_by
FROM b2f_sales_requests r
INNER JOIN b2f_payment_documents pd ON r.id = pd.sales_request_id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
ORDER BY pd.created_at DESC;

-- ========================================
-- 4. إنشاء View للمدفوعات قيد المراجعة
-- (فقط الإيصالات المرفوعة والتي في حالة pending_review)
-- ========================================

CREATE OR REPLACE VIEW v_b2f_payments_under_review AS
SELECT 
  pd.id as payment_document_id,
  pd.sales_request_id as request_id,
  pd.document_url as receipt_url,
  pd.finance_status,
  pd.amount_expected,
  pd.amount_detected,
  pd.ai_confidence,
  pd.ai_decision,
  pd.ai_analysis_notes,
  pd.created_at as uploaded_at,
  pd.updated_at,
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
FROM b2f_payment_documents pd
INNER JOIN b2f_sales_requests r ON pd.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
WHERE pd.finance_status = 'pending_review'
ORDER BY pd.created_at DESC;

-- ========================================
-- 5. إنشاء View للمدفوعات المعتمدة
-- ========================================

CREATE OR REPLACE VIEW v_b2f_approved_payments AS
SELECT 
  pd.id as payment_document_id,
  pd.sales_request_id as request_id,
  pd.document_url as receipt_url,
  pd.finance_status,
  pd.amount_expected,
  pd.amount_detected,
  pd.reviewed_at,
  pd.reviewed_by,
  pd.staff_decision,
  pd.staff_notes,
  r.investor_name,
  r.investor_phone,
  r.number_of_trees,
  r.tree_type,
  r.total_amount,
  r.status as request_status,
  f.name as farm_name
FROM b2f_payment_documents pd
INNER JOIN b2f_sales_requests r ON pd.sales_request_id = r.id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE pd.finance_status IN ('manually_approved', 'auto_approved', 'approved_for_contract')
ORDER BY pd.reviewed_at DESC;

-- ========================================
-- 6. منح الصلاحيات
-- ========================================

GRANT SELECT ON v_b2f_sales_requests TO authenticated, anon;
GRANT SELECT ON v_b2f_investment_invoices TO authenticated, anon;
GRANT SELECT ON v_b2f_payments_under_review TO authenticated, anon;
GRANT SELECT ON v_b2f_approved_payments TO authenticated, anon;

-- ========================================
-- 7. إنشاء Functions لاعتماد ورفض الإيصالات
-- ========================================

-- Function لاعتماد الإيصال
CREATE OR REPLACE FUNCTION approve_payment_document(
  p_document_id UUID,
  p_approved_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- تحديث حالة المستند
  UPDATE b2f_payment_documents
  SET 
    finance_status = 'manually_approved',
    staff_decision = 'approved',
    staff_notes = 'تم الاعتماد من قبل ' || p_approved_by,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;
  
  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_approved',
    updated_at = NOW()
  WHERE id = v_request_id;
  
  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function لرفض الإيصال
CREATE OR REPLACE FUNCTION reject_payment_document(
  p_document_id UUID,
  p_rejection_reason TEXT,
  p_rejected_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- تحديث حالة المستند
  UPDATE b2f_payment_documents
  SET 
    finance_status = 'rejected_final',
    staff_decision = 'rejected',
    staff_notes = p_rejection_reason,
    rejection_reason = p_rejection_reason,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;
  
  -- إعادة الطلب لحالة payment_open ليرفع المستثمر إيصال جديد
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    updated_at = NOW()
  WHERE id = v_request_id;
  
  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات للـ Functions
GRANT EXECUTE ON FUNCTION approve_payment_document TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reject_payment_document TO authenticated, anon;
