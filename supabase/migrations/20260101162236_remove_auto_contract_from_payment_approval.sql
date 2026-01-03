/*
  # إزالة الإصدار التلقائي للعقد من دالة اعتماد السداد
  
  الآن العقود تُصدر فقط يدوياً من قسم العقود بعد اعتماد السداد.
*/

CREATE OR REPLACE FUNCTION approve_payment_document(
  p_document_id UUID,
  p_approved_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_invoice_id UUID;
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
  RETURNING sales_request_id, invoice_id INTO v_request_id, v_invoice_id;

  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_approved',
    payment_status = 'payment_approved',
    finance_status = 'approved_for_contract',
    updated_at = NOW()
  WHERE id = v_request_id;

  -- تحديث حالة الفاتورة إذا كانت موجودة
  IF v_invoice_id IS NOT NULL THEN
    UPDATE b2f_sales_invoices
    SET 
      payment_status = 'paid',
      paid_at = NOW(),
      updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;

  -- ملاحظة: لا يتم إصدار العقد تلقائياً
  -- العقد يُصدر يدوياً من قسم العقود باستخدام issue_contract_from_finance2()

  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'invoice_id', v_invoice_id,
    'message', 'تم اعتماد السداد - الطلب جاهز لإصدار العقد من قسم العقود'
  );
END;
$$;