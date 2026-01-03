/*
  # إصلاح دالة upload_payment_receipt - تصحيح أسماء الأعمدة

  ## التصحيح
  - استخدام الأسماء الصحيحة للأعمدة من جدول b2f_payment_documents
  - amount_expected بدلاً من expected_amount
  - إزالة investor_name و investor_phone (غير موجودين في الجدول)
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS upload_payment_receipt(UUID, TEXT);

-- إنشاء الدالة المصححة
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
  v_farm_id UUID;
  v_opportunity_id UUID;
  v_result JSONB;
BEGIN
  -- التحقق من وجود طلب البيع والحصول على البيانات
  SELECT total_amount, farm_id, opportunity_id
  INTO v_amount, v_farm_id, v_opportunity_id
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
    amount_expected,
    farm_id,
    opportunity_id,
    finance_status,
    operation_type
  ) VALUES (
    p_sales_request_id,
    'payment_receipt',
    p_receipt_url,
    v_amount,
    v_farm_id,
    v_opportunity_id,
    'pending_review',
    'tree_investment'
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