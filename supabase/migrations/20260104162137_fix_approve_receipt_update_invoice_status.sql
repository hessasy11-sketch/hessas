/*
  # إصلاح دالة اعتماد الإيصال لتحديث حالة الفاتورة

  1. التعديلات
    - تحديث دالة approve_receipt لتحديث حالة الفاتورة عند اعتماد الإيصال
*/

-- تحديث دالة اعتماد الإيصال
CREATE OR REPLACE FUNCTION approve_receipt(
  receipt_uuid UUID,
  staff_comment_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- تحديث الإيصال
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'approved',
    staff_comment = staff_comment_text,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = receipt_uuid
  RETURNING sales_request_id INTO v_request_id;

  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_approved',
    approved_at = now(),
    updated_at = now()
  WHERE id = v_request_id;

  -- تحديث حالة الفاتورة
  UPDATE b2f_invoices
  SET 
    status = 'paid',
    paid_at = now(),
    notes = COALESCE(notes || ' - ', '') || 'تم اعتماد الإيصال وتأكيد السداد',
    updated_at = now()
  WHERE sales_request_id = v_request_id
  AND status = 'issued_pending_payment';
END;
$$;