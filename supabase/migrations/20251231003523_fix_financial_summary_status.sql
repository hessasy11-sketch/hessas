/*
  # تحديث دالة الملخص المالي لاستخدام الحالات الصحيحة

  1. التغييرات
    - استخدام حقل status بدلاً من payment_status للإحصائيات
    - دعم الحالات: payment_open, receipt_uploaded, receipt_approved

  2. الحالات المدعومة
    - payment_open: جاهز للدفع
    - receipt_uploaded: تم رفع الإيصال
    - receipt_under_review: قيد المراجعة
    - receipt_approved: معتمد ومدفوع
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_investor_financial_summary(text);

-- إنشاء الدالة المحدثة
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
    COUNT(*) FILTER (WHERE status IN ('receipt_approved', 'transferred_to_operations'))::bigint as approved_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('receipt_approved', 'transferred_to_operations')), 0)::numeric as approved_amount,
    COUNT(*) FILTER (WHERE status IN ('receipt_uploaded', 'receipt_under_review'))::bigint as pending_review_count,
    COUNT(*) FILTER (WHERE status IN ('payment_open', 'receipt_rejected'))::bigint as pending_payment_count
  FROM b2f_sales_requests
  WHERE investor_phone = p_investor_phone;
END;
$$;

-- السماح للجميع باستدعاء الدالة
GRANT EXECUTE ON FUNCTION get_investor_financial_summary(text) TO anon, authenticated;

-- Comment
COMMENT ON FUNCTION get_investor_financial_summary IS 
'يجلب ملخصاً مالياً شاملاً لمستثمر معين حسب رقم الهاتف - محدث للعمل مع الحالات الجديدة';
