/*
  # إصلاح دالة issue_contract_from_finance2 - استخدام الأعمدة الصحيحة
  
  المشكلة:
  - الدالة تحاول إدخال أعمدة غير موجودة في b2f_contracts:
    * investor_name ❌
    * farm_name ❌
    * duration_months ❌
    * tree_type ❌
  
  الحل:
  - إزالة هذه الأعمدة من INSERT في b2f_contracts
  - الاحتفاظ بها فقط في b2f_operations_orders (حيث تكون موجودة)
*/

CREATE OR REPLACE FUNCTION issue_contract_from_finance2(
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
  -- 1. التحقق من الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الطلب غير موجود'
    );
  END IF;
  
  -- التحقق من أن العقد لم يصدر مسبقاً
  IF v_request.contract_issued = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'تم إصدار عقد لهذا الطلب مسبقاً'
    );
  END IF;
  
  -- 2. التحقق من اعتماد السداد في مالية 2
  SELECT * INTO v_payment_doc
  FROM b2f_payment_documents
  WHERE sales_request_id = p_request_id
    AND finance_status = 'manually_approved'
    AND staff_decision = 'approved';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'لا يوجد سداد معتمد من مالية 2 لهذا الطلب'
    );
  END IF;
  
  -- 3. جلب بيانات المزرعة والفرصة
  SELECT * INTO v_farm
  FROM b2f_farms
  WHERE id = v_request.farm_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'المزرعة غير موجودة'
    );
  END IF;
  
  SELECT * INTO v_opportunity
  FROM b2f_opportunities
  WHERE id = v_request.opportunity_id;
  
  -- حساب مدة العقد
  v_duration_months := COALESCE(v_opportunity.contract_duration_years, 10) * 12;
  
  -- 4. توليد رقم عقد فريد
  SELECT generate_contract_number() INTO v_contract_number;
  
  -- 5. إنشاء العقد (بدون الأعمدة غير الموجودة)
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
    auto_issued,
    created_at
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
    false, -- يدوي من قسم العقود
    NOW()
  ) RETURNING id INTO v_contract_id;
  
  -- 6. تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_id = v_contract_id,
    contract_issued = true,
    contract_issued_at = NOW(),
    ready_for_operations = true,
    workflow_stage = 'operations',
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- 7. إنشاء سجل في التشغيل (هنا يمكن استخدام investor_name و farm_name)
  INSERT INTO b2f_operations_orders (
    contract_id,
    farm_id,
    investor_phone,
    contract_number,
    investor_name,
    tree_type,
    trees_count,
    farm_name,
    status,
    season_year,
    season_name
  ) VALUES (
    v_contract_id,
    v_request.farm_id,
    v_request.investor_phone,
    v_contract_number,
    v_request.investor_name,
    COALESCE(v_opportunity.tree_type, v_request.tree_type, 'غير محدد'),
    v_request.number_of_trees,
    v_farm.name,
    'ready_to_start',
    EXTRACT(YEAR FROM NOW()),
    'موسم ' || EXTRACT(YEAR FROM NOW())
  ) RETURNING id INTO v_operation_id;
  
  -- 8. تسجيل في سجل العمليات المالية
  INSERT INTO b2f_financial_operations_log (
    sales_request_id,
    operation_type,
    operation_description,
    performed_by,
    metadata
  ) VALUES (
    p_request_id,
    'contract_issued',
    'تم إصدار العقد رقم: ' || v_contract_number || ' من قسم العقود',
    p_issued_by,
    jsonb_build_object(
      'contract_id', v_contract_id,
      'contract_number', v_contract_number,
      'operation_id', v_operation_id,
      'payment_document_id', v_payment_doc.id,
      'amount', v_request.total_amount,
      'source', 'contracts_section'
    )
  );
  
  -- 9. إرسال إشعار للمستثمر (اختياري)
  BEGIN
    IF v_request.investor_account_id IS NOT NULL THEN
      INSERT INTO b2f_notifications (
        investor_account_id,
        title,
        message,
        type,
        priority,
        is_read
      ) VALUES (
        v_request.investor_account_id,
        'تم إصدار عقدك ✅',
        'رقم العقد: ' || v_contract_number || ' - يمكنك الآن الاطلاع على التفاصيل من حسابك',
        'contract',
        'important',
        false
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- تجاهل خطأ الإشعار واستمر
      NULL;
  END;
  
  -- 10. إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'operation_id', v_operation_id,
    'payment_document_id', v_payment_doc.id,
    'message', 'تم إصدار العقد بنجاح'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION issue_contract_from_finance2(UUID, TEXT) TO authenticated, anon;