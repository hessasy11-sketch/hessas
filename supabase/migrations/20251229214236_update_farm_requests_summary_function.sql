/*
  # تحديث function إحصائيات طلبات المزرعة

  ## التغييرات
  1. تحديث function get_farm_requests_summary لاستخدام الحالات الجديدة
  2. استبدال الحالات القديمة بالحالات الجديدة في نظام المجموعات

  ## الحالات الجديدة
  - pending (بدلاً من new)
  - waiting_in_group (جديدة)
  - payment_open (بدلاً من awaiting_payment)
  - receipt_uploaded_ai_review (بدلاً من payment_uploaded)
  - receipt_approved_pending_invoice (بدلاً من payment_verified)
  - invoice_issued (جديدة)
  - contract_issued (بدلاً من contract_ready)
  - operational (بدلاً من transferred_to_operations)
*/

-- حذف Function القديمة
DROP FUNCTION IF EXISTS get_farm_requests_summary(uuid);

-- إنشاء Function جديدة بالحالات المحدثة
CREATE OR REPLACE FUNCTION get_farm_requests_summary(p_farm_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'waiting_in_group', COUNT(*) FILTER (WHERE status = 'waiting_in_group'),
    'group_full_pending_payment', COUNT(*) FILTER (WHERE status = 'group_full_pending_payment'),
    'payment_open', COUNT(*) FILTER (WHERE status = 'payment_open'),
    'receipt_uploaded_ai_review', COUNT(*) FILTER (WHERE status = 'receipt_uploaded_ai_review'),
    'receipt_duplicate_financial_review', COUNT(*) FILTER (WHERE status = 'receipt_duplicate_financial_review'),
    'receipt_approved_pending_invoice', COUNT(*) FILTER (WHERE status = 'receipt_approved_pending_invoice'),
    'invoice_issued', COUNT(*) FILTER (WHERE status = 'invoice_issued'),
    'contract_issued', COUNT(*) FILTER (WHERE status = 'contract_issued'),
    'operational', COUNT(*) FILTER (WHERE status = 'operational')
  )
  INTO v_result
  FROM b2f_investment_requests
  WHERE farm_id = p_farm_id;

  RETURN v_result;
END;
$$;
