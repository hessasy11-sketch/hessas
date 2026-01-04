/*
  # تحديث دالة admin_add_farm لتتوافق مع بنية جدول b2f_farms

  ## التغييرات
  - استخدام total_trees_available بدلاً من total_trees و available_trees
  - استخدام area_size و area_unit بدلاً من size_in_acres
  - إضافة حقول tree_type و marketing_description
*/

DROP FUNCTION IF EXISTS admin_add_farm(uuid, text, text, text, numeric, integer, text, jsonb, jsonb);

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
  v_staff_role text;
  v_staff_name text;
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
      'message', 'ليس لديك صلاحية لإضافة مزارع'
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
    is_active,
    status
  ) VALUES (
    p_name,
    p_location,
    p_city,
    p_total_trees_available,
    p_description,
    p_tree_type,
    p_area_size,
    p_area_unit,
    true,
    'active'
  )
  RETURNING id INTO v_new_farm_id;

  -- تسجيل العملية في audit log
  INSERT INTO platform_audit_logs (
    staff_id,
    action_type,
    action_description,
    affected_table,
    affected_record_id,
    metadata
  ) VALUES (
    p_staff_id,
    'farm_created',
    format('تم إضافة مزرعة جديدة: %s بواسطة %s', p_name, v_staff_name),
    'b2f_farms',
    v_new_farm_id,
    jsonb_build_object(
      'farm_name', p_name,
      'location', p_location,
      'city', p_city,
      'total_trees', p_total_trees_available
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

COMMENT ON FUNCTION admin_add_farm IS 'إضافة مزرعة جديدة بواسطة موظف - محدثة لتتوافق مع بنية الجدول';
