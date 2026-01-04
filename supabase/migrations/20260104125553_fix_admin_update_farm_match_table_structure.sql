/*
  # تحديث دالة admin_update_farm لتتوافق مع بنية جدول b2f_farms

  ## التغييرات
  - استخدام total_trees_available بدلاً من size_in_acres
  - إزالة facilities و certifications
  - إضافة حقول tree_type و area_size و area_unit
*/

DROP FUNCTION IF EXISTS admin_update_farm(uuid, uuid, text, text, text, numeric, text, jsonb, jsonb, boolean);

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
  v_staff_role text;
  v_staff_name text;
  v_farm_name text;
BEGIN
  -- التحقق من الموظف
  SELECT role, full_name INTO v_staff_role, v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id
    AND is_active = true
    AND role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'ليس لديك صلاحية لتحديث المزارع'
    );
  END IF;

  -- التحقق من وجود المزرعة
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'المزرعة غير موجودة'
    );
  END IF;

  -- تحديث الحقول المطلوبة فقط
  UPDATE b2f_farms SET
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

  -- تسجيل العملية
  INSERT INTO platform_audit_logs (
    staff_id,
    action_type,
    action_description,
    affected_table,
    affected_record_id,
    metadata
  ) VALUES (
    p_staff_id,
    'farm_updated',
    format('تم تحديث المزرعة: %s بواسطة %s', v_farm_name, v_staff_name),
    'b2f_farms',
    p_farm_id,
    jsonb_build_object('farm_name', v_farm_name)
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

COMMENT ON FUNCTION admin_update_farm IS 'تحديث بيانات مزرعة بواسطة موظف - محدثة لتتوافق مع بنية الجدول';