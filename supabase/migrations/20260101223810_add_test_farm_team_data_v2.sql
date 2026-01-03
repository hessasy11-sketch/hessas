/*
  # إضافة بيانات اختبار لفريق المزارع (نسخة محدثة)

  إضافة بيانات تجريبية لاختبار نظام المشرفين والمدراء
*/

-- إضافة مدير ومشرف لأول مزرعة موجودة
DO $$
DECLARE
  v_farm_id UUID;
BEGIN
  -- الحصول على أول مزرعة موجودة
  SELECT id INTO v_farm_id
  FROM b2f_farms
  LIMIT 1;

  -- إذا وجدت مزرعة، أضف فريق العمل
  IF v_farm_id IS NOT NULL THEN
    -- إضافة مدير المزرعة (بدون user_id للاختبار)
    INSERT INTO farm_team_members (
      farm_id,
      role,
      full_name,
      email,
      phone,
      is_active,
      assigned_at
    ) VALUES (
      v_farm_id,
      'farm_manager',
      'أحمد المدير',
      'manager@example.com',
      '+966500000001',
      true,
      NOW()
    ) ON CONFLICT DO NOTHING;

    -- إضافة مشرف تشغيلي
    INSERT INTO farm_team_members (
      farm_id,
      role,
      full_name,
      email,
      phone,
      is_active,
      assigned_at
    ) VALUES (
      v_farm_id,
      'farm_supervisor',
      'علي المشرف',
      'supervisor@example.com',
      '+966500000002',
      true,
      NOW()
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'تم إضافة فريق عمل للمزرعة: %', v_farm_id;
    
    -- إضافة مهام تجريبية
    INSERT INTO farm_tasks (
      farm_id,
      type,
      title,
      description,
      priority,
      status,
      assigned_to_name,
      created_by_name,
      due_date
    ) VALUES 
    (
      v_farm_id,
      'irrigation',
      'ري القطاع الشمالي',
      'ري جميع الأشجار في القطاع الشمالي من المزرعة',
      'high',
      'new',
      'علي المشرف',
      'أحمد المدير',
      NOW() + INTERVAL '2 days'
    ),
    (
      v_farm_id,
      'fertilization',
      'تسميد الأشجار الصغيرة',
      'تسميد جميع الأشجار التي عمرها أقل من 3 سنوات',
      'medium',
      'new',
      'علي المشرف',
      'أحمد المدير',
      NOW() + INTERVAL '3 days'
    ),
    (
      v_farm_id,
      'maintenance',
      'صيانة نظام الري',
      'فحص وصيانة جميع خطوط الري الرئيسية',
      'urgent',
      'new',
      'علي المشرف',
      'أحمد المدير',
      NOW() + INTERVAL '1 day'
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'تم إضافة 3 مهام تجريبية';
  ELSE
    RAISE NOTICE 'لا توجد مزارع في النظام';
  END IF;
END $$;

-- التحقق من النتائج
DO $$
DECLARE
  v_team_count INTEGER;
  v_tasks_count INTEGER;
  v_farm_name TEXT;
BEGIN
  SELECT COUNT(*) INTO v_team_count FROM farm_team_members;
  SELECT COUNT(*) INTO v_tasks_count FROM farm_tasks;
  SELECT name INTO v_farm_name FROM b2f_farms LIMIT 1;
  
  RAISE NOTICE '============================';
  RAISE NOTICE 'نتائج الإضافة:';
  RAISE NOTICE 'عدد أعضاء الفريق: %', v_team_count;
  RAISE NOTICE 'عدد المهام: %', v_tasks_count;
  RAISE NOTICE 'اسم المزرعة: %', COALESCE(v_farm_name, 'لا توجد مزارع');
  RAISE NOTICE '============================';
END $$;