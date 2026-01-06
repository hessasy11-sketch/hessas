/*
  # اختبار نظام أحداث ولادة المزرعة - النهائي
  
  ## الاختبار
  1. إنشاء عقد جديد بحالة 'active' → حدث تلقائي
  2. تحديث عقد إلى 'active' → حدث تلقائي
  
  ## النتيجة المتوقعة
  ✅ حدثين في farm_birth_events
  ✅ كل حدث مرتبط بعقد ومزرعة ومستثمر
*/

DO $$
DECLARE
  v_farm_id uuid;
  v_contract_id_1 uuid;
  v_contract_id_2 uuid;
  v_event_count integer;
  v_contract_number_1 text;
  v_contract_number_2 text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'اختبار نظام ولادة المزرعة - المرحلة 1';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- الحصول على مزرعة موجودة
  SELECT id INTO v_farm_id
  FROM b2f_farms
  LIMIT 1;
  
  -- إذا لم توجد مزرعة، ننشئ واحدة
  IF v_farm_id IS NULL THEN
    INSERT INTO b2f_farms (name, location, city, operational_status)
    VALUES ('مزرعة النخيل الذهبية', 'طريق الملك عبدالعزيز', 'الرياض', 'active')
    RETURNING id INTO v_farm_id;
    
    RAISE NOTICE '✅ تم إنشاء مزرعة اختبار: %', v_farm_id;
  ELSE
    RAISE NOTICE '✅ استخدام مزرعة موجودة: %', v_farm_id;
  END IF;
  
  RAISE NOTICE '';
  
  -- توليد أرقام عقود فريدة
  v_contract_number_1 := 'TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-01';
  v_contract_number_2 := 'TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-02';
  
  -- =====================================================
  -- اختبار 1: إنشاء عقد جديد بحالة 'active'
  -- =====================================================
  RAISE NOTICE '--- الاختبار 1: إنشاء عقد نشط مباشرة ---';
  
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
    v_contract_number_1,
    '0501234567',
    v_farm_id,
    10,
    10,
    50000.00,
    50000.00,
    1,
    'tree_lease',
    'active',  -- ← نقطة الولادة!
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months'
  )
  RETURNING id INTO v_contract_id_1;
  
  RAISE NOTICE '✅ تم إنشاء العقد الأول: %', v_contract_number_1;
  RAISE NOTICE '   ID: %', v_contract_id_1;
  RAISE NOTICE '   الحالة: active (نشط)';
  RAISE NOTICE '';
  
  -- انتظار قصير للـ trigger
  PERFORM pg_sleep(0.5);
  
  -- =====================================================
  -- اختبار 2: إنشاء عقد بحالة غير نشطة ثم تفعيله
  -- =====================================================
  RAISE NOTICE '--- الاختبار 2: تحويل عقد إلى نشط ---';
  
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
    v_contract_number_2,
    '0507654321',
    v_farm_id,
    5,
    5,
    25000.00,
    25000.00,
    1,
    'tree_lease',
    'archived',  -- ← ليس نشطاً
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months'
  )
  RETURNING id INTO v_contract_id_2;
  
  RAISE NOTICE '✅ تم إنشاء العقد الثاني: %', v_contract_number_2;
  RAISE NOTICE '   ID: %', v_contract_id_2;
  RAISE NOTICE '   الحالة الأولية: archived (مؤرشف)';
  
  -- الآن نقوم بتفعيل العقد
  UPDATE b2f_contracts
  SET status = 'active'  -- ← نقطة الولادة!
  WHERE id = v_contract_id_2;
  
  RAISE NOTICE '✅ تم تحديث الحالة: archived → active';
  RAISE NOTICE '';
  
  -- انتظار قصير للـ trigger
  PERFORM pg_sleep(0.5);
  
  -- =====================================================
  -- التحقق من النتائج
  -- =====================================================
  RAISE NOTICE '--- النتائج ---';
  
  SELECT COUNT(*)
  INTO v_event_count
  FROM farm_birth_events
  WHERE contract_id IN (v_contract_id_1, v_contract_id_2);
  
  IF v_event_count = 2 THEN
    RAISE NOTICE '✅ نجح الاختبار: تم إنشاء % أحداث ولادة', v_event_count;
  ELSIF v_event_count = 0 THEN
    RAISE NOTICE '❌ فشل الاختبار: لم يتم إنشاء أي أحداث!';
  ELSE
    RAISE NOTICE '⚠️ اختبار جزئي: تم إنشاء % حدث فقط (متوقع: 2)', v_event_count;
  END IF;
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- عرض تفاصيل الأحداث
  -- =====================================================
  IF v_event_count > 0 THEN
    RAISE NOTICE '--- تفاصيل أحداث الولادة ---';
    
    DECLARE
      v_event RECORD;
      v_counter integer := 1;
    BEGIN
      FOR v_event IN
        SELECT *
        FROM farm_birth_events
        WHERE contract_id IN (v_contract_id_1, v_contract_id_2)
        ORDER BY created_at
      LOOP
        RAISE NOTICE '';
        RAISE NOTICE 'حدث %:', v_counter;
        RAISE NOTICE '  - نوع الحدث: %', v_event.event_type;
        RAISE NOTICE '  - رقم العقد: %', v_event.contract_number;
        RAISE NOTICE '  - اسم المزرعة: %', v_event.farm_name;
        RAISE NOTICE '  - عدد الأشجار: %', v_event.trees_count;
        RAISE NOTICE '  - هاتف المستثمر: %', v_event.investor_phone;
        RAISE NOTICE '  - وقت الإنشاء: %', v_event.created_at;
        
        v_counter := v_counter + 1;
      END LOOP;
    END;
    
    RAISE NOTICE '';
  END IF;
  
  -- =====================================================
  -- عرض الإحصائيات الشاملة
  -- =====================================================
  RAISE NOTICE '--- الإحصائيات الشاملة ---';
  
  DECLARE
    v_stats json;
  BEGIN
    SELECT get_farm_birth_stats() INTO v_stats;
    
    RAISE NOTICE 'إجمالي الولادات: %', (v_stats->>'total_births')::integer;
    RAISE NOTICE 'الولادات اليوم: %', (v_stats->>'births_today')::integer;
    RAISE NOTICE 'الولادات هذا الأسبوع: %', (v_stats->>'births_this_week')::integer;
    RAISE NOTICE 'الولادات هذا الشهر: %', (v_stats->>'births_this_month')::integer;
    RAISE NOTICE 'إجمالي الأشجار: %', (v_stats->>'total_trees')::integer;
    RAISE NOTICE 'المزارع المفعلة: %', (v_stats->>'farms_activated')::integer;
    RAISE NOTICE 'المستثمرين الفريدين: %', (v_stats->>'unique_investors')::integer;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'انتهى الاختبار';
  RAISE NOTICE '========================================';
  
END $$;
