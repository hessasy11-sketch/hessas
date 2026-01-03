/*
  # ربط المستخدمين بالأدوار وتطبيق الصلاحيات
  
  1. التغييرات:
    - إضافة دالة للحصول على صلاحيات دور محدد
    - إضافة دالة للتحقق من صلاحية محددة
    - إضافة دالة للتحقق من إمكانية الوصول لصفحة
    - تسجيل محاولات الوصول
  
  2. الوظائف:
    - get_role_permissions(p_role_key) - جلب جميع صلاحيات الدور
    - check_permission(p_role_key, p_permission_key, p_action) - التحقق من صلاحية
    - can_access_page(p_role_key, p_page_key) - التحقق من الوصول للصفحة
  
  3. الأمان:
    - جميع الدوال متاحة للمستخدمين المصادق عليهم
    - التحقق يتم من قاعدة البيانات مباشرة
*/

-- دالة للحصول على جميع صلاحيات دور محدد
CREATE OR REPLACE FUNCTION get_role_permissions(p_role_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'role_key', rd.role_key,
    'role_name_ar', rd.role_name_ar,
    'role_name_en', rd.role_name_en,
    'hierarchy_level', rd.hierarchy_level,
    'is_active', rd.is_active,
    'access_settings', (
      SELECT jsonb_build_object(
        'requires_qr', ras.requires_qr,
        'requires_pin', ras.requires_pin,
        'allow_image_upload', ras.allow_image_upload,
        'allow_camera_scan', ras.allow_camera_scan,
        'bind_first_device', ras.bind_first_device,
        'session_duration_minutes', ras.session_duration_minutes,
        'idle_timeout_minutes', ras.idle_timeout_minutes,
        'allow_multi_device', ras.allow_multi_device,
        'qr_type', ras.qr_type
      )
      FROM role_access_settings ras
      WHERE ras.role_key = p_role_key
    ),
    'operational_permissions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'permission_key', rop.permission_key,
          'permission_name_ar', rop.permission_name_ar,
          'permission_category', rop.permission_category,
          'can_create', rop.can_create,
          'can_view', rop.can_view,
          'can_edit', rop.can_edit,
          'can_delete', rop.can_delete,
          'can_approve', rop.can_approve,
          'can_reject', rop.can_reject,
          'can_assign', rop.can_assign,
          'can_upload_proof', rop.can_upload_proof,
          'can_review_reports', rop.can_review_reports,
          'can_send_to_management', rop.can_send_to_management
        )
      )
      FROM role_operational_permissions rop
      WHERE rop.role_key = p_role_key
    ),
    'scope_permissions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'scope_type', rsp.scope_type,
          'scope_value', rsp.scope_value,
          'applies_to_all', rsp.applies_to_all
        )
      )
      FROM role_scope_permissions rsp
      WHERE rsp.role_key = p_role_key
    )
  )
  INTO result
  FROM role_definitions rd
  WHERE rd.role_key = p_role_key
  AND rd.is_active = true;
  
  RETURN result;
END;
$$;

-- دالة للتحقق من صلاحية محددة
CREATE OR REPLACE FUNCTION check_permission(
  p_role_key text,
  p_permission_key text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission boolean;
BEGIN
  IF p_role_key = 'platform_owner' THEN
    RETURN true;
  END IF;
  
  SELECT CASE p_action
    WHEN 'create' THEN can_create
    WHEN 'view' THEN can_view
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    WHEN 'approve' THEN can_approve
    WHEN 'reject' THEN can_reject
    WHEN 'assign' THEN can_assign
    WHEN 'upload_proof' THEN can_upload_proof
    WHEN 'review_reports' THEN can_review_reports
    WHEN 'send_to_management' THEN can_send_to_management
    ELSE false
  END
  INTO has_permission
  FROM role_operational_permissions
  WHERE role_key = p_role_key
  AND permission_key = p_permission_key;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- دالة للتحقق من إمكانية الوصول لصفحة
CREATE OR REPLACE FUNCTION can_access_page(
  p_role_key text,
  p_page_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed_roles text[];
BEGIN
  IF p_role_key = 'platform_owner' THEN
    RETURN true;
  END IF;
  
  allowed_roles := CASE p_page_key
    WHEN 'hq' THEN ARRAY['platform_owner', 'super_admin', 'general_manager']
    WHEN 'farms' THEN ARRAY['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager']
    WHEN 'operations' THEN ARRAY['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager', 'farm_supervisor', 'operations_supervisor']
    WHEN 'tasks' THEN ARRAY['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager', 'farm_supervisor', 'operations_supervisor', 'task_executor']
    WHEN 'reports' THEN ARRAY['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager', 'farm_supervisor']
    WHEN 'permissions' THEN ARRAY['platform_owner', 'super_admin']
    WHEN 'staff' THEN ARRAY['platform_owner', 'super_admin', 'general_manager']
    WHEN 'auctions' THEN ARRAY['platform_owner', 'super_admin', 'general_manager', 'section_manager']
    ELSE ARRAY[]::text[]
  END;
  
  RETURN p_role_key = ANY(allowed_roles);
END;
$$;

-- منح الصلاحيات للدوال
GRANT EXECUTE ON FUNCTION get_role_permissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_permission(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_page(text, text) TO authenticated;

-- إنشاء view لعرض جميع الصلاحيات بشكل منظم
CREATE OR REPLACE VIEW role_permissions_summary AS
SELECT 
  rd.role_key,
  rd.role_name_ar,
  rd.role_name_en,
  rd.hierarchy_level,
  rd.is_active,
  json_build_object(
    'requires_qr', ras.requires_qr,
    'requires_pin', ras.requires_pin,
    'session_duration', ras.session_duration_minutes,
    'qr_type', ras.qr_type
  ) as access_summary,
  COUNT(DISTINCT rop.id) as total_permissions,
  COUNT(DISTINCT CASE WHEN rop.can_create THEN rop.id END) as can_create_count,
  COUNT(DISTINCT CASE WHEN rop.can_delete THEN rop.id END) as can_delete_count,
  COUNT(DISTINCT CASE WHEN rop.can_approve THEN rop.id END) as can_approve_count
FROM role_definitions rd
LEFT JOIN role_access_settings ras ON rd.role_key = ras.role_key
LEFT JOIN role_operational_permissions rop ON rd.role_key = rop.role_key
GROUP BY rd.role_key, rd.role_name_ar, rd.role_name_en, rd.hierarchy_level, rd.is_active,
         ras.requires_qr, ras.requires_pin, ras.session_duration_minutes, ras.qr_type
ORDER BY rd.hierarchy_level;

GRANT SELECT ON role_permissions_summary TO authenticated;

-- إنشاء view لعرض صلاحيات موظف محدد
CREATE OR REPLACE VIEW staff_permissions_view AS
SELECT 
  ps.id,
  ps.user_id,
  ps.job_title,
  ps.role as platform_role,
  ps.is_active,
  rd.role_name_ar,
  rd.hierarchy_level,
  ras.requires_qr,
  ras.requires_pin,
  ras.session_duration_minutes,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'permission_key', rop.permission_key,
        'permission_name_ar', rop.permission_name_ar,
        'can_create', rop.can_create,
        'can_view', rop.can_view,
        'can_edit', rop.can_edit,
        'can_delete', rop.can_delete,
        'can_approve', rop.can_approve
      )
    )
    FROM role_operational_permissions rop
    WHERE rop.role_key = ps.role
  ) as permissions
FROM platform_staff ps
LEFT JOIN role_definitions rd ON ps.role = rd.role_key
LEFT JOIN role_access_settings ras ON ps.role = ras.role_key
WHERE ps.is_active = true
AND rd.is_active = true;

GRANT SELECT ON staff_permissions_view TO authenticated;

-- جدول لتسجيل محاولات الوصول
CREATE TABLE IF NOT EXISTS access_attempts_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  role_key text,
  page_key text,
  permission_key text,
  action text,
  was_allowed boolean,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE access_attempts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners can view all access logs"
  ON access_attempts_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role = 'platform_owner'
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "System can insert access logs"
  ON access_attempts_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- دالة لتسجيل محاولة وصول
CREATE OR REPLACE FUNCTION log_access_attempt(
  p_page_key text DEFAULT NULL,
  p_permission_key text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_was_allowed boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role_key text;
BEGIN
  SELECT user_id, role
  INTO v_user_id, v_role_key
  FROM platform_staff
  WHERE user_id = auth.uid()
  AND is_active = true;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO access_attempts_log (
      user_id,
      role_key,
      page_key,
      permission_key,
      action,
      was_allowed
    ) VALUES (
      v_user_id,
      v_role_key,
      p_page_key,
      p_permission_key,
      p_action,
      p_was_allowed
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION log_access_attempt(text, text, text, boolean) TO authenticated;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_role_operational_permissions_lookup 
  ON role_operational_permissions(role_key, permission_key);

CREATE INDEX IF NOT EXISTS idx_role_access_settings_role_key 
  ON role_access_settings(role_key);

CREATE INDEX IF NOT EXISTS idx_platform_staff_role 
  ON platform_staff(role) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_access_attempts_log_user_id 
  ON access_attempts_log(user_id, created_at DESC);
