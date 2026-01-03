/*
  # إصلاح دالة الاعتماد اليدوي

  تحديث الدالة لتتوافق مع بنية جدول b2f_contracts الصحيحة
*/

CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id uuid)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
  contract_id uuid;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- تحديث الحالة
  UPDATE b2f_sales_requests
  SET 
    status = 'approved',
    finance_reviewed = true,
    finance_reviewed_at = NOW(),
    contract_issued = true,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- إصدار العقد (بدون حقول غير موجودة)
  INSERT INTO b2f_contracts (
    sales_request_id,
    farm_id,
    opportunity_id,
    created_at
  )
  VALUES (
    request_record.id,
    request_record.farm_id,
    request_record.opportunity_id,
    NOW()
  )
  ON CONFLICT (sales_request_id) DO NOTHING
  RETURNING id INTO contract_id;
  
  -- إرسال إشعار
  INSERT INTO b2f_notifications (
    type,
    title,
    message,
    investor_phone,
    sales_request_id,
    is_read,
    created_at
  )
  VALUES (
    'contract_issued',
    'تم إصدار عقدك',
    'تم اعتماد دفعتك وإصدار العقد الخاص بك. يمكنك الآن الاطلاع عليه من قسم عقودي.',
    request_record.investor_phone,
    request_id,
    false,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', contract_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
