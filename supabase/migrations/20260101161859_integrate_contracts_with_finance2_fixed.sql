/*
  # ربط قسم العقود مع نظام مالية 2 - النظام الموحد المصحح
  
  ## المسار الجديد:
  1. المبيعات → إصدار فاتورة (b2f_sales_requests + b2f_payment_documents)
  2. المستثمر → رفع إيصال السداد
  3. مالية 2 → اعتماد السداد (finance_status = 'manually_approved')
  4. قسم العقود → إصدار العقد من الطلبات الجاهزة
*/

-- 1. تحديث جدول b2f_contracts لحفظ معلومات مالية 2
ALTER TABLE b2f_contracts 
ADD COLUMN IF NOT EXISTS payment_document_id UUID REFERENCES b2f_payment_documents(id);

-- 2. إنشاء view للطلبات الجاهزة لإصدار العقد
CREATE OR REPLACE VIEW v_contracts_ready_for_issuance AS
SELECT 
  r.id as request_id,
  r.investor_name,
  r.investor_phone,
  r.investor_email,
  r.investor_account_id,
  r.farm_id,
  f.name as farm_name,
  f.city,
  f.location as region,
  f.location_url,
  r.opportunity_id,
  o.title as opportunity_title,
  o.tree_type as opportunity_tree_type,
  o.contract_duration_years,
  r.number_of_trees,
  r.total_amount,
  r.tree_type as request_tree_type,
  -- معلومات الدفع من مالية 2
  pd.id as payment_document_id,
  pd.document_url as receipt_url,
  pd.finance_status,
  pd.amount_detected,
  pd.amount_expected,
  pd.ai_confidence,
  pd.staff_decision,
  pd.staff_notes,
  pd.reviewed_by,
  pd.reviewed_at,
  -- تواريخ
  r.created_at as request_date,
  pd.created_at as payment_uploaded_at,
  pd.reviewed_at as payment_approved_at
FROM b2f_sales_requests r
INNER JOIN b2f_payment_documents pd ON r.id = pd.sales_request_id
LEFT JOIN b2f_farms f ON r.farm_id = f.id
LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
WHERE 
  -- السداد معتمد من مالية 2
  pd.finance_status = 'manually_approved'
  AND pd.staff_decision = 'approved'
  -- الطلب جاهز لإصدار العقد
  AND r.status IN ('receipt_approved', 'payment_confirmed')
  AND r.payment_status = 'payment_approved'
  AND r.finance_status = 'approved_for_contract'
  -- لم يصدر له عقد بعد
  AND (r.contract_issued = false OR r.contract_issued IS NULL)
ORDER BY pd.reviewed_at DESC;

-- 3. دالة جديدة لإصدار العقد من قسم العقود (معتمدة على مالية 2 فقط)
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
  
  -- 5. إنشاء العقد
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    payment_document_id,
    investor_phone,
    investor_name,
    farm_id,
    farm_name,
    opportunity_id,
    trees_count,
    tree_type,
    amount_total,
    contract_type,
    start_date,
    end_date,
    duration_months,
    status,
    operation_status,
    auto_issued,
    created_at
  ) VALUES (
    v_contract_number,
    p_request_id,
    v_payment_doc.id,
    v_request.investor_phone,
    v_request.investor_name,
    v_request.farm_id,
    v_farm.name,
    v_request.opportunity_id,
    v_request.number_of_trees,
    COALESCE(v_opportunity.tree_type, v_request.tree_type, 'غير محدد'),
    v_request.total_amount,
    'investment',
    CURRENT_DATE,
    CURRENT_DATE + (v_duration_months || ' months')::INTERVAL,
    v_duration_months,
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
  
  -- 7. إنشاء سجل في التشغيل
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
    amount,
    performed_by,
    metadata
  ) VALUES (
    p_request_id,
    'contract_issued',
    'تم إصدار العقد رقم: ' || v_contract_number || ' من قسم العقود',
    v_request.total_amount,
    p_issued_by,
    jsonb_build_object(
      'contract_id', v_contract_id,
      'contract_number', v_contract_number,
      'operation_id', v_operation_id,
      'payment_document_id', v_payment_doc.id,
      'source', 'contracts_section'
    )
  );
  
  -- 9. إرسال إشعار للمستثمر
  INSERT INTO b2f_notifications (
    investor_phone,
    title,
    message,
    notification_type,
    is_read
  ) VALUES (
    v_request.investor_phone,
    'تم إصدار عقدك',
    'رقم العقد: ' || v_contract_number || ' - يمكنك الآن الاطلاع على التفاصيل من حسابك',
    'contract_issued',
    false
  );
  
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

-- 4. دالة للحصول على عدد الطلبات الجاهزة لإصدار العقد
CREATE OR REPLACE FUNCTION get_contracts_ready_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM v_contracts_ready_for_issuance;
$$;

-- 5. RLS policies
GRANT SELECT ON v_contracts_ready_for_issuance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION issue_contract_from_finance2(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contracts_ready_count() TO authenticated, anon;

-- 6. تعليق على الدوال القديمة لتجنب استخدامها
COMMENT ON FUNCTION auto_issue_contract_on_approval IS 'DEPRECATED: لا تستخدم هذه الدالة. استخدم issue_contract_from_finance2 بدلاً منها';
COMMENT ON FUNCTION issue_contract IS 'DEPRECATED: لا تستخدم هذه الدالة. استخدم issue_contract_from_finance2 بدلاً منها';