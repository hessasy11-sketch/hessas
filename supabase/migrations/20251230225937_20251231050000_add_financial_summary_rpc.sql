/*
  # دالة RPC للملخص المالي للمستثمر
  
  ## التغييرات:
  
  1. دالة get_investor_financial_summary
     - تحسب عدد الطلبات الكلي
     - تحسب المبلغ الكلي
     - تحسب الطلبات المعتمدة والمبالغ
     - تحسب الطلبات قيد المراجعة
     - تحسب الطلبات بانتظار السداد
*/

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_investor_financial_summary(text);

-- إنشاء الدالة
CREATE OR REPLACE FUNCTION get_investor_financial_summary(p_investor_phone text)
RETURNS TABLE (
  total_requests_count bigint,
  total_amount numeric,
  approved_count bigint,
  approved_amount numeric,
  pending_review_count bigint,
  pending_payment_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_requests_count,
    COALESCE(SUM(total_amount), 0)::numeric as total_amount,
    COUNT(*) FILTER (WHERE payment_status = 'payment_approved')::bigint as approved_count,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'payment_approved'), 0)::numeric as approved_amount,
    COUNT(*) FILTER (WHERE payment_status = 'payment_submitted')::bigint as pending_review_count,
    COUNT(*) FILTER (WHERE payment_status IN ('pending_payment', 'payment_rejected'))::bigint as pending_payment_count
  FROM b2f_sales_requests
  WHERE investor_phone = p_investor_phone;
END;
$$;

-- السماح للجميع باستدعاء الدالة
GRANT EXECUTE ON FUNCTION get_investor_financial_summary(text) TO anon, authenticated;

-- Comment
COMMENT ON FUNCTION get_investor_financial_summary IS 
'يجلب ملخصاً مالياً شاملاً لمستثمر معين حسب رقم الهاتف';
