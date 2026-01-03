/*
  # اختبار شامل لنظام الباركود
  
  1. Test Cases
    - موظف بدون PIN
    - مشرف مع PIN
    - إبطال باركود
    - تعطيل موظف
    - المدير العام المؤقت
    
  2. Output
    - نتائج مفصلة لكل اختبار
*/

DO $$
DECLARE
  v_test_results jsonb := '[]'::jsonb;
  v_test_result jsonb;
  
  v_agent_profile_id uuid;
  v_agent_staff_id uuid;
  v_agent_qr text;
  
  v_supervisor_profile_id uuid;
  v_supervisor_staff_id uuid;
  v_supervisor_qr text;
  v_supervisor_pin text;
  
  v_verify_result jsonb;
  v_pin_result jsonb;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE '          اختبار شامل لنظام الباركود والصلاحيات';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- TEST 1: موظف بدون PIN (Agent)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 1: موظف بدون PIN (Agent)';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  
  v_agent_profile_id := gen_random_uuid();
  
  INSERT INTO profiles (id, phone_number, display_name, user_type)
  VALUES (v_agent_profile_id, '0512345678', 'محمد العميل', 'user')
  RETURNING id INTO v_agent_profile_id;
  
  v_agent_qr := encode(gen_random_bytes(32), 'base64');
  v_agent_qr := 'STAFF_' || replace(replace(v_agent_qr, '/', '_'), '+', '-');
  
  INSERT INTO platform_staff (
    user_id, role, department, job_title,
    qr_token, qr_is_active, requires_pin, is_active
  ) VALUES (
    v_agent_profile_id, 'agent', 'Support', 'موظف دعم',
    v_agent_qr, true, false, true
  ) RETURNING id INTO v_agent_staff_id;
  
  SELECT verify_qr_access(v_agent_qr) INTO v_verify_result;
  
  IF (v_verify_result->>'success')::boolean = true THEN
    RAISE NOTICE '✅ نجح: تم الدخول بدون PIN';
    RAISE NOTICE '   الموجه إلى: %', v_verify_result->>'redirect_to';
    v_test_result := jsonb_build_object(
      'test', 'موظف بدون PIN',
      'status', 'PASS',
      'details', v_verify_result
    );
  ELSE
    RAISE NOTICE '❌ فشل: لم يتم الدخول';
    RAISE NOTICE '   السبب: %', v_verify_result->>'reason';
    v_test_result := jsonb_build_object(
      'test', 'موظف بدون PIN',
      'status', 'FAIL',
      'reason', v_verify_result->>'reason'
    );
  END IF;
  
  v_test_results := v_test_results || v_test_result;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- TEST 2: مشرف مع PIN
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 2: مشرف مع PIN (Supervisor)';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  
  v_supervisor_profile_id := gen_random_uuid();
  v_supervisor_pin := '654321';
  
  INSERT INTO profiles (id, phone_number, display_name, user_type)
  VALUES (v_supervisor_profile_id, '0523456789', 'أحمد المشرف', 'user')
  RETURNING id INTO v_supervisor_profile_id;
  
  v_supervisor_qr := encode(gen_random_bytes(32), 'base64');
  v_supervisor_qr := 'STAFF_' || replace(replace(v_supervisor_qr, '/', '_'), '+', '-');
  
  INSERT INTO platform_staff (
    user_id, role, department, job_title,
    qr_token, qr_is_active, requires_pin, pin_code, is_active
  ) VALUES (
    v_supervisor_profile_id, 'supervisor', 'B2F', 'مشرف المزارع',
    v_supervisor_qr, true, true, crypt(v_supervisor_pin, gen_salt('bf')), true
  ) RETURNING id INTO v_supervisor_staff_id;
  
  SELECT verify_qr_access(v_supervisor_qr) INTO v_verify_result;
  
  IF (v_verify_result->>'success')::boolean = true 
     AND (v_verify_result->'staff'->>'requires_pin')::boolean = true THEN
    RAISE NOTICE '✅ نجح: QR تم التحقق منه وmust_enter_pin = true';
    
    SELECT verify_staff_pin(v_supervisor_staff_id, v_supervisor_pin) INTO v_pin_result;
    
    IF (v_pin_result->>'success')::boolean = true THEN
      RAISE NOTICE '✅ نجح: PIN صحيح، تم الدخول الكامل';
      RAISE NOTICE '   الموجه إلى: %', v_verify_result->>'redirect_to';
      v_test_result := jsonb_build_object(
        'test', 'مشرف مع PIN',
        'status', 'PASS',
        'details', jsonb_build_object(
          'qr_verified', true,
          'pin_verified', true,
          'redirect_to', v_verify_result->>'redirect_to'
        )
      );
    ELSE
      RAISE NOTICE '❌ فشل: PIN خاطئ';
      v_test_result := jsonb_build_object(
        'test', 'مشرف مع PIN',
        'status', 'FAIL',
        'reason', 'PIN verification failed'
      );
    END IF;
  ELSE
    RAISE NOTICE '❌ فشل: QR غير صحيح';
    v_test_result := jsonb_build_object(
      'test', 'مشرف مع PIN',
      'status', 'FAIL',
      'reason', v_verify_result->>'reason'
    );
  END IF;
  
  v_test_results := v_test_results || v_test_result;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- TEST 3: إبطال باركود
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 3: إبطال باركود';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  
  UPDATE platform_staff
  SET qr_is_active = false
  WHERE id = v_agent_staff_id;
  
  SELECT verify_qr_access(v_agent_qr) INTO v_verify_result;
  
  IF (v_verify_result->>'success')::boolean = false 
     AND v_verify_result->>'reason' = 'qr_inactive' THEN
    RAISE NOTICE '✅ نجح: تم منع الدخول بعد إبطال الباركود';
    RAISE NOTICE '   السبب: %', v_verify_result->>'message';
    v_test_result := jsonb_build_object(
      'test', 'إبطال باركود',
      'status', 'PASS',
      'details', 'تم منع الدخول كما متوقع'
    );
  ELSE
    RAISE NOTICE '❌ فشل: لم يتم منع الدخول';
    v_test_result := jsonb_build_object(
      'test', 'إبطال باركود',
      'status', 'FAIL',
      'reason', 'باركود مبطل سمح بالدخول'
    );
  END IF;
  
  v_test_results := v_test_results || v_test_result;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- TEST 4: تعطيل موظف (is_active = false)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 4: تعطيل موظف (is_active = false)';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  
  UPDATE platform_staff
  SET is_active = false, qr_is_active = true
  WHERE id = v_supervisor_staff_id;
  
  SELECT verify_qr_access(v_supervisor_qr) INTO v_verify_result;
  
  IF (v_verify_result->>'success')::boolean = false 
     AND v_verify_result->>'reason' = 'staff_inactive' THEN
    RAISE NOTICE '✅ نجح: تم منع الدخول للموظف المعطل';
    RAISE NOTICE '   السبب: %', v_verify_result->>'message';
    v_test_result := jsonb_build_object(
      'test', 'تعطيل موظف',
      'status', 'PASS',
      'details', 'تم منع الدخول كما متوقع'
    );
  ELSE
    RAISE NOTICE '❌ فشل: موظف معطل تمكن من الدخول';
    v_test_result := jsonb_build_object(
      'test', 'تعطيل موظف',
      'status', 'FAIL',
      'reason', 'موظف معطل سمح له بالدخول'
    );
  END IF;
  
  v_test_results := v_test_results || v_test_result;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- TEST 5: المدير العام بالباركود المؤقت
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 5: المدير العام بالباركود المؤقت';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  
  DECLARE
    v_gm_qr text;
    v_gm_staff_id uuid;
    v_check_status jsonb;
  BEGIN
    SELECT qr_token, id INTO v_gm_qr, v_gm_staff_id
    FROM platform_staff
    WHERE role = 'super_admin'
    AND is_temporary_qr = true
    LIMIT 1;
    
    IF v_gm_qr IS NULL THEN
      RAISE NOTICE '❌ فشل: لم يتم العثور على المدير العام المؤقت';
      v_test_result := jsonb_build_object(
        'test', 'المدير العام المؤقت',
        'status', 'FAIL',
        'reason', 'لا يوجد باركود مؤقت'
      );
    ELSE
      SELECT verify_qr_access(v_gm_qr) INTO v_verify_result;
      
      IF (v_verify_result->>'success')::boolean = true 
         AND (v_verify_result->'staff'->>'is_temporary_qr')::boolean = true
         AND v_verify_result->>'redirect_to' = '/hq' THEN
        RAISE NOTICE '✅ نجح: المدير العام دخل بالباركود المؤقت';
        RAISE NOTICE '   is_temporary_qr: %', v_verify_result->'staff'->>'is_temporary_qr';
        RAISE NOTICE '   redirect_to: %', v_verify_result->>'redirect_to';
        RAISE NOTICE '   يجب أن يظهر تنبيه الاستبدال في /hq';
        
        v_test_result := jsonb_build_object(
          'test', 'المدير العام المؤقت',
          'status', 'PASS',
          'details', jsonb_build_object(
            'qr_verified', true,
            'is_temporary', true,
            'redirect_to', '/hq',
            'alert_should_show', true
          )
        );
      ELSE
        RAISE NOTICE '❌ فشل: فشل دخول المدير العام';
        RAISE NOTICE '   النتيجة: %', v_verify_result;
        v_test_result := jsonb_build_object(
          'test', 'المدير العام المؤقت',
          'status', 'FAIL',
          'reason', v_verify_result
        );
      END IF;
    END IF;
  END;
  
  v_test_results := v_test_results || v_test_result;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- النتيجة النهائية
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE '                     النتيجة النهائية';
  RAISE NOTICE '═════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  DECLARE
    v_total int;
    v_passed int;
    v_failed int;
    v_result record;
  BEGIN
    v_total := jsonb_array_length(v_test_results);
    v_passed := 0;
    v_failed := 0;
    
    FOR v_result IN SELECT * FROM jsonb_array_elements(v_test_results)
    LOOP
      IF v_result.value->>'status' = 'PASS' THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '✅ %: PASS', v_result.value->>'test';
      ELSE
        v_failed := v_failed + 1;
        RAISE NOTICE '❌ %: FAIL - %', v_result.value->>'test', v_result.value->>'reason';
      END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '─────────────────────────────────────────────────────────────';
    RAISE NOTICE 'إجمالي الاختبارات: %', v_total;
    RAISE NOTICE 'نجح: % ✅', v_passed;
    RAISE NOTICE 'فشل: % ❌', v_failed;
    RAISE NOTICE '─────────────────────────────────────────────────────────────';
    
    IF v_failed = 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '🎉 تهانينا! جميع الاختبارات نجحت';
      RAISE NOTICE '✅ النظام جاهز للإنتاج';
      RAISE NOTICE '';
    ELSE
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  تحذير: بعض الاختبارات فشلت';
      RAISE NOTICE '❌ يرجى مراجعة الأخطاء قبل الإنتاج';
      RAISE NOTICE '';
    END IF;
  END;
  
  RAISE NOTICE '═════════════════════════════════════════════════════════════';

  -- تنظيف بيانات الاختبار
  DELETE FROM platform_staff WHERE id IN (v_agent_staff_id, v_supervisor_staff_id);
  DELETE FROM profiles WHERE id IN (v_agent_profile_id, v_supervisor_profile_id);
  
END $$;
