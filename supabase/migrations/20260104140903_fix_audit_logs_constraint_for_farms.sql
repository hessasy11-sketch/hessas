/*
  # إصلاح constraint على action_type وتحديث دوال المزارع
  
  1. توسيع constraint ليشمل:
    - عمليات المزارع: create_farm, update_farm, delete_farm
    - عمليات عامة: create, update, delete, activate, deactivate
    
  2. تحديث دوال admin_add_farm و admin_update_farm:
    - استخدام 'create_farm' بدلاً من 'create'
    - استخدام 'update_farm' بدلاً من 'update'
    - إضافة try/catch لمنع فشل audit log من كسر العملية
    
  3. ملاحظة:
    - الحفاظ على جميع القيم القديمة
    - جعل فشل audit log لا يؤثر على نجاح العملية الأساسية
*/

-- 1. حذف constraint القديم وإنشاء واحد جديد بقيم أكثر
ALTER TABLE platform_audit_logs 
DROP CONSTRAINT IF EXISTS platform_audit_logs_action_type_check;

ALTER TABLE platform_audit_logs
ADD CONSTRAINT platform_audit_logs_action_type_check
CHECK (action_type = ANY (ARRAY[
  -- Role management
  'create_role'::text, 
  'update_role'::text, 
  'delete_role'::text,
  
  -- Staff management
  'create_staff'::text, 
  'update_staff'::text, 
  'deactivate_staff'::text, 
  'activate_staff'::text,
  'change_manager'::text, 
  'change_scope'::text, 
  'change_permissions'::text,
  
  -- Team management
  'create_team'::text, 
  'update_team'::text,
  
  -- QR management
  'generate_qr'::text, 
  'auto_activate_qr'::text, 
  'auto_deactivate_qr'::text, 
  'auto_clear_qr'::text, 
  'cascade_delete_qr'::text, 
  'cleanup_qr'::text, 
  'sync_qr'::text,
  
  -- Bulk operations
  'cleanup_orphaned_staff'::text, 
  'bulk_delete_staff'::text,
  
  -- Session management
  'login'::text, 
  'logout'::text, 
  'session_expired'::text, 
  'session_renewed'::text,
  
  -- Farm management (جديد)
  'create_farm'::text,
  'update_farm'::text,
  'delete_farm'::text,
  'activate_farm'::text,
  'deactivate_farm'::text,
  
  -- Generic operations (احتياطي)
  'create'::text,
  'update'::text,
  'delete'::text,
  'activate'::text,
  'deactivate'::text
]));

-- 2. تحديث دالة admin_add_farm بـ action_type الصحيح + حماية من فشل audit
DROP FUNCTION IF EXISTS admin_add_farm(uuid, text, text, text, integer, text, text, numeric, text);

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

  -- إضافة المزرعة (العملية الأساسية)
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

  -- تسجيل في audit log (لا يؤثر فشله على نجاح الإضافة)
  BEGIN
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      target_id,
      performed_by,
      changes,
      metadata
    ) VALUES (
      'create_farm',  -- ← مصحح من 'create'
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
  EXCEPTION WHEN OTHERS THEN
    -- تجاهل أخطاء audit log ولا تفشل العملية
    RAISE WARNING 'فشل تسجيل audit log: %', SQLERRM;
  END;

  -- نجحت العملية الأساسية
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

-- 3. تحديث دالة admin_update_farm بـ action_type الصحيح + حماية من فشل audit
DROP FUNCTION IF EXISTS admin_update_farm(uuid, uuid, text, text, text, integer, text, text, numeric, text, boolean);

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

  -- تحديث المزرعة (العملية الأساسية)
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

  -- تسجيل في audit log (لا يؤثر فشله على نجاح التحديث)
  BEGIN
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      target_id,
      performed_by,
      changes,
      metadata
    ) VALUES (
      'update_farm',  -- ← مصحح من 'update'
      'b2f_farms',
      p_farm_id,
      p_staff_id,
      v_changes,
      jsonb_build_object(
        'action_description', format('تم تحديث مزرعة: %s بواسطة %s', COALESCE(p_name, v_old_data->>'name'), v_staff_name),
        'staff_name', v_staff_name
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- تجاهل أخطاء audit log ولا تفشل العملية
    RAISE WARNING 'فشل تسجيل audit log: %', SQLERRM;
  END;

  -- نجحت العملية الأساسية
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

COMMENT ON FUNCTION admin_add_farm IS 'دالة آمنة لإضافة مزرعة - لا يؤثر فشل audit log على نجاح العملية';
COMMENT ON FUNCTION admin_update_farm IS 'دالة آمنة لتحديث مزرعة - لا يؤثر فشل audit log على نجاح العملية';