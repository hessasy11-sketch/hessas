/*
  # نظام إصدار العقود التلقائي الكامل - النسخة الجديدة
  
  العقد يصدر تلقائياً عند الاعتماد المالي
*/

-- إضافة حقول جديدة للعقود
ALTER TABLE b2f_contracts
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_issued BOOLEAN DEFAULT false;

-- 1. دالة إصدار العقد التلقائي الشامل
CREATE OR REPLACE FUNCTION auto_issue_contract_on_approval(request_id UUID)
RETURNS JSON AS $$
DECLARE
  request_record RECORD;
  new_contract_id UUID;
  contract_num TEXT;
  new_operation_id UUID;
  result JSON;
BEGIN
  -- جلب بيانات الطلب الكاملة
  SELECT 
    sr.*,
    op.id as opp_id,
    op.farm_id as opp_farm_id,
    op.title as opportunity_title,
    COALESCE(op.contract_duration_years, 5) as duration_years,
    f.name as farm_name,
    f.location as farm_location
  INTO request_record
  FROM b2f_sales_requests sr
  LEFT JOIN b2f_opportunities op ON sr.opportunity_id = op.id
  LEFT JOIN b2f_farms f ON op.farm_id = f.id
  WHERE sr.id = request_id
    AND sr.finance_status = 'approved_for_contract'
    AND sr.contract_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو غير مؤهل'
    );
  END IF;
  
  -- توليد رقم العقد
  contract_num := generate_contract_number();
  
  -- إنشاء العقد
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    investor_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    end_date,
    status,
    operation_status,
    auto_issued,
    pdf_generated
  ) VALUES (
    contract_num,
    request_record.id,
    request_record.investor_account_id,
    request_record.investor_phone,
    request_record.opp_farm_id,
    request_record.opp_id,
    request_record.number_of_trees,
    request_record.total_amount,
    'investment',
    NOW(),
    NOW() + (request_record.duration_years || ' years')::INTERVAL,
    'active',
    'pending_start',
    true,
    false
  )
  RETURNING id INTO new_contract_id;
  
  -- تحديث الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_id = new_contract_id,
    contract_issued = true,
    contract_issued_at = NOW(),
    ready_for_operations = true,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- إنشاء أمر تشغيل
  BEGIN
    INSERT INTO b2f_operations_orders (
      contract_id,
      farm_id,
      investor_phone,
      status,
      created_at
    ) VALUES (
      new_contract_id,
      request_record.opp_farm_id,
      request_record.investor_phone,
      'pending_start',
      NOW()
    )
    RETURNING id INTO new_operation_id;
  EXCEPTION WHEN undefined_table THEN
    new_operation_id := NULL;
  END;
  
  -- إرسال إشعار
  INSERT INTO b2f_notifications (
    investor_phone,
    type,
    title,
    message,
    is_read,
    created_at
  ) VALUES (
    request_record.investor_phone,
    'contract_issued',
    'تم إصدار عقد استثمارك',
    'تم إصدار عقد استثمارك رقم ' || contract_num || ' بنجاح. يمكنك تحميله الآن من تبويب (عقودي).',
    false,
    NOW()
  );
  
  result := json_build_object(
    'success', true,
    'contract_id', new_contract_id,
    'contract_number', contract_num,
    'operation_id', new_operation_id
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. دالة الاعتماد المالي الجديدة (تصدر العقد تلقائياً)
CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id UUID)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
  contract_result JSON;
BEGIN
  -- جلب الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'approved',
    payment_status = 'payment_approved',
    finance_status = 'approved_for_contract',
    ready_for_contract = true,
    finance_reviewed = true,
    finance_reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = request_id;
  
  -- إصدار العقد تلقائياً
  contract_result := auto_issue_contract_on_approval(request_id);
  
  IF (contract_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'تم اعتماد الإيصال وإصدار العقد تلقائياً',
      'contract_number', contract_result->>'contract_number',
      'contract_id', contract_result->>'contract_id',
      'auto_issued', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'تم اعتماد الإيصال لكن فشل إصدار العقد',
      'error', contract_result->>'error'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION auto_issue_contract_on_approval TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manually_approve_receipt TO anon, authenticated;

COMMENT ON FUNCTION auto_issue_contract_on_approval(UUID) IS 'إصدار عقد تلقائي عند اعتماد المالية - يشمل: إنشاء العقد + أمر تشغيل + إشعار';
COMMENT ON FUNCTION manually_approve_receipt(UUID) IS 'اعتماد إيصال مالي وإصدار عقد تلقائياً في خطوة واحدة';
