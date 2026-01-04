/*
  # إنشاء دالة الملخص المالي للمستثمر

  ## الوظيفة
  - حساب إجمالي المبالغ من جميع الطلبات
  - حساب المبالغ المدفوعة المؤكدة
  - عدد الطلبات قيد المراجعة
  - عدد الطلبات في انتظار الدفع
  
  ## التحديث اللحظي
  - تقرأ البيانات مباشرة من b2f_sales_requests
  - تستخدم الحالات الصحيحة للمعاملات
*/

CREATE OR REPLACE FUNCTION get_investor_financial_summary(p_investor_phone TEXT)
RETURNS TABLE (
  total_requests_count BIGINT,
  total_amount NUMERIC,
  approved_count BIGINT,
  approved_amount NUMERIC,
  pending_review_count BIGINT,
  pending_payment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- إجمالي عدد الطلبات
    COUNT(*)::BIGINT as total_requests_count,
    
    -- إجمالي المبالغ
    COALESCE(SUM(total_amount), 0) as total_amount,
    
    -- عدد الطلبات المدفوعة المؤكدة
    COUNT(*) FILTER (WHERE status IN (
      'receipt_approved',
      'contract_issued',
      'transferred_to_operations'
    ))::BIGINT as approved_count,
    
    -- مجموع المبالغ المدفوعة المؤكدة
    COALESCE(SUM(total_amount) FILTER (WHERE status IN (
      'receipt_approved',
      'contract_issued',
      'transferred_to_operations'
    )), 0) as approved_amount,
    
    -- عدد الطلبات قيد المراجعة
    COUNT(*) FILTER (WHERE status IN (
      'receipt_uploaded',
      'receipt_under_review'
    ))::BIGINT as pending_review_count,
    
    -- عدد الطلبات في انتظار الدفع
    COUNT(*) FILTER (WHERE status IN (
      'collection_queue',
      'payment_open',
      'receipt_needs_revision',
      'receipt_approved_pending_invoice',
      'invoice_issued'
    ))::BIGINT as pending_payment_count
  FROM b2f_sales_requests
  WHERE investor_phone = p_investor_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_investor_financial_summary TO authenticated, anon;

-- تعليقات للتوثيق
COMMENT ON FUNCTION get_investor_financial_summary IS 'يحسب الملخص المالي الكامل للمستثمر بشكل لحظي';
