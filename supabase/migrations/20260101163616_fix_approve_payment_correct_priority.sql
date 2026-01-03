/*
  # إصلاح دالة approve_payment_document - استخدام priority الصحيح
  
  المشكلة:
  - priority = 'high' غير مسموح
  - القيم المسموحة: 'normal', 'important', 'urgent'
  
  الحل: استخدام 'important' بدلاً من 'high'
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
  v_investor_account_id UUID;
  v_investor_name TEXT;
  v_investor_phone TEXT;
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

  -- تحديث حالة الطلب والحصول على معلومات المستثمر
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_approved',
    payment_status = 'payment_approved',
    finance_status = 'approved_for_contract',
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = v_request_id
  RETURNING investor_account_id, investor_name, investor_phone 
  INTO v_investor_account_id, v_investor_name, v_investor_phone;

  -- إرسال إشعار للمستثمر إذا كان لديه حساب
  IF v_investor_account_id IS NOT NULL THEN
    INSERT INTO b2f_notifications (
      investor_account_id,
      title,
      message,
      type,
      priority,
      is_read,
      created_at
    ) VALUES (
      v_investor_account_id,
      'تم اعتماد السداد ✅',
      'تم اعتماد سدادك من قبل الإدارة المالية. سيتم إصدار عقدك قريباً.',
      'payment',
      'important',
      false,
      NOW()
    );
  END IF;

  -- تسجيل في سجل العمليات المالية
  INSERT INTO b2f_financial_operations_log (
    sales_request_id,
    operation_type,
    operation_description,
    amount,
    performed_by,
    metadata,
    created_at
  )
  SELECT
    v_request_id,
    'payment_approved',
    'تم اعتماد السداد من قبل: ' || p_approved_by,
    total_amount,
    p_approved_by,
    jsonb_build_object(
      'payment_document_id', p_document_id,
      'approved_by', p_approved_by,
      'investor_name', v_investor_name,
      'investor_phone', v_investor_phone
    ),
    NOW()
  FROM b2f_sales_requests
  WHERE id = v_request_id;

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

-- دالة لرفض المستند المالي
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
  v_investor_account_id UUID;
  v_investor_name TEXT;
  v_investor_phone TEXT;
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

  -- تحديث حالة الطلب والحصول على معلومات المستثمر
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_rejected',
    payment_status = 'payment_rejected',
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = v_request_id
  RETURNING investor_account_id, investor_name, investor_phone 
  INTO v_investor_account_id, v_investor_name, v_investor_phone;

  -- إرسال إشعار للمستثمر إذا كان لديه حساب
  IF v_investor_account_id IS NOT NULL THEN
    INSERT INTO b2f_notifications (
      investor_account_id,
      title,
      message,
      type,
      priority,
      is_read,
      created_at
    ) VALUES (
      v_investor_account_id,
      'تم رفض الإيصال ❌',
      'تم رفض الإيصال المرفوع. السبب: ' || p_rejection_reason || '. يرجى رفع إيصال صحيح.',
      'payment',
      'urgent',
      false,
      NOW()
    );
  END IF;

  -- تسجيل في سجل العمليات المالية
  INSERT INTO b2f_financial_operations_log (
    sales_request_id,
    operation_type,
    operation_description,
    amount,
    performed_by,
    metadata,
    created_at
  )
  SELECT
    v_request_id,
    'payment_rejected',
    'تم رفض السداد من قبل: ' || p_rejected_by || ' - السبب: ' || p_rejection_reason,
    total_amount,
    p_rejected_by,
    jsonb_build_object(
      'payment_document_id', p_document_id,
      'rejected_by', p_rejected_by,
      'rejection_reason', p_rejection_reason,
      'investor_name', v_investor_name,
      'investor_phone', v_investor_phone
    ),
    NOW()
  FROM b2f_sales_requests
  WHERE id = v_request_id;

  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'investor_name', v_investor_name,
    'message', 'تم رفض السداد وإرسال إشعار للمستثمر'
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