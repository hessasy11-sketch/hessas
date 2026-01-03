/*
  # إضافة دوال الربط السريع للاختبار
  
  1. دوال جديدة:
    - `bind_current_user_to_supervisor()` - ربط المستخدم الحالي كمشرف
    - `bind_current_user_to_manager()` - ربط المستخدم الحالي كمدير
    - `show_my_role()` - عرض الدور الحالي
  
  2. الهدف:
    - تسهيل الاختبار وربط المستخدمين بالأدوار
*/

-- دالة ربط المستخدم الحالي كمشرف تشغيلي
CREATE OR REPLACE FUNCTION bind_current_user_to_supervisor()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_farm_id UUID;
BEGIN
  -- الحصول على المستخدم الحالي
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN '❌ يجب تسجيل الدخول أولاً';
  END IF;
  
  -- الحصول على أول مزرعة
  SELECT id INTO v_farm_id FROM b2f_farms ORDER BY created_at LIMIT 1;
  
  IF v_farm_id IS NULL THEN
    RETURN '❌ لا توجد مزارع في النظام';
  END IF;
  
  -- تحديث السجل الموجود أو إنشاء جديد
  INSERT INTO farm_team_members (
    farm_id,
    user_id,
    role,
    full_name,
    is_active
  )
  VALUES (
    v_farm_id,
    v_user_id,
    'farm_supervisor',
    'المشرف التشغيلي',
    true
  )
  ON CONFLICT (farm_id, user_id, role) 
  DO UPDATE SET
    is_active = true,
    updated_at = now();
  
  -- أيضاً تحديث أي سجل له نفس الدور ولكن user_id = NULL
  UPDATE farm_team_members
  SET user_id = v_user_id, updated_at = now()
  WHERE farm_id = v_farm_id
    AND role = 'farm_supervisor'
    AND user_id IS NULL
    AND id NOT IN (
      SELECT id FROM farm_team_members 
      WHERE farm_id = v_farm_id AND user_id = v_user_id AND role = 'farm_supervisor'
    );
  
  RETURN '✅ تم ربطك كمشرف تشغيلي بنجاح!';
END;
$$;

-- دالة ربط المستخدم الحالي كمدير مزرعة
CREATE OR REPLACE FUNCTION bind_current_user_to_manager()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_farm_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN '❌ يجب تسجيل الدخول أولاً';
  END IF;
  
  SELECT id INTO v_farm_id FROM b2f_farms ORDER BY created_at LIMIT 1;
  
  IF v_farm_id IS NULL THEN
    RETURN '❌ لا توجد مزارع في النظام';
  END IF;
  
  INSERT INTO farm_team_members (
    farm_id,
    user_id,
    role,
    full_name,
    is_active
  )
  VALUES (
    v_farm_id,
    v_user_id,
    'farm_manager',
    'مدير المزرعة',
    true
  )
  ON CONFLICT (farm_id, user_id, role) 
  DO UPDATE SET
    is_active = true,
    updated_at = now();
  
  UPDATE farm_team_members
  SET user_id = v_user_id, updated_at = now()
  WHERE farm_id = v_farm_id
    AND role = 'farm_manager'
    AND user_id IS NULL
    AND id NOT IN (
      SELECT id FROM farm_team_members 
      WHERE farm_id = v_farm_id AND user_id = v_user_id AND role = 'farm_manager'
    );
  
  RETURN '✅ تم ربطك كمدير مزرعة بنجاح!';
END;
$$;

-- دالة عرض الدور الحالي
CREATE OR REPLACE FUNCTION show_my_role()
RETURNS TABLE (
  farm_name TEXT,
  my_role TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bf.name as farm_name,
    CASE 
      WHEN ftm.role = 'farm_supervisor' THEN 'مشرف تشغيلي'
      WHEN ftm.role = 'farm_manager' THEN 'مدير مزرعة'
      ELSE ftm.role
    END as my_role,
    CASE 
      WHEN ftm.is_active THEN '✅ نشط'
      ELSE '❌ غير نشط'
    END as status
  FROM farm_team_members ftm
  JOIN b2f_farms bf ON ftm.farm_id = bf.id
  WHERE ftm.user_id = auth.uid();
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION bind_current_user_to_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION bind_current_user_to_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION show_my_role() TO authenticated;
