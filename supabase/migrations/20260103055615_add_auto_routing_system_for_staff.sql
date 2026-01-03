/*
  # نظام التوجيه الذكي التلقائي للموظفين

  1. New Function
    - `get_staff_default_route()` - تحديد المسار المناسب لكل موظف

  2. Changes to verify_qr_access
    - إضافة `default_route` في النتيجة
    - التوجيه التلقائي بناءً على role/department

  3. Routing Rules
    - super_admin → /hq
    - b2f_admin / b2f_manager → /admin/b2f
    - b2b_admin / b2b_manager → /admin/b2b
    - farm_manager → /admin/operations
    - farm_supervisor → /admin/my-tasks
    - support → /admin/investor-services
    - finance → /admin/finance2
    - default → /admin (للأدوار الأخرى)

  4. Security
    - كل موظف له مسار واحد فقط
    - لا توجد شاشة اختيار
    - توجيه مباشر بعد التحقق الناجح
*/

-- دالة لتحديد المسار الافتراضي للموظف
CREATE OR REPLACE FUNCTION get_staff_default_route(
  p_role text,
  p_department text,
  p_permissions jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_route text;
BEGIN
  -- Super Admin
  IF p_role = 'super_admin' THEN
    RETURN '/hq';
  END IF;

  -- B2F Department
  IF p_department = 'b2f' THEN
    IF p_role IN ('b2f_admin', 'admin') THEN
      RETURN '/admin/b2f';
    ELSIF p_role = 'b2f_manager' THEN
      RETURN '/admin/b2f';
    ELSIF p_role = 'farm_manager' THEN
      RETURN '/admin/operations';
    ELSIF p_role = 'farm_supervisor' THEN
      RETURN '/admin/my-tasks';
    END IF;
  END IF;

  -- B2B Department
  IF p_department = 'b2b' THEN
    IF p_role IN ('b2b_admin', 'admin') THEN
      RETURN '/admin/b2b';
    ELSIF p_role = 'b2b_manager' THEN
      RETURN '/admin/b2b';
    END IF;
  END IF;

  -- Finance Department
  IF p_department = 'finance' THEN
    RETURN '/admin/finance2';
  END IF;

  -- Support Department
  IF p_department = 'support' OR p_department = 'investor_services' THEN
    RETURN '/admin/investor-services';
  END IF;

  -- Operations Department
  IF p_department = 'operations' THEN
    IF p_role = 'farm_manager' THEN
      RETURN '/admin/operations';
    ELSIF p_role = 'supervisor' OR p_role = 'farm_supervisor' THEN
      RETURN '/admin/my-tasks';
    END IF;
  END IF;

  -- Default fallback
  RETURN '/admin';
END;
$$;

-- تحديث دالة verify_qr_access لإضافة default_route
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff platform_staff;
  v_profile profiles;
  v_role roles_catalog;
  v_default_route text;
BEGIN
  SELECT ps.* INTO v_staff 
  FROM platform_staff ps
  WHERE ps.qr_token = p_qr_token;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'invalid_token'
    );
  END IF;

  IF v_staff.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'staff_inactive'
    );
  END IF;

  IF v_staff.qr_is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'qr_inactive'
    );
  END IF;

  IF v_staff.role IS NULL OR v_staff.role = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'no_role'
    );
  END IF;

  IF v_staff.department IS NULL OR v_staff.department = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'no_department'
    );
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_staff.user_id;

  IF v_staff.role_id IS NOT NULL THEN
    SELECT * INTO v_role FROM roles_catalog WHERE id = v_staff.role_id;
  END IF;

  v_default_route := get_staff_default_route(
    v_staff.role,
    v_staff.department,
    COALESCE(v_role.permissions, '{}'::jsonb)
  );

  UPDATE platform_staff 
  SET qr_last_scanned_at = now()
  WHERE id = v_staff.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'مرحباً بك',
    'requires_pin', COALESCE(v_staff.requires_pin, false),
    'default_route', v_default_route,
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'full_name', COALESCE(v_profile.display_name, 'موظف'),
      'phone', v_profile.phone_number,
      'role', v_staff.role,
      'role_title', COALESCE(v_role.role_name, v_staff.job_title),
      'department', v_staff.department,
      'permissions', COALESCE(v_role.permissions, '{}'::jsonb),
      'scope_farms', v_staff.scope_farms
    )
  );
END;
$$;

-- منح صلاحيات
GRANT EXECUTE ON FUNCTION get_staff_default_route(text, text, jsonb) TO anon, authenticated, service_role;
