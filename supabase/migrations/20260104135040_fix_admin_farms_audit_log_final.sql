/*
  # إصلاح دوال إدارة المزارع - audit log

  ## المشكلة
  - الدوال تستخدم أعمدة خاطئة في platform_audit_logs
  - استخدام staff_id بدلاً من performed_by
  - استخدام action_description بدلاً من metadata

  ## الحل
  - حذف الدوال القديمة بالمعاملات الصحيحة
  - إعادة إنشاء الدوال بأعمدة audit log الصحيحة
*/

-- حذف الدوال القديمة بالمعاملات المحددة
DROP FUNCTION IF EXISTS admin_add_farm(uuid, text, text, text, integer, text, text, numeric, text);
DROP FUNCTION IF EXISTS admin_update_farm(uuid, uuid, text, text, text, integer, text, text, numeric, text, boolean);

-- إعادة إنشاء دالة admin_add_farm
CREATE OR REPLACE FUNCTION admin_add_farm(
  p_staff_id uuid,
  p_name text,
  p_location text,
  p_city text,
  p_total_trees_available integer,
  p_description text DEFAULT NULL,
  p_tree_type text DEFAULT NULL,
  p_area_size numeric DEFAULT NULL,
  p_area_unit text DEFAULT 'acre'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_farm_id uuid;
  v_staff_name text;
BEGIN
  -- التحقق من صلاحية الموظف
  SELECT full_name INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id AND is_active = true;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'موظف غير صالح أو غير نشط'
    );
  END IF;

  -- إضافة المزرعة
  INSERT INTO b2f_farms (
    name,
    location,
    city,
    total_trees_available,
    description,
    tree_type,
    area_size,
    area_unit,
    is_active
  ) VALUES (
    p_name,
    p_location,
    p_city,
    p_total_trees_available,
    p_description,
    p_tree_type,
    p_area_size,
    p_area_unit,
    true
  )
  RETURNING id INTO v_new_farm_id;

  -- تسجيل العملية في audit log باستخدام الأعمدة الصحيحة
  INSERT INTO platform_audit_logs (
    action_type,
    target_type,
    target_id,
    performed_by,
    changes,
    metadata
  ) VALUES (
    'create',
    'b2f_farms',
    v_new_farm_id,
    p_staff_id,
    jsonb_build_object(
      'farm_name', p_name,
      'location', p_location,
      'city', p_city,
      'total_trees', p_total_trees_available,
      'tree_type', p_tree_type,
      'area_size', p_area_size
    ),
    jsonb_build_object(
      'action_description', format('تم إضافة مزرعة جديدة: %s بواسطة %s', p_name, v_staff_name),
      'staff_name', v_staff_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تمت إضافة المزرعة بنجاح',
    'farm_id', v_new_farm_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'حدث خطأ أثناء إضافة المزرعة: ' || SQLERRM
  );
END;
$$;

-- إعادة إنشاء دالة admin_update_farm
CREATE OR REPLACE FUNCTION admin_update_farm(
  p_staff_id uuid,
  p_farm_id uuid,
  p_name text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_total_trees_available integer DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_tree_type text DEFAULT NULL,
  p_area_size numeric DEFAULT NULL,
  p_area_unit text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_old_data jsonb;
  v_changes jsonb := '{}'::jsonb;
BEGIN
  -- التحقق من صلاحية الموظف
  SELECT full_name INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id AND is_active = true;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'موظف غير صالح أو غير نشط'
    );
  END IF;

  -- الحصول على البيانات القديمة
  SELECT jsonb_build_object(
    'name', name,
    'location', location,
    'city', city,
    'total_trees_available', total_trees_available,
    'description', description,
    'tree_type', tree_type,
    'area_size', area_size,
    'area_unit', area_unit,
    'is_active', is_active
  ) INTO v_old_data
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_old_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'المزرعة غير موجودة'
    );
  END IF;

  -- تحديث المزرعة
  UPDATE b2f_farms
  SET
    name = COALESCE(p_name, name),
    location = COALESCE(p_location, location),
    city = COALESCE(p_city, city),
    total_trees_available = COALESCE(p_total_trees_available, total_trees_available),
    description = COALESCE(p_description, description),
    tree_type = COALESCE(p_tree_type, tree_type),
    area_size = COALESCE(p_area_size, area_size),
    area_unit = COALESCE(p_area_unit, area_unit),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_farm_id;

  -- بناء التغييرات
  IF p_name IS NOT NULL THEN 
    v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', v_old_data->>'name', 'new', p_name)); 
  END IF;
  IF p_location IS NOT NULL THEN 
    v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', v_old_data->>'location', 'new', p_location)); 
  END IF;
  IF p_city IS NOT NULL THEN 
    v_changes := v_changes || jsonb_build_object('city', jsonb_build_object('old', v_old_data->>'city', 'new', p_city)); 
  END IF;
  IF p_is_active IS NOT NULL THEN 
    v_changes := v_changes || jsonb_build_object('is_active', jsonb_build_object('old', v_old_data->>'is_active', 'new', p_is_active)); 
  END IF;

  -- تسجيل العملية في audit log باستخدام الأعمدة الصحيحة
  INSERT INTO platform_audit_logs (
    action_type,
    target_type,
    target_id,
    performed_by,
    changes,
    metadata
  ) VALUES (
    'update',
    'b2f_farms',
    p_farm_id,
    p_staff_id,
    v_changes,
    jsonb_build_object(
      'action_description', format('تم تحديث مزرعة: %s بواسطة %s', COALESCE(p_name, v_old_data->>'name'), v_staff_name),
      'staff_name', v_staff_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث المزرعة بنجاح'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'حدث خطأ أثناء تحديث المزرعة: ' || SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION admin_add_farm IS 'دالة آمنة لإضافة مزرعة جديدة مع تسجيل العملية في audit log';
COMMENT ON FUNCTION admin_update_farm IS 'دالة آمنة لتحديث بيانات مزرعة مع تسجيل التغييرات في audit log';