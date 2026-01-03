/*
  # تبسيط دالة approve_payment_document - إزالة الإشعارات
  
  المشكلة:
  - نظام الإشعارات معقد ويسبب أخطاء constraint
  - الوظيفة الأساسية هي اعتماد السداد فقط
  
  الحل:
  - حذف جزء الإشعارات بالكامل
  - التركيز على الوظيفة الأساسية فقط:
    1. تحديث حالة المستند المالي
    2. تحديث حالة الطلب
    3. التسجيل في سجل العمليات المالية
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
  v_investor_name TEXT;
  v_investor_phone TEXT;
  v_total_amount NUMERIC;
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
  RETURNING sales_request_id INTO v_request_id;

  -- التحقق من وجود الطلب
  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'لم يتم العثور على الطلب المرتبط بهذا المستند'
    );
  END IF;

  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_approved',
    payment_status = 'payment_approved',
    finance_status = 'approved_for_contract',
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = v_request_id
  RETURNING investor_name, investor_phone, total_amount
  INTO v_investor_name, v_investor_phone, v_total_amount;

  -- تسجيل في سجل العمليات المالية
  INSERT INTO b2f_financial_operations_log (
    sales_request_id,
    operation_type,
    operation_description,
    amount,
    performed_by,
    metadata,
    created_at
  ) VALUES (
    v_request_id,
    'payment_approved',
    'تم اعتماد السداد من قبل: ' || p_approved_by,
    v_total_amount,
    p_approved_by,
    jsonb_build_object(
      'payment_document_id', p_document_id,
      'approved_by', p_approved_by,
      'investor_name', v_investor_name,
      'investor_phone', v_investor_phone
    ),
    NOW()
  );

  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'investor_name', v_investor_name,
    'message', 'تم اعتماد السداد - الطلب جاهز لإصدار العقد من قسم العقود'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- دالة لرفض المستند المالي (مبسطة)
CREATE OR REPLACE FUNCTION reject_payment_document(
  p_document_id UUID,
  p_rejection_reason TEXT,
  p_rejected_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_investor_name TEXT;
  v_investor_phone TEXT;
  v_total_amount NUMERIC;
BEGIN
  -- تحديث حالة المستند
  UPDATE b2f_payment_documents
  SET 
    finance_status = 'rejected',
    staff_decision = 'rejected',
    rejection_reason = p_rejection_reason,
    staff_notes = 'تم الرفض من قبل: ' || p_rejected_by || ' - السبب: ' || p_rejection_reason,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;

  -- التحقق من وجود الطلب
  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'لم يتم العثور على الطلب المرتبط بهذا المستند'
    );
  END IF;

  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_rejected',
    payment_status = 'payment_rejected',
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = v_request_id
  RETURNING investor_name, investor_phone, total_amount
  INTO v_investor_name, v_investor_phone, v_total_amount;

  -- تسجيل في سجل العمليات المالية
  INSERT INTO b2f_financial_operations_log (
    sales_request_id,
    operation_type,
    operation_description,
    amount,
    performed_by,
    metadata,
    created_at
  ) VALUES (
    v_request_id,
    'payment_rejected',
    'تم رفض السداد من قبل: ' || p_rejected_by || ' - السبب: ' || p_rejection_reason,
    v_total_amount,
    p_rejected_by,
    jsonb_build_object(
      'payment_document_id', p_document_id,
      'rejected_by', p_rejected_by,
      'rejection_reason', p_rejection_reason,
      'investor_name', v_investor_name,
      'investor_phone', v_investor_phone
    ),
    NOW()
  );

  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'investor_name', v_investor_name,
    'message', 'تم رفض السداد'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION approve_payment_document(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reject_payment_document(UUID, TEXT, TEXT) TO authenticated, anon;