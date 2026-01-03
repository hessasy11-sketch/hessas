/*
  # الإصلاح النهائي لدالة الاعتماد

  تصحيح أسماء الحقول بناءً على البنية الفعلية
*/

CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id uuid)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
  contract_id uuid;
  contract_num text;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- توليد رقم عقد
  contract_num := 'B2F-' || LPAD((SELECT COUNT(*) + 1 FROM b2f_contracts)::text, 6, '0');
  
  -- تحديث الحالة
  UPDATE b2f_sales_requests
  SET 
    status = 'approved',
    finance_reviewed = true,
    finance_reviewed_at = NOW(),
    contract_issued = true,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- إصدار العقد (باستخدام الحقول الموجودة)
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    status,
    created_at
  )
  VALUES (
    contract_num,
    request_record.id,
    request_record.investor_phone,
    request_record.farm_id,
    request_record.opportunity_id,
    COALESCE(request_record.tree_count, 1), -- استخدام tree_count أو قيمة افتراضية
    request_record.total_amount,
    'tree_investment',
    NOW(),
    'active',
    NOW()
  )
  ON CONFLICT (sales_request_id) DO UPDATE
  SET updated_at = NOW()
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
    'تم اعتماد دفعتك وإصدار العقد رقم ' || contract_num || '. يمكنك الآن الاطلاع عليه من قسم عقودي.',
    request_record.investor_phone,
    request_id,
    false,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', contract_id,
    'contract_number', contract_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
