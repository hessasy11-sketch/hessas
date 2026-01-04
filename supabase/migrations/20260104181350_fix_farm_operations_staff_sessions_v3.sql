/*
  # إصلاح صلاحيات التشغيل لدعم جلسات الموظفين

  1. دوال جديدة
    - `is_platform_staff` - التحقق من صلاحيات الموظف
  
  2. تحديث الدوال
    - حذف وإعادة إنشاء دوال التشغيل لدعم staff_id
  
  3. الأمان
    - دعم كل من Auth users و Staff sessions
*/

-- =====================================================
-- 1. دالة التحقق من صلاحيات الموظف
-- =====================================================
CREATE OR REPLACE FUNCTION is_platform_staff(p_staff_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إذا تم تمرير staff_id، تحقق منه
  IF p_staff_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = p_staff_id
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager', 'b2f_manager')
    );
  END IF;
  
  -- إذا لم يتم تمرير staff_id، تحقق من auth.uid()
  IF auth.uid() IS NOT NULL THEN
    RETURN is_b2f_admin(auth.uid());
  END IF;
  
  RETURN false;
END;
$$;

-- =====================================================
-- 2. حذف الدوال القديمة بالتوقيعات الصحيحة
-- =====================================================
DROP FUNCTION IF EXISTS create_farm_operation(uuid, text);
DROP FUNCTION IF EXISTS update_farm_operation_phase(uuid, text, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS add_farm_operation_update(uuid, text, text, text, jsonb, boolean);

-- =====================================================
-- 3. إنشاء create_farm_operation مع دعم staff_id
-- =====================================================
CREATE OR REPLACE FUNCTION create_farm_operation(
  p_farm_id uuid,
  p_initial_phase text DEFAULT 'preparation',
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation_id uuid;
  v_farm_name text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT is_platform_staff(p_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء. يرجى تسجيل الدخول أولاً.');
  END IF;

  -- التحقق من وجود المزرعة
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المزرعة غير موجودة');
  END IF;

  -- التحقق من عدم وجود تشغيل نشط
  IF EXISTS (SELECT 1 FROM b2f_farm_operations WHERE farm_id = p_farm_id AND is_active = true) THEN
    RETURN json_build_object('success', false, 'error', 'يوجد تشغيل نشط بالفعل لهذه المزرعة');
  END IF;

  -- إنشاء التشغيل
  INSERT INTO b2f_farm_operations (
    farm_id,
    current_phase,
    progress_percentage,
    preparation_date,
    last_update_title,
    last_update_description
  ) VALUES (
    p_farm_id,
    p_initial_phase,
    5,
    CASE WHEN p_initial_phase = 'preparation' THEN now() ELSE NULL END,
    'تم إنشاء التشغيل',
    'تم البدء بالعمليات التشغيلية للمزرعة'
  ) RETURNING id INTO v_operation_id;

  -- إضافة تحديث أولي
  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    related_phase,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    'phase_change',
    'بدء العمليات التشغيلية',
    'تم إنشاء سجل التشغيل للمزرعة. سيتم تحديثكم بكل جديد.',
    p_initial_phase,
    true
  );

  RETURN json_build_object(
    'success', true,
    'operationId', v_operation_id,
    'farmName', v_farm_name,
    'message', 'تم إنشاء التشغيل بنجاح'
  );
END;
$$;

-- =====================================================
-- 4. إنشاء update_farm_operation_phase مع دعم staff_id
-- =====================================================
CREATE OR REPLACE FUNCTION update_farm_operation_phase(
  p_operation_id uuid,
  p_new_phase text,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_old_phase text;
  v_progress int;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_platform_staff(p_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- جلب البيانات الحالية
  SELECT farm_id, current_phase INTO v_farm_id, v_old_phase
  FROM b2f_farm_operations
  WHERE id = p_operation_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التشغيل غير موجود');
  END IF;

  -- حساب نسبة الإنجاز حسب المرحلة
  v_progress := CASE p_new_phase
    WHEN 'preparation' THEN 10
    WHEN 'planting' THEN 25
    WHEN 'irrigation' THEN 40
    WHEN 'maintenance' THEN 60
    WHEN 'harvesting' THEN 85
    WHEN 'completed' THEN 100
    ELSE 0
  END;

  -- تحديث المرحلة
  UPDATE b2f_farm_operations
  SET 
    current_phase = p_new_phase,
    progress_percentage = v_progress,
    last_update_title = 'تحديث المرحلة',
    last_update_description = 'تم الانتقال إلى مرحلة ' || p_new_phase,
    updated_at = now()
  WHERE id = p_operation_id;

  -- إضافة تحديث
  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    related_phase,
    visible_to_investors
  ) VALUES (
    p_operation_id,
    v_farm_id,
    'phase_change',
    'تحديث المرحلة التشغيلية',
    'تم الانتقال من ' || v_old_phase || ' إلى ' || p_new_phase,
    p_new_phase,
    true
  );

  RETURN json_build_object('success', true, 'message', 'تم تحديث المرحلة بنجاح');
END;
$$;

-- =====================================================
-- 5. إنشاء add_farm_operation_update مع دعم staff_id
-- =====================================================
CREATE OR REPLACE FUNCTION add_farm_operation_update(
  p_operation_id uuid,
  p_update_type text,
  p_title text,
  p_description text,
  p_images jsonb DEFAULT '[]'::jsonb,
  p_visible_to_investors boolean DEFAULT true,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_current_phase text;
  v_update_id uuid;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_platform_staff(p_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- جلب بيانات التشغيل
  SELECT farm_id, current_phase INTO v_farm_id, v_current_phase
  FROM b2f_farm_operations
  WHERE id = p_operation_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التشغيل غير موجود');
  END IF;

  -- إضافة التحديث
  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    images,
    related_phase,
    visible_to_investors
  ) VALUES (
    p_operation_id,
    v_farm_id,
    p_update_type,
    p_title,
    p_description,
    p_images,
    v_current_phase,
    p_visible_to_investors
  ) RETURNING id INTO v_update_id;

  -- تحديث آخر تحديث في التشغيل
  UPDATE b2f_farm_operations
  SET 
    last_update_title = p_title,
    last_update_description = p_description,
    updated_at = now()
  WHERE id = p_operation_id;

  RETURN json_build_object(
    'success', true,
    'updateId', v_update_id,
    'message', 'تم إضافة التحديث بنجاح'
  );
END;
$$;

-- =====================================================
-- 6. منح الصلاحيات
-- =====================================================
GRANT EXECUTE ON FUNCTION is_platform_staff TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_farm_operation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_farm_operation_phase TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_farm_operation_update TO anon, authenticated;