/*
  # إصلاح دالة upload_payment_receipt

  ## المشكلة
  - الدالة تستخدم الجداول القديمة المحذوفة (b2f_invoices, b2f_payment_transactions)
  
  ## الحل
  - إعادة كتابة الدالة لتعمل مع النظام الجديد (b2f_payment_documents)
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS upload_payment_receipt(UUID, TEXT);

-- إنشاء الدالة الجديدة
CREATE OR REPLACE FUNCTION upload_payment_receipt(
  p_sales_request_id UUID,
  p_receipt_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document_id UUID;
  v_amount NUMERIC;
  v_investor_name TEXT;
  v_investor_phone TEXT;
  v_result JSONB;
BEGIN
  -- التحقق من وجود طلب البيع
  SELECT total_amount, investor_name, investor_phone
  INTO v_amount, v_investor_name, v_investor_phone
  FROM b2f_sales_requests
  WHERE id = p_sales_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب البيع غير موجود';
  END IF;

  -- إنشاء مستند دفع جديد
  INSERT INTO b2f_payment_documents (
    sales_request_id,
    document_type,
    document_url,
    expected_amount,
    investor_name,
    investor_phone,
    finance_status
  ) VALUES (
    p_sales_request_id,
    'payment_receipt',
    p_receipt_url,
    v_amount,
    v_investor_name,
    v_investor_phone,
    'pending_review'
  )
  RETURNING id INTO v_document_id;

  -- تحديث حالة طلب البيع
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_under_review',
    payment_receipt_url = p_receipt_url,
    updated_at = NOW()
  WHERE id = p_sales_request_id;

  -- بناء النتيجة
  v_result := jsonb_build_object(
    'success', true,
    'document_id', v_document_id,
    'status', 'under_review',
    'message', 'تم رفع الإيصال بنجاح، وهو الآن قيد المراجعة'
  );

  RETURN v_result;
END;
$$;