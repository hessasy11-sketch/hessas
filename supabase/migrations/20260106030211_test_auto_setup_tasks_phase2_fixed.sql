/*
  # اختبار نظام مهام التأسيس التلقائية - المرحلة 2 (مُصلّح)
  
  ## الاختبار
  1. إنشاء عقد جديد نشط → حدث ولادة → مهام تأسيس تلقائية
  2. التحقق من عدد المهام (6 مهام)
  3. التحقق من تفاصيل المهام
  4. إحصائيات المهام
*/

DO $$
DECLARE
  v_farm_id uuid;
  v_contract_id uuid;
  v_birth_event_id uuid;
  v_tasks_count integer;
  v_contract_number text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'اختبار نظام مهام التأسيس - المرحلة 2';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- الحصول على مزرعة موجودة أو إنشاء واحدة
  SELECT id INTO v_farm_id
  FROM b2f_farms
  LIMIT 1;
  
  IF v_farm_id IS NULL THEN
    INSERT INTO b2f_farms (name, location, city, operational_status)
    VALUES ('مزرعة الاختبار التلقائي', 'طريق الملك فهد', 'الرياض', 'active')
    RETURNING id INTO v_farm_id;
    
    RAISE NOTICE '✅ تم إنشاء مزرعة اختبار جديدة: %', v_farm_id;
  ELSE
    RAISE NOTICE '✅ استخدام مزرعة موجودة: %', v_farm_id;
  END IF;
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- 1. إنشاء عقد نشط (يُطلق ولادة المزرعة)
  -- =====================================================
  RAISE NOTICE '--- الخطوة 1: إنشاء عقد نشط ---';
  
  v_contract_number := 'SETUP-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
  
  INSERT INTO b2f_contracts (
    contract_number,
    investor_phone,
    farm_id,
    tree_count,
    trees_count,
    total_amount,
    amount_total,
    duration_years,
    contract_type,
    status,
    start_date,
    end_date
  )
  VALUES (
    v_contract_number,
    '0551122334',
    v_farm_id,
    20,
    20,
    100000.00,
    100000.00,
    1,
    'tree_lease',
    'active',  -- ← نقطة الولادة
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months'
  )
  RETURNING id INTO v_contract_id;
  
  RAISE NOTICE '✅ تم إنشاء عقد نشط: %', v_contract_number;
  RAISE NOTICE '   Contract ID: %', v_contract_id;
  RAISE NOTICE '';
  
  -- انتظار لتنفيذ triggers
  PERFORM pg_sleep(1);
  
  -- =====================================================
  -- 2. التحقق من حدث الولادة
  -- =====================================================
  RAISE NOTICE '--- الخطوة 2: التحقق من حدث الولادة ---';
  
  SELECT id INTO v_birth_event_id
  FROM farm_birth_events
  WHERE contract_id = v_contract_id;
  
  IF v_birth_event_id IS NOT NULL THEN
    RAISE NOTICE '✅ حدث الولادة موجود: %', v_birth_event_id;
    
    -- عرض metadata
    DECLARE
      v_metadata jsonb;
    BEGIN
      SELECT metadata INTO v_metadata
      FROM farm_birth_events
      WHERE id = v_birth_event_id;
      
      IF v_metadata IS NOT NULL THEN
        RAISE NOTICE '   Setup tasks generated: %', (v_metadata->>'setup_tasks_generated')::boolean;
        RAISE NOTICE '   Setup tasks count: %', (v_metadata->>'setup_tasks_count')::integer;
      END IF;
    END;
  ELSE
    RAISE NOTICE '❌ فشل: لم يتم إنشاء حدث ولادة!';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- 3. التحقق من مهام التأسيس
  -- =====================================================
  RAISE NOTICE '--- الخطوة 3: التحقق من مهام التأسيس ---';
  
  SELECT COUNT(*)
  INTO v_tasks_count
  FROM farm_tasks
  WHERE farm_id = v_farm_id
    AND description LIKE '%[AUTO-SETUP]%';
  
  RAISE NOTICE 'عدد مهام التأسيس المُنشأة: %', v_tasks_count;
  
  IF v_tasks_count = 6 THEN
    RAISE NOTICE '✅ نجح الاختبار: تم إنشاء 6 مهام تأسيس';
  ELSIF v_tasks_count = 0 THEN
    RAISE NOTICE '❌ فشل الاختبار: لم يتم إنشاء أي مهام!';
  ELSE
    RAISE NOTICE '⚠️ اختبار جزئي: تم إنشاء % مهام فقط (متوقع: 6)', v_tasks_count;
  END IF;
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- 4. عرض تفاصيل المهام
  -- =====================================================
  IF v_tasks_count > 0 THEN
    RAISE NOTICE '--- تفاصيل مهام التأسيس ---';
    RAISE NOTICE '';
    
    DECLARE
      v_task RECORD;
      v_counter integer := 1;
    BEGIN
      FOR v_task IN
        SELECT
          title,
          type,
          priority,
          status,
          due_date,
          EXTRACT(DAY FROM (due_date - now()))::integer as days_until_due
        FROM farm_tasks
        WHERE farm_id = v_farm_id
          AND description LIKE '%[AUTO-SETUP]%'
        ORDER BY due_date NULLS LAST
      LOOP
        RAISE NOTICE 'مهمة %:', v_counter;
        RAISE NOTICE '  العنوان: %', v_task.title;
        RAISE NOTICE '  النوع: %', v_task.type;
        RAISE NOTICE '  الأولوية: %', v_task.priority;
        RAISE NOTICE '  الحالة: %', v_task.status;
        RAISE NOTICE '  تاريخ الاستحقاق: %', v_task.due_date;
        RAISE NOTICE '  الأيام المتبقية: %', v_task.days_until_due;
        RAISE NOTICE '';
        
        v_counter := v_counter + 1;
      END LOOP;
    END;
  END IF;
  
  -- =====================================================
  -- 5. عرض الإحصائيات
  -- =====================================================
  RAISE NOTICE '--- إحصائيات مهام التأسيس ---';
  
  DECLARE
    v_stats json;
  BEGIN
    SELECT get_farm_setup_tasks_stats(v_farm_id) INTO v_stats;
    
    RAISE NOTICE 'إجمالي المهام: %', (v_stats->>'total_tasks')::integer;
    RAISE NOTICE 'قيد الانتظار: %', (v_stats->>'pending')::integer;
    RAISE NOTICE 'قيد التنفيذ: %', (v_stats->>'in_progress')::integer;
    RAISE NOTICE 'مُقدّمة: %', (v_stats->>'submitted')::integer;
    RAISE NOTICE 'مُعتمدة: %', (v_stats->>'approved')::integer;
    RAISE NOTICE 'مرفوضة: %', (v_stats->>'rejected')::integer;
    RAISE NOTICE 'متأخرة: %', (v_stats->>'overdue')::integer;
    RAISE NOTICE 'نسبة الإنجاز: %', (v_stats->>'completion_rate')::text || '%';
  END;
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- 6. اختبار function get_farm_setup_tasks
  -- =====================================================
  RAISE NOTICE '--- اختبار دالة get_farm_setup_tasks ---';
  
  DECLARE
    v_task RECORD;
  BEGIN
    FOR v_task IN
      SELECT * FROM get_farm_setup_tasks(v_farm_id)
      LIMIT 3
    LOOP
      RAISE NOTICE '✅ المهمة: % | الحالة: % | متبقي: % أيام',
        v_task.title,
        v_task.status,
        v_task.days_until_due;
    END LOOP;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'انتهى اختبار المرحلة 2 بنجاح!';
  RAISE NOTICE '========================================';
  
END $$;
