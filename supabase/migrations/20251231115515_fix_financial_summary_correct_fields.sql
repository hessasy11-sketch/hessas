/*
  # إصلاح دالة الملخص المالي - الحقول والحالات الصحيحة

  ## المشكلة:
  - الدالة تستخدم payment_status لكن الحقل الفعلي اسمه status
  - الدالة تستخدم حالات خاطئة

  ## الإصلاح:
  - استخدام status بدلاً من payment_status
  - استخدام الحالات الصحيحة من b2f_sales_requests
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_investor_financial_summary(text);

-- إنشاء الدالة بالحقول الصحيحة
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
    -- إجمالي عدد الطلبات
    COUNT(*)::bigint as total_requests_count,

    -- إجمالي المبالغ
    COALESCE(SUM(total_amount), 0)::numeric as total_amount,

    -- عدد الطلبات المعتمدة (الدفع تم اعتماده أو بعد ذلك)
    COUNT(*) FILTER (
      WHERE status IN ('receipt_approved', 'contract_issued', 'transferred_to_operations')
    )::bigint as approved_count,

    -- مجموع المبالغ المعتمدة
    COALESCE(
      SUM(total_amount) FILTER (
        WHERE status IN ('receipt_approved', 'contract_issued', 'transferred_to_operations')
      ),
      0
    )::numeric as approved_amount,

    -- عدد الطلبات قيد المراجعة
    COUNT(*) FILTER (
      WHERE status IN ('receipt_uploaded', 'receipt_under_review')
    )::bigint as pending_review_count,

    -- عدد الطلبات في انتظار الدفع (لم يرفع إيصال أو تم رفضه)
    COUNT(*) FILTER (
      WHERE status IN ('payment_open', 'receipt_rejected')
    )::bigint as pending_payment_count

  FROM b2f_sales_requests
  WHERE investor_phone = p_investor_phone;
END;
$$;

-- السماح للجميع باستدعاء الدالة
GRANT EXECUTE ON FUNCTION get_investor_financial_summary(text) TO anon, authenticated;

-- تعليق توضيحي
COMMENT ON FUNCTION get_investor_financial_summary IS
'يجلب ملخصاً مالياً شاملاً للمستثمر';
