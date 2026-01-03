/*
  # إصلاح الأعمدة الغامضة في دالة الملخص المالي

  ## المشكلة:
  - total_amount يتعارض بين اسم العمود المُرجع واسم الحقل في الجدول
  - نفس المشكلة مع الحقول الأخرى

  ## الحل:
  - استخدام اسم مستعار للجدول (r) لتمييز الأعمدة
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_investor_financial_summary(text);

-- إنشاء الدالة بأسماء أعمدة واضحة
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
    COUNT(*)::bigint,
    COALESCE(SUM(r.total_amount), 0)::numeric,
    COUNT(*) FILTER (WHERE r.status IN ('receipt_approved', 'contract_issued', 'transferred_to_operations'))::bigint,
    COALESCE(SUM(r.total_amount) FILTER (WHERE r.status IN ('receipt_approved', 'contract_issued', 'transferred_to_operations')), 0)::numeric,
    COUNT(*) FILTER (WHERE r.status IN ('receipt_uploaded', 'receipt_under_review'))::bigint,
    COUNT(*) FILTER (WHERE r.status IN ('payment_open', 'receipt_rejected'))::bigint
  FROM b2f_sales_requests r
  WHERE r.investor_phone = p_investor_phone;
END;
$$;

-- السماح للجميع باستدعاء الدالة
GRANT EXECUTE ON FUNCTION get_investor_financial_summary(text) TO anon, authenticated;

COMMENT ON FUNCTION get_investor_financial_summary IS 'يجلب ملخصاً مالياً للمستثمر';
