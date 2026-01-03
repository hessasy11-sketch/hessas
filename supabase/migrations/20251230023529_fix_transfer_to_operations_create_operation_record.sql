/*
  # إصلاح دالة تحويل الطلب للتشغيل

  ## المشكلة
  - الدالة `transfer_to_operations` تحدث فقط flag في b2f_sales_requests
  - لا تُنشئ سجل فعلي في b2f_tree_operations
  - هذا يؤدي لفصل بين العقود والتشغيل

  ## الحل
  - إعادة كتابة الدالة لإنشاء سجل في b2f_tree_operations
  - نقل جميع البيانات المطلوبة من sales_requests إلى tree_operations
  - التأكد من العلاقة بين الجدولين
*/

CREATE OR REPLACE FUNCTION transfer_to_operations(
  p_request_id uuid
)
RETURNS json AS $$
DECLARE
  v_request record;
  v_farm record;
  v_opportunity record;
  v_operation_id uuid;
  v_result json;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id
  AND status = 'contract_issued'
  AND transferred_to_operations = false;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو تم تحويله مسبقاً'
    );
  END IF;

  -- جلب بيانات المزرعة
  SELECT * INTO v_farm
  FROM b2f_farms
  WHERE id = v_request.farm_id;

  -- جلب بيانات الفرصة
  SELECT * INTO v_opportunity
  FROM b2f_opportunities
  WHERE id = v_request.opportunity_id;

  -- إنشاء سجل التشغيل في b2f_tree_operations
  INSERT INTO b2f_tree_operations (
    sales_request_id,
    contract_number,
    farm_id,
    opportunity_id,
    investor_name,
    investor_phone,
    investor_email,
    investor_account_id,
    tree_type,
    tree_count,
    current_phase,
    progress_percentage,
    contract_start_date,
    contract_end_date,
    contract_duration_years,
    total_amount,
    is_active,
    last_update_description,
    last_update_date,
    transferred_from_contracts_at
  )
  VALUES (
    v_request.id,
    v_request.contract_number,
    v_request.farm_id,
    v_request.opportunity_id,
    v_request.investor_name,
    v_request.investor_phone,
    v_request.investor_email,
    v_request.investor_account_id,
    v_request.tree_type,
    v_request.number_of_trees,
    'activation',
    10,
    COALESCE(v_request.contract_issued_at::date, CURRENT_DATE),
    COALESCE(v_request.contract_issued_at::date, CURRENT_DATE) + INTERVAL '10 years',
    10,
    v_request.total_amount,
    true,
    'تم استلام الطلب من قسم العقود وبدء التشغيل',
    now(),
    now()
  )
  RETURNING id INTO v_operation_id;

  -- تحديث حالة الطلب في sales_requests
  UPDATE b2f_sales_requests
  SET
    transferred_to_operations = true,
    transferred_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  -- إنشاء سجل تحديث أول في b2f_operation_updates
  INSERT INTO b2f_operation_updates (
    operation_id,
    update_type,
    title,
    description,
    related_phase,
    admin_name
  )
  VALUES (
    v_operation_id,
    'phase_change',
    'بدء التشغيل',
    'تم استلام الطلب من قسم العقود وتم إنشاء بطاقة تشغيلية جديدة. الأشجار في مرحلة التفعيل الأولية.',
    'activation',
    'النظام'
  );

  v_result := json_build_object(
    'success', true,
    'requestId', p_request_id,
    'operationId', v_operation_id,
    'contractNumber', v_request.contract_number,
    'transferredAt', now(),
    'message', 'تم تحويل الطلب لقسم التشغيل بنجاح'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transfer_to_operations(uuid) IS 'تحويل الطلب لقسم التشغيل مع إنشاء بطاقة تشغيلية في b2f_tree_operations';
