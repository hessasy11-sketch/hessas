/*
  # دالة الاعتماد الأبسط والأكثر موثوقية

  بدون ON CONFLICT - فقط insert بسيط
*/

CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id uuid)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
  contract_id uuid;
  contract_num text;
  existing_contract_id uuid;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- التحقق من وجود عقد مسبقاً
  SELECT id INTO existing_contract_id
  FROM b2f_contracts
  WHERE sales_request_id = request_id
  LIMIT 1;
  
  -- توليد رقم عقد إذا لم يكن موجوداً
  IF existing_contract_id IS NULL THEN
    contract_num := 'B2F-' || LPAD((SELECT COUNT(*) + 1 FROM b2f_contracts)::text, 6, '0');
    
    -- إصدار العقد
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
      COALESCE(request_record.number_of_trees, 1),
      request_record.total_amount,
      'tree_investment',
      NOW(),
      'active',
      NOW()
    )
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
  ELSE
    contract_id := existing_contract_id;
    contract_num := (SELECT contract_number FROM b2f_contracts WHERE id = existing_contract_id);
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
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', contract_id,
    'contract_number', contract_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح صلاحيات
GRANT EXECUTE ON FUNCTION manually_approve_receipt TO anon, authenticated;
