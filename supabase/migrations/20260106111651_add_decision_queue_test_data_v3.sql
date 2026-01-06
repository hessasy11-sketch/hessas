/*
  # إضافة بيانات اختبار لـ Decision Queue - V3

  1. Test Data
    - Creates sample decisions for all 4 types
    - Tests permission boundaries (small/large expenses)
    - Tests all priority levels
    - Links to existing farms and staff

  2. Test Scenarios
    - Small expense (3,500 SAR) - b2f_assistant can approve
    - Large expense (12,000 SAR) - only super_admin can approve
    - Manager change request - only super_admin
    - Visit request - farm_manager can approve
*/

DO $$
DECLARE
  v_test_farm_id uuid;
  v_gm_id uuid;
  v_gm_user_id uuid;
  v_test_expense_id uuid;
  v_team_exists boolean;
BEGIN
  -- احصل على المدير العام
  SELECT id, user_id INTO v_gm_id, v_gm_user_id
  FROM platform_staff
  WHERE role = 'super_admin'
  LIMIT 1;

  IF v_gm_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مدير عام في النظام';
  END IF;

  -- احصل على مزرعة تجريبية أو أنشئ واحدة
  SELECT id INTO v_test_farm_id
  FROM b2f_farms
  WHERE name LIKE '%تجريبية%' OR name LIKE '%Decision Queue%'
  LIMIT 1;

  IF v_test_farm_id IS NULL THEN
    -- أنشئ مزرعة تجريبية
    INSERT INTO b2f_farms (
      name,
      location,
      size_hectares,
      farm_manager_id,
      status,
      description
    ) VALUES (
      'مزرعة النخيل التجريبية - Decision Queue',
      'الرياض',
      50.0,
      v_gm_id,
      'active',
      'مزرعة للاختبار - Decision Queue System'
    )
    RETURNING id INTO v_test_farm_id;

    RAISE NOTICE 'تم إنشاء مزرعة تجريبية: %', v_test_farm_id;
  END IF;

  -- تأكد أن GM في فريق المزرعة (بدور manager)
  SELECT EXISTS(
    SELECT 1 FROM farm_team
    WHERE farm_id = v_test_farm_id
      AND user_id = v_gm_user_id
      AND is_active = true
  ) INTO v_team_exists;

  IF NOT v_team_exists AND v_gm_user_id IS NOT NULL THEN
    INSERT INTO farm_team (farm_id, user_id, role, is_active)
    VALUES (v_test_farm_id, v_gm_user_id, 'manager', true);
    RAISE NOTICE 'تم إضافة GM لفريق المزرعة';
  END IF;

  -- ===============================
  -- Test 1: Small Expense (3,500 SAR)
  -- Expected: b2f_assistant OR super_admin can approve
  -- ===============================

  INSERT INTO farm_expenses (
    farm_id,
    category,
    amount,
    description,
    approval_status,
    requested_by,
    created_at
  ) VALUES (
    v_test_farm_id,
    'equipment',
    3500.00,
    'شراء أدوات ري حديثة',
    'pending',
    v_gm_id,
    now() - interval '2 hours'
  )
  RETURNING id INTO v_test_expense_id;

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    expense_amount,
    expense_description,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes,
    created_at
  ) VALUES (
    'approve_expense',
    v_test_farm_id,
    3500.00,
    'شراء أدوات ري حديثة',
    jsonb_build_object(
      'expense_id', v_test_expense_id,
      'category', 'equipment'
    ),
    'pending',
    'normal',
    v_gm_id,
    ARRAY['super_admin', 'b2f_assistant']::text[],
    'اختبار: مصروف صغير - يمكن لمساعد B2F الموافقة',
    now() - interval '2 hours'
  );

  RAISE NOTICE 'Test 1 ✓ قرار مصروف صغير (3,500 ر.س)';

  -- ===============================
  -- Test 2: Large Expense (12,000 SAR)
  -- Expected: ONLY super_admin can approve
  -- ===============================

  INSERT INTO farm_expenses (
    farm_id,
    category,
    amount,
    description,
    approval_status,
    requested_by,
    created_at
  ) VALUES (
    v_test_farm_id,
    'infrastructure',
    12000.00,
    'تركيب نظام ري ذكي متطور',
    'pending',
    v_gm_id,
    now() - interval '5 hours'
  )
  RETURNING id INTO v_test_expense_id;

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    expense_amount,
    expense_description,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes,
    created_at
  ) VALUES (
    'approve_expense',
    v_test_farm_id,
    12000.00,
    'تركيب نظام ري ذكي متطور',
    jsonb_build_object(
      'expense_id', v_test_expense_id,
      'category', 'infrastructure'
    ),
    'pending',
    'urgent',
    v_gm_id,
    ARRAY['super_admin']::text[],
    'اختبار: مصروف كبير - يتطلب موافقة المدير العام فقط',
    now() - interval '5 hours'
  );

  RAISE NOTICE 'Test 2 ✓ قرار مصروف كبير (12,000 ر.س) - عاجل';

  -- ===============================
  -- Test 3: Manager Change Request
  -- Expected: ONLY super_admin can approve
  -- ===============================

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    target_staff_id,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes,
    created_at
  ) VALUES (
    'change_farm_manager',
    v_test_farm_id,
    v_gm_id,
    jsonb_build_object(
      'current_manager_id', v_gm_id,
      'new_manager_id', v_gm_id,
      'reason', 'تغيير إداري - اختبار النظام'
    ),
    'pending',
    'high',
    v_gm_id,
    ARRAY['super_admin']::text[],
    'اختبار: تغيير مدير المزرعة - قرار حساس',
    now() - interval '3 hours'
  );

  RAISE NOTICE 'Test 3 ✓ قرار تغيير مدير مزرعة';

  -- ===============================
  -- Test 4: Visit Request
  -- Expected: farm_manager OR super_admin can approve
  -- ===============================

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes,
    created_at
  ) VALUES (
    'request_visit',
    v_test_farm_id,
    jsonb_build_object(
      'visit_date', (CURRENT_DATE + interval '7 days')::text,
      'visit_type', 'inspection',
      'visitor_name', 'مستثمر محتمل',
      'visitor_phone', '0501234567',
      'notes', 'زيارة تعريفية للمزرعة'
    ),
    'pending',
    'normal',
    v_gm_id,
    ARRAY['super_admin', 'farm_manager']::text[],
    'اختبار: طلب زيارة مزرعة',
    now() - interval '6 hours'
  );

  RAISE NOTICE 'Test 4 ✓ قرار طلب زيارة';

  -- ===============================
  -- إحصائيات النهائية
  -- ===============================

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'تم إضافة 4 قرارات تجريبية بنجاح';
  RAISE NOTICE 'المزرعة التجريبية: %', v_test_farm_id;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'للاختبار الفوري:';
  RAISE NOTICE '1. سجل دخول كـ GM';
  RAISE NOTICE '2. انتقل إلى: /admin/b2f/farm-command';
  RAISE NOTICE '3. اضغط على بطاقة "قرارات معلقة"';
  RAISE NOTICE '4. يجب أن تظهر 4 قرارات مرتبة حسب الأولوية';
  RAISE NOTICE '==========================================';

END $$;
