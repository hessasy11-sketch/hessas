/*
  # إنشاء حزمة صلاحيات للمدير العام (مُصلَّح)

  1. الحزمة الجديدة
    - حزمة خاصة بالمدير العام (General Manager)
    - صلاحيات كاملة على جميع اللوحات
    - يتطلب PIN للأمان
    - Landing route: /hq
    
  2. ربط المدير العام بالحزمة
    - تحديث حساب General Manager لربطه بالحزمة
    - التأكد من requires_pin = true
    
  3. الأمان
    - حماية عالية للمدير العام
    - صلاحيات Approve على جميع الأقسام
*/

-- إنشاء حزمة صلاحيات المدير العام
DO $$
DECLARE
  v_pack_id uuid;
  v_gm_staff_id uuid;
BEGIN
  -- إنشاء الحزمة
  INSERT INTO permission_packs (
    name,
    description,
    target_boards,
    requires_pin,
    session_idle_minutes,
    landing_route,
    is_active
  )
  VALUES (
    'المدير العام - صلاحيات كاملة',
    'حزمة خاصة بالمدير العام مع صلاحيات كاملة على جميع الأنظمة',
    ARRAY['b2b', 'b2f', 'hq', 'settings'],
    true, -- يتطلب PIN
    60, -- جلسة 60 دقيقة
    '/hq',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_pack_id;

  -- إذا تم إنشاء الحزمة، أضف الصلاحيات
  IF v_pack_id IS NOT NULL THEN
    -- صلاحيات B2B
    INSERT INTO pack_permissions (pack_id, board, section, access_level, actions)
    VALUES 
      (v_pack_id, 'b2b', 'المزادات', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2b', 'الطلبات', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2b', 'المالية', 'approve', ARRAY['create', 'edit', 'delete', 'export']);
    
    -- صلاحيات B2F
    INSERT INTO pack_permissions (pack_id, board, section, access_level, actions)
    VALUES 
      (v_pack_id, 'b2f', 'المزارع', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2f', 'الفرص الاستثمارية', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2f', 'الطلبات', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2f', 'العقود', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2f', 'المالية', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'b2f', 'العمليات', 'approve', ARRAY['create', 'edit', 'delete', 'export']);
    
    -- صلاحيات HQ
    INSERT INTO pack_permissions (pack_id, board, section, access_level, actions)
    VALUES 
      (v_pack_id, 'hq', 'لوحة التحكم', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'hq', 'إدارة الموظفين', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'hq', 'التقارير', 'approve', ARRAY['create', 'edit', 'delete', 'export']);
    
    -- صلاحيات Settings
    INSERT INTO pack_permissions (pack_id, board, section, access_level, actions)
    VALUES 
      (v_pack_id, 'settings', 'الإعدادات العامة', 'approve', ARRAY['create', 'edit', 'delete', 'export']),
      (v_pack_id, 'settings', 'إدارة الصلاحيات', 'approve', ARRAY['create', 'edit', 'delete', 'export']);
  ELSE
    -- إذا كانت الحزمة موجودة مسبقاً، احصل على ID
    SELECT id INTO v_pack_id
    FROM permission_packs
    WHERE name = 'المدير العام - صلاحيات كاملة'
    LIMIT 1;
  END IF;

  -- ربط المدير العام بالحزمة (استخدام phone_number بدلاً من phone)
  UPDATE platform_staff
  SET 
    pack_id = v_pack_id,
    requires_pin = true,
    pin_code = COALESCE(pin_code, '1234') -- إذا لم يكن لديه PIN، استخدم 1234 كافتراضي
  WHERE phone_number = '0500000001'
  AND role IN ('general_manager', 'super_admin')
  RETURNING id INTO v_gm_staff_id;

  -- إذا لم يُجد بـ phone_number، جرب باستخدام full_name
  IF v_gm_staff_id IS NULL THEN
    UPDATE platform_staff
    SET 
      pack_id = v_pack_id,
      requires_pin = true,
      pin_code = COALESCE(pin_code, '1234')
    WHERE full_name LIKE '%General Manager%'
    OR role IN ('general_manager', 'super_admin')
    RETURNING id INTO v_gm_staff_id;
  END IF;

  IF v_gm_staff_id IS NOT NULL THEN
    RAISE NOTICE 'تم ربط المدير العام (ID: %) بحزمة الصلاحيات (ID: %)', v_gm_staff_id, v_pack_id;
  ELSE
    RAISE NOTICE 'لم يتم العثور على المدير العام';
  END IF;
END $$;

-- التحقق من النتيجة
DO $$
DECLARE
  v_result RECORD;
BEGIN
  FOR v_result IN
    SELECT 
      ps.id,
      ps.full_name,
      ps.phone_number,
      ps.role,
      ps.pack_id,
      ps.requires_pin,
      ps.pin_code,
      pp.name as pack_name,
      pp.requires_pin as pack_requires_pin,
      pp.landing_route
    FROM platform_staff ps
    LEFT JOIN permission_packs pp ON ps.pack_id = pp.id
    WHERE ps.role IN ('general_manager', 'super_admin')
    OR ps.full_name LIKE '%General Manager%'
    LIMIT 3
  LOOP
    RAISE NOTICE '====================================';
    RAISE NOTICE 'بيانات الموظف:';
    RAISE NOTICE '- الاسم: %', v_result.full_name;
    RAISE NOTICE '- الهاتف: %', v_result.phone_number;
    RAISE NOTICE '- الدور: %', v_result.role;
    RAISE NOTICE '- Pack ID: %', v_result.pack_id;
    RAISE NOTICE '- يتطلب PIN (Staff): %', v_result.requires_pin;
    RAISE NOTICE '- PIN Code: %', v_result.pin_code;
    RAISE NOTICE '- اسم الحزمة: %', v_result.pack_name;
    RAISE NOTICE '- يتطلب PIN (Pack): %', v_result.pack_requires_pin;
    RAISE NOTICE '- Landing Route: %', v_result.landing_route;
    RAISE NOTICE '====================================';
  END LOOP;
END $$;
