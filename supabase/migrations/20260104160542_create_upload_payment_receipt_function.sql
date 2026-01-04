/*
  # إنشاء دالة upload_payment_receipt

  1. الغرض:
    - تسجيل إيصال الدفع المرفوع في جدول b2f_payment_receipts
    - تحديث حالة طلب البيع إلى receipt_under_review
    - إرجاع معلومات النجاح

  2. المعاملات:
    - p_sales_request_id: معرف طلب البيع
    - p_receipt_url: رابط الإيصال المرفوع
*/

CREATE OR REPLACE FUNCTION upload_payment_receipt(
  p_sales_request_id UUID,
  p_receipt_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt_id UUID;
  v_result JSONB;
BEGIN
  -- التحقق من وجود طلب البيع
  IF NOT EXISTS (SELECT 1 FROM b2f_sales_requests WHERE id = p_sales_request_id) THEN
    RAISE EXCEPTION 'طلب البيع غير موجود';
  END IF;

  -- إنشاء سجل الإيصال
  INSERT INTO b2f_payment_receipts (
    sales_request_id,
    receipt_url,
    uploaded_at
  ) VALUES (
    p_sales_request_id,
    p_receipt_url,
    NOW()
  )
  RETURNING id INTO v_receipt_id;

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
    'receipt_id', v_receipt_id,
    'message', 'تم رفع الإيصال بنجاح، وهو الآن قيد المراجعة في قسم المدفوعات والتحصيل'
  );

  RETURN v_result;
END;
$$;