/*
  # حذف وإعادة إنشاء دالة issue_contract_from_finance2 بشكل نظيف
  
  الهدف:
  - حذف الدالة القديمة تماماً
  - إنشاء نسخة جديدة بدون investor_name في b2f_contracts
*/

-- 1. حذف الدالة القديمة
DROP FUNCTION IF EXISTS issue_contract_from_finance2(UUID, TEXT);

-- 2. إنشاء الدالة الجديدة النظيفة
CREATE FUNCTION issue_contract_from_finance2(
  p_request_id UUID,
  p_issued_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_payment_doc RECORD;
  v_farm RECORD;
  v_opportunity RECORD;
  v_contract_id UUID;
  v_contract_number TEXT;
  v_operation_id UUID;
  v_duration_months INTEGER;
BEGIN
  -- جلب الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  IF v_request.contract_issued = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم إصدار عقد لهذا الطلب مسبقاً');
  END IF;
  
  -- جلب وثيقة السداد المعتمدة
  SELECT * INTO v_payment_doc
  FROM b2f_payment_documents
  WHERE sales_request_id = p_request_id
    AND finance_status = 'manually_approved'
    AND staff_decision = 'approved';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يوجد سداد معتمد');
  END IF;
  
  -- جلب المزرعة
  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_request.farm_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المزرعة غير موجودة');
  END IF;
  
  -- جلب الفرصة
  SELECT * INTO v_opportunity FROM b2f_opportunities WHERE id = v_request.opportunity_id;
  v_duration_months := COALESCE(v_opportunity.contract_duration_years, 10) * 12;
  
  -- توليد رقم العقد
  v_contract_number := 'B2F-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 10) AS INTEGER)), 0) + 1
    FROM b2f_contracts
    WHERE contract_number LIKE 'B2F-' || TO_CHAR(NOW(), 'YYYY') || '-%'
  )::TEXT, 6, '0');
  
  -- إنشاء العقد (الأعمدة الموجودة فقط)
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    payment_document_id,
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
    auto_issued
  ) VALUES (
    v_contract_number,
    p_request_id,
    v_payment_doc.id,
    v_request.investor_phone,
    v_request.farm_id,
    v_request.opportunity_id,
    v_request.number_of_trees,
    v_request.total_amount,
    'investment',
    CURRENT_DATE,
    CURRENT_DATE + (v_duration_months || ' months')::INTERVAL,
    'active',
    'pending_start',
    false
  ) RETURNING id INTO v_contract_id;
  
  -- تحديث الطلب
  UPDATE b2f_sales_requests
  SET status = 'contract_issued',
      contract_id = v_contract_id,
      contract_issued = true,
      contract_issued_at = NOW(),
      ready_for_operations = true,
      workflow_stage = 'operations',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  -- إنشاء سجل التشغيل
  INSERT INTO b2f_operations_orders (
    contract_id, farm_id, investor_phone, contract_number,
    investor_name, tree_type, trees_count, farm_name,
    status, season_year, season_name
  ) VALUES (
    v_contract_id, v_request.farm_id, v_request.investor_phone, v_contract_number,
    v_request.investor_name,
    COALESCE(v_opportunity.tree_type, v_request.tree_type, 'غير محدد'),
    v_request.number_of_trees, v_farm.name,
    'ready_to_start', EXTRACT(YEAR FROM NOW()), 'موسم ' || EXTRACT(YEAR FROM NOW())
  ) RETURNING id INTO v_operation_id;
  
  -- إشعار اختياري
  BEGIN
    IF v_request.investor_account_id IS NOT NULL THEN
      INSERT INTO b2f_notifications (investor_account_id, title, message, type, priority, is_read)
      VALUES (v_request.investor_account_id, 'تم إصدار عقدك',
              'رقم العقد: ' || v_contract_number, 'contract', 'important', false);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'operation_id', v_operation_id,
    'message', 'تم إصدار العقد بنجاح'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION issue_contract_from_finance2(UUID, TEXT) TO authenticated, anon;